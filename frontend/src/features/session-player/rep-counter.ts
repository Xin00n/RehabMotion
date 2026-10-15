import { normalizeExerciseType } from "./angle-engine"

export type RepCounterState =
  | "STATE_START"
  | "MOVING"
  | "PEAK_CHECK"
  | "HOLD"
  | "RETURN"

export interface RepCounterConfig {
  baselineAngle: number // Sudut posisi istirahat / awal
  targetRom: number // Target sudut ROM yang harus dicapai
  isDecreasingTarget?: boolean // true jika target < baseline (misal siku dari 160 ke 90)
  startThresholdDeg?: number // Ambang sudut untuk mendeteksi mulai bergerak dari baseline
  targetToleranceDeg?: number // Toleransi pencapaian target ROM (misal +/- 10-12 derajat)
  returnToleranceDeg?: number // Toleransi kembali ke baseline (harus lebih ketat dari startThreshold agar ada celah histeresis)
  holdDurationMs?: number // Durasi tahan posisi (default: 2000ms)
  holdDropGraceMs?: number // Grace period sebelum membatalkan hold jika terjadi flicker sesaat (default: 400ms)
}

export interface RepCounterContext {
  state: RepCounterState
  currentAngle: number
  repsCompleted: number
  holdStartTime: number | null
  holdLastInZoneTime: number | null
  holdProgress: number // 0.0 sampai 1.0
  isCompensated: boolean
  feedbackMessage: string
}

export function createInitialRepCounterContext(initialAngle = 0): RepCounterContext {
  return {
    state: "STATE_START",
    currentAngle: initialAngle,
    repsCompleted: 0,
    holdStartTime: null,
    holdLastInZoneTime: null,
    holdProgress: 0,
    isCompensated: false,
    feedbackMessage: "Siap di posisi awal",
  }
}

/**
 * Konfigurasi biomekanik akurat per jenis latihan fisioterapi
 */
export function getExerciseMotionConfig(
  exerciseNameOrType: string,
  targetRom?: number
): RepCounterConfig {
  const normType = normalizeExerciseType(exerciseNameOrType)

  switch (normType) {
    case "elbow_flexion":
      // Fleksi siku: posisi awal lengan lurus (~160°), ditekuk ke atas mendekati ~90° (mengecil)
      return {
        baselineAngle: 160,
        targetRom: targetRom && targetRom > 0 ? targetRom : 90,
        isDecreasingTarget: true,
        startThresholdDeg: 15, // Gerak jika <= 145°
        targetToleranceDeg: 12, // Sampai jika <= target + 12°
        returnToleranceDeg: 10, // Selesai jika >= 150° (histeresis bersih 5° dari 145°)
        holdDurationMs: 2000,
        holdDropGraceMs: 400,
      }

    case "shoulder_abduction":
      // Abduksi bahu: posisi awal tangan di samping paha (~25°), diangkat ke samping (~90°) (membesar)
      return {
        baselineAngle: 25,
        targetRom: targetRom && targetRom > 0 ? targetRom : 90,
        isDecreasingTarget: false,
        startThresholdDeg: 15, // Gerak jika >= 40°
        targetToleranceDeg: 12, // Sampai jika >= target - 12°
        returnToleranceDeg: 10, // Selesai jika <= 35° (histeresis bersih 5° dari 40°)
        holdDurationMs: 2000,
        holdDropGraceMs: 400,
      }

    case "seated_knee_extension":
      // Ekstensi lutut duduk: posisi duduk lutut ditekuk 90°, diluruskan ke depan (~150° - 165°) (membesar)
      return {
        baselineAngle: 90,
        targetRom: targetRom && targetRom > 0 ? targetRom : 150,
        isDecreasingTarget: false,
        startThresholdDeg: 15, // Gerak jika >= 105°
        targetToleranceDeg: 12, // Sampai jika >= target - 12°
        returnToleranceDeg: 10, // Selesai jika <= 100° (histeresis bersih 5° dari 105°)
        holdDurationMs: 2000,
        holdDropGraceMs: 400,
      }
  }
}

/**
 * Pure function state machine untuk mendeteksi repetisi gerakan fisioterapi:
 * STATE_START -> MOVING -> PEAK_CHECK -> HOLD -> RETURN -> (Repetisi Selesai / STATE_START)
 * Dilengkapi histeresis anti-flicker dan grace period penahanan posisi (hold buffer).
 */
export function stepRepCounter(
  prev: RepCounterContext,
  currentAngle: number,
  nowMs: number,
  config: RepCounterConfig,
  isCompensated = false
): RepCounterContext {
  const {
    baselineAngle,
    targetRom,
    isDecreasingTarget = targetRom < baselineAngle,
    startThresholdDeg = 15,
    targetToleranceDeg = 10,
    returnToleranceDeg = 10,
    holdDurationMs = 2000,
    holdDropGraceMs = 400,
  } = config

  let nextState: RepCounterState = prev.state
  let nextReps = prev.repsCompleted
  let nextHoldStartTime = prev.holdStartTime
  let nextHoldLastInZoneTime = prev.holdLastInZoneTime
  let nextHoldProgress = prev.holdProgress
  let feedback = prev.feedbackMessage

  // 1. Evaluasi pencapaian target ROM (zona target)
  const isTargetReached = isDecreasingTarget
    ? currentAngle <= targetRom + targetToleranceDeg
    : currentAngle >= targetRom - targetToleranceDeg

  // Zona tahan sedikit lebih longgar (+4°) saat sudah berada di dalam HOLD untuk mencegah tremor fisiologis
  const isHoldingZoneReached = isDecreasingTarget
    ? currentAngle <= targetRom + targetToleranceDeg + 4
    : currentAngle >= targetRom - targetToleranceDeg - 4

  // 2. Evaluasi perpindahan dari baseline (sudah mulai bergerak)
  const isMovedFromBaseline = isDecreasingTarget
    ? currentAngle <= baselineAngle - startThresholdDeg
    : currentAngle >= baselineAngle + startThresholdDeg

  // 3. Evaluasi apakah sudah kembali mendekati baseline (histeresis bebas tumpang tindih)
  const isReturnedToBaseline = isDecreasingTarget
    ? currentAngle >= baselineAngle - returnToleranceDeg
    : currentAngle <= baselineAngle + returnToleranceDeg

  switch (prev.state) {
    case "STATE_START": {
      nextHoldStartTime = null
      nextHoldLastInZoneTime = null
      nextHoldProgress = 0
      if (isMovedFromBaseline) {
        nextState = "MOVING"
        feedback = "Bagus, teruskan gerakan ke target"
      } else {
        feedback = "Mulai gerakan perlahan menuju target sudut"
      }
      break
    }

    case "MOVING": {
      if (isTargetReached) {
        nextState = "PEAK_CHECK"
        feedback = "Target tercapai! Bersiap tahan posisi"
      } else if (isReturnedToBaseline) {
        nextState = "STATE_START"
        feedback = "Kembali ke posisi awal"
      } else {
        feedback = "Lanjutkan gerakan perlahan"
      }
      break
    }

    case "PEAK_CHECK": {
      // Masuk ke fase HOLD
      nextState = "HOLD"
      nextHoldStartTime = nowMs
      nextHoldLastInZoneTime = nowMs
      nextHoldProgress = 0
      feedback = "Tahan posisi ini selama 2 detik"
      break
    }

    case "HOLD": {
      if (isHoldingZoneReached) {
        // Berada di dalam zona target
        nextHoldLastInZoneTime = nowMs
        const elapsed = nowMs - (prev.holdStartTime ?? nowMs)
        const progress = Math.min(1, elapsed / holdDurationMs)
        nextHoldProgress = progress

        if (progress >= 1) {
          nextState = "RETURN"
          nextHoldStartTime = null
          nextHoldLastInZoneTime = null
          feedback = "Tahan selesai! Perlahan kembali ke posisi awal"
        } else {
          const remainingSec = Math.ceil((holdDurationMs - elapsed) / 1000)
          feedback = `Tahan... ${remainingSec} detik lagi`
        }
      } else {
        // Keluar sementara dari zona target: cek grace period (400ms)
        const timeOutOfZone = nowMs - (prev.holdLastInZoneTime ?? nowMs)
        if (timeOutOfZone < holdDropGraceMs) {
          // Masih dalam toleransi jeda tremor sesaat
          feedback = "Pertahankan posisi target..."
        } else {
          // Benar-benar turun sebelum durasi hold selesai
          nextState = "MOVING"
          nextHoldStartTime = null
          nextHoldLastInZoneTime = null
          nextHoldProgress = 0
          feedback = "Sudut turun sebelum 2 detik, coba angkat lagi"
        }
      }
      break
    }

    case "RETURN": {
      if (isReturnedToBaseline) {
        nextState = "STATE_START"
        nextReps = prev.repsCompleted + 1
        nextHoldStartTime = null
        nextHoldLastInZoneTime = null
        nextHoldProgress = 0
        feedback = "Satu repetisi selesai! Kerja luar biasa"
      } else {
        feedback = "Perlahan kembali ke posisi semula"
      }
      break
    }
  }

  return {
    state: nextState,
    currentAngle,
    repsCompleted: nextReps,
    holdStartTime: nextHoldStartTime,
    holdLastInZoneTime: nextHoldLastInZoneTime,
    holdProgress: nextHoldProgress,
    isCompensated,
    feedbackMessage: isCompensated ? "Perhatian: Jaga postur tubuh tetap tegak!" : feedback,
  }
}
