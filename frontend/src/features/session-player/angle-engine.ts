export interface LandmarkPoint {
  x: number
  y: number
  z?: number
  visibility?: number
}

export type ExerciseType =
  | "elbow_flexion"
  | "shoulder_abduction"
  | "seated_knee_extension"

export type Side = "left" | "right"

/**
 * Indeks 33 MediaPipe Pose Landmarks:
 * 11: LEFT_SHOULDER, 12: RIGHT_SHOULDER
 * 13: LEFT_ELBOW, 14: RIGHT_ELBOW
 * 15: LEFT_WRIST, 16: RIGHT_WRIST
 * 23: LEFT_HIP, 24: RIGHT_HIP
 * 25: LEFT_KNEE, 26: RIGHT_KNEE
 * 27: LEFT_ANKLE, 28: RIGHT_ANKLE
 */
export const EXERCISE_LANDMARK_MAP: Record<
  ExerciseType,
  Record<Side, [number, number, number]>
> = {
  // A: Shoulder, B: Elbow (vertex), C: Wrist
  elbow_flexion: {
    left: [11, 13, 15],
    right: [12, 14, 16],
  },
  // A: Hip, B: Shoulder (vertex), C: Elbow
  shoulder_abduction: {
    left: [23, 11, 13],
    right: [24, 12, 14],
  },
  // A: Hip, B: Knee (vertex), C: Ankle
  seated_knee_extension: {
    left: [23, 25, 27],
    right: [24, 26, 28],
  },
}

/**
 * Menghitung sudut 2D antara 3 titik (A, B, C) dengan B sebagai vertex.
 * Mendukung koreksi aspect ratio (width / height) untuk koordinat ternormalisasi (0..1)
 * agar bebas dari distorsi sudut diagonal.
 */
export function calculateAngle(
  pointA: LandmarkPoint,
  pointB: LandmarkPoint,
  pointC: LandmarkPoint,
  aspectRatio = 1
): number {
  const baX = (pointA.x - pointB.x) * aspectRatio
  const baY = pointA.y - pointB.y
  const bcX = (pointC.x - pointB.x) * aspectRatio
  const bcY = pointC.y - pointB.y

  const dotProduct = baX * bcX + baY * bcY
  const magnitudeBA = Math.sqrt(baX * baX + baY * baY)
  const magnitudeBC = Math.sqrt(bcX * bcX + bcY * bcY)

  if (magnitudeBA === 0 || magnitudeBC === 0) {
    return 0
  }

  // Clamp cosine ke [-1, 1] untuk mencegah nilai NaN pada floating point precision
  const cosine = Math.max(-1, Math.min(1, dotProduct / (magnitudeBA * magnitudeBC)))
  const angleRad = Math.acos(cosine)
  const angleDeg = (angleRad * 180) / Math.PI

  return Math.round(angleDeg * 10) / 10
}

/**
 * Menghitung sudut 3D Euclidean antara 3 titik (A, B, C) dengan B sebagai vertex.
 * Menggunakan vektor 3 dimensi (X, Y, Z) dari worldLandmarks (dalam meter fisik).
 * Kebal terhadap distorsi foreshortening kamera saat lengan bergerak maju/mundur.
 */
export function calculateAngle3D(
  pointA: LandmarkPoint,
  pointB: LandmarkPoint,
  pointC: LandmarkPoint
): number {
  const baX = pointA.x - pointB.x
  const baY = pointA.y - pointB.y
  const baZ = (pointA.z ?? 0) - (pointB.z ?? 0)

  const bcX = pointC.x - pointB.x
  const bcY = pointC.y - pointB.y
  const bcZ = (pointC.z ?? 0) - (pointB.z ?? 0)

  const dotProduct = baX * bcX + baY * bcY + baZ * bcZ
  const magnitudeBA = Math.sqrt(baX * baX + baY * baY + baZ * baZ)
  const magnitudeBC = Math.sqrt(bcX * bcX + bcY * bcY + bcZ * bcZ)

  if (magnitudeBA === 0 || magnitudeBC === 0) {
    return 0
  }

  const cosine = Math.max(-1, Math.min(1, dotProduct / (magnitudeBA * magnitudeBC)))
  const angleRad = Math.acos(cosine)
  const angleDeg = (angleRad * 180) / Math.PI

  return Math.round(angleDeg * 10) / 10
}

/**
 * Normalisasi nama exercise dari database/resep ke ExerciseType
 */
export function normalizeExerciseType(exerciseName: string): ExerciseType {
  const lower = exerciseName.toLowerCase()
  if (lower.includes("elbow") || lower.includes("siku")) {
    return "elbow_flexion"
  }
  if (lower.includes("shoulder") || lower.includes("bahu") || lower.includes("abduction")) {
    return "shoulder_abduction"
  }
  if (lower.includes("knee") || lower.includes("lutut") || lower.includes("extension")) {
    return "seated_knee_extension"
  }
  // Default fallback ke elbow_flexion
  return "elbow_flexion"
}

/**
 * Menghitung sudut gerakan sendi spesifik dari hasil deteksi MediaPipe.
 * Secara otomatis memprioritaskan 3D worldLandmarks jika tersedia,
 * dengan fallback yang dikoreksi aspect ratio pada 2D landmarks.
 */
export function calculateExerciseAngle(
  landmarks: LandmarkPoint[],
  exerciseType: ExerciseType | string,
  side: Side,
  aspectRatio = 1,
  worldLandmarks?: LandmarkPoint[]
): number | null {
  const normType =
    typeof exerciseType === "string" &&
    !["elbow_flexion", "shoulder_abduction", "seated_knee_extension"].includes(exerciseType)
      ? normalizeExerciseType(exerciseType)
      : (exerciseType as ExerciseType)

  const indices = EXERCISE_LANDMARK_MAP[normType]?.[side]
  if (!indices) return null

  const [idxA, idxB, idxC] = indices

  // Cek validitas 2D landmarks terlebih dahulu
  const pA = landmarks[idxA]
  const pB = landmarks[idxB]
  const pC = landmarks[idxC]

  if (!pA || !pB || !pC) return null

  // Cek visibility minimum (confidence > 0.35)
  if (
    (pA.visibility !== undefined && pA.visibility < 0.35) ||
    (pB.visibility !== undefined && pB.visibility < 0.35) ||
    (pC.visibility !== undefined && pC.visibility < 0.35)
  ) {
    return null
  }

  // Jika worldLandmarks (3D metrik dalam meter) tersedia, gunakan untuk akurasi optimal
  if (worldLandmarks && worldLandmarks[idxA] && worldLandmarks[idxB] && worldLandmarks[idxC]) {
    const wA = worldLandmarks[idxA]
    const wB = worldLandmarks[idxB]
    const wC = worldLandmarks[idxC]
    return calculateAngle3D(wA, wB, wC)
  }

  // Fallback ke 2D dengan koreksi aspect ratio
  return calculateAngle(pA, pB, pC, aspectRatio)
}

/**
 * Deteksi kompensasi postur tubuh (misal: bahu terangkat/shrugging, tubuh miring/trunk lean)
 * Sangat penting bagi pasien rehabilitasi stroke / fisioterapi.
 */
export function detectPostureCompensation(
  landmarks: LandmarkPoint[]
): { isCompensated: boolean; reason?: string } {
  if (!landmarks || landmarks.length < 33) {
    return { isCompensated: false }
  }

  const leftShoulder = landmarks[11]
  const rightShoulder = landmarks[12]
  const leftHip = landmarks[23]
  const rightHip = landmarks[24]

  if (!leftShoulder || !rightShoulder || !leftHip || !rightHip) {
    return { isCompensated: false }
  }

  const shoulderVis = Math.min(leftShoulder.visibility ?? 1, rightShoulder.visibility ?? 1)
  const hipVis = Math.min(leftHip.visibility ?? 1, rightHip.visibility ?? 1)

  if (shoulderVis < 0.35 || hipVis < 0.35) {
    return { isCompensated: false }
  }

  // 1. Deteksi Bahu Terangkat / Asimetris Signifikan (Shoulder Hike / Elevation)
  const shoulderYDiff = Math.abs(leftShoulder.y - rightShoulder.y)
  const shoulderDist = Math.hypot(leftShoulder.x - rightShoulder.x, leftShoulder.y - rightShoulder.y) || 0.25
  const shoulderSlope = shoulderYDiff / shoulderDist

  // Kemiringan bahu > 0.2 (~12 derajat)
  if (shoulderSlope > 0.22) {
    return { isCompensated: true, reason: "Bahu miring atau terangkat" }
  }

  // 2. Deteksi Tubuh Condong ke Samping (Trunk Lateral Lean)
  const midShoulderX = (leftShoulder.x + rightShoulder.x) / 2
  const midShoulderY = (leftShoulder.y + rightShoulder.y) / 2
  const midHipX = (leftHip.x + rightHip.x) / 2
  const midHipY = (leftHip.y + rightHip.y) / 2

  const torsoDx = Math.abs(midShoulderX - midHipX)
  const torsoDy = Math.abs(midShoulderY - midHipY) || 0.4
  const torsoSlope = torsoDx / torsoDy

  // Kemiringan tubuh > 0.26 (~15 derajat)
  if (torsoSlope > 0.26) {
    return { isCompensated: true, reason: "Badan condong ke samping" }
  }

  return { isCompensated: false }
}

/**
 * Filter Low-Pass / Exponential Moving Average (EMA) adaptif
 * Menghilangkan noise/jitter kamera 30 FPS tanpa menyebabkan lag gerakan.
 */
export class AngleSmoother {
  private currentSmoothed: number | null = null
  private alpha: number

  constructor(alpha = 0.35) {
    this.alpha = alpha
  }

  update(rawAngle: number): number {
    if (this.currentSmoothed === null) {
      this.currentSmoothed = rawAngle
      return rawAngle
    }

    // Jika terjadi perpindahan drastis (> 30°), percepat respons agar tidak terasa tertinggal
    const diff = Math.abs(rawAngle - this.currentSmoothed)
    const dynamicAlpha = diff > 30 ? 0.75 : this.alpha

    this.currentSmoothed = dynamicAlpha * rawAngle + (1 - dynamicAlpha) * this.currentSmoothed
    return Math.round(this.currentSmoothed * 10) / 10
  }

  reset() {
    this.currentSmoothed = null
  }
}
