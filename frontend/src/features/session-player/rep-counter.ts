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
  startThresholdDeg?: number // Ambang sudut untuk mendeteksi mulai bergerak
  targetToleranceDeg?: number // Toleransi pencapaian target ROM
  returnToleranceDeg?: number // Toleransi kembali ke baseline
  holdDurationMs?: number // Durasi tahan posisi (default: 2000ms)
}

export interface RepCounterContext {
  state: RepCounterState
  currentAngle: number
  repsCompleted: number
  holdStartTime: number | null
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
    holdProgress: 0,
    isCompensated: false,
    feedbackMessage: "Siap di posisi awal",
  }
}

/**
 * Pure function state machine untuk mendeteksi repetisi gerakan fisioterapi:
 * STATE_START -> MOVING -> PEAK_CHECK -> HOLD -> RETURN -> (Repetisi Selesai / STATE_START)
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
    returnToleranceDeg = 20,
    holdDurationMs = 2000,
  } = config

  let nextState: RepCounterState = prev.state
  let nextReps = prev.repsCompleted
  let nextHoldStartTime = prev.holdStartTime
  let nextHoldProgress = prev.holdProgress
  let feedback = prev.feedbackMessage

  // Evaluasi pencapaian target ROM
  const isTargetReached = isDecreasingTarget
    ? currentAngle <= targetRom + targetToleranceDeg
    : currentAngle >= targetRom - targetToleranceDeg

  // Evaluasi perpindahan dari baseline (sudah mulai bergerak)
  const isMovedFromBaseline = isDecreasingTarget
    ? currentAngle < baselineAngle - startThresholdDeg
    : currentAngle > baselineAngle + startThresholdDeg

  // Evaluasi apakah sudah kembali mendekati baseline
  const isReturnedToBaseline = isDecreasingTarget
    ? currentAngle >= baselineAngle - returnToleranceDeg
    : currentAngle <= baselineAngle + returnToleranceDeg

  switch (prev.state) {
    case "STATE_START": {
      nextHoldStartTime = null
      nextHoldProgress = 0
      if (isMovedFromBaseline) {
        nextState = "MOVING"
        feedback = "Bagus, teruskan gerakan ke target"
      } else {
        feedback = "Mulai gerakan menuju target sudut"
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
      nextHoldProgress = 0
      feedback = "Tahan posisi ini selama 2 detik"
      break
    }

    case "HOLD": {
      if (!isTargetReached) {
        // Pasien drop sebelum durasi hold selesai
        nextState = "MOVING"
        nextHoldStartTime = null
        nextHoldProgress = 0
        feedback = "Sudut turun sebelum 2 detik, coba angkat lagi"
      } else {
        const elapsed = nowMs - (prev.holdStartTime ?? nowMs)
        const progress = Math.min(1, elapsed / holdDurationMs)
        nextHoldProgress = progress

        if (progress >= 1) {
          nextState = "RETURN"
          nextHoldStartTime = null
          feedback = "Tahan selesai! Perlahan kembali ke posisi awal"
        } else {
          const remainingSec = Math.ceil((holdDurationMs - elapsed) / 1000)
          feedback = `Tahan... ${remainingSec} detik lagi`
        }
      }
      break
    }

    case "RETURN": {
      if (isReturnedToBaseline) {
        nextState = "STATE_START"
        nextReps = prev.repsCompleted + 1
        nextHoldStartTime = null
        nextHoldProgress = 0
        feedback = "Satu repetisi selesai! Kerja bagus"
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
    holdProgress: nextHoldProgress,
    isCompensated,
    feedbackMessage: isCompensated ? "Perhatian: Jaga postur tubuh tetap tegak!" : feedback,
  }
}
