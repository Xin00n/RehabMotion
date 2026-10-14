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
 * Menghitung sudut antara 3 titik (A, B, C) dengan B sebagai vertex
 * Menggunakan rumus dot product:
 * v1 = A - B
 * v2 = C - B
 * cos(theta) = (v1 . v2) / (|v1| * |v2|)
 * theta = arccos(cos(theta)) dalam derajat (0 - 180)
 */
export function calculateAngle(
  pointA: LandmarkPoint,
  pointB: LandmarkPoint,
  pointC: LandmarkPoint
): number {
  const baX = pointA.x - pointB.x
  const baY = pointA.y - pointB.y
  const bcX = pointC.x - pointB.x
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
 * Menghitung sudut gerakan spesifik berdasarkan daftar landmarks MediaPipe
 */
export function calculateExerciseAngle(
  landmarks: LandmarkPoint[],
  exerciseType: ExerciseType | string,
  side: Side
): number | null {
  const normType =
    typeof exerciseType === "string" && !["elbow_flexion", "shoulder_abduction", "seated_knee_extension"].includes(exerciseType)
      ? normalizeExerciseType(exerciseType)
      : (exerciseType as ExerciseType)

  const indices = EXERCISE_LANDMARK_MAP[normType]?.[side]
  if (!indices) return null

  const [idxA, idxB, idxC] = indices
  const pA = landmarks[idxA]
  const pB = landmarks[idxB]
  const pC = landmarks[idxC]

  if (!pA || !pB || !pC) return null

  // Cek visibility jika tersedia (misal confidence minimum > 0.5)
  if (
    (pA.visibility !== undefined && pA.visibility < 0.3) ||
    (pB.visibility !== undefined && pB.visibility < 0.3) ||
    (pC.visibility !== undefined && pC.visibility < 0.3)
  ) {
    return null
  }

  return calculateAngle(pA, pB, pC)
}
