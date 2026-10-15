import { describe, it, expect } from "vitest"
import {
  calculateAngle,
  calculateAngle3D,
  calculateExerciseAngle,
  detectPostureCompensation,
  AngleSmoother,
  EXERCISE_LANDMARK_MAP,
  type LandmarkPoint,
} from "./angle-engine"

function createDummyLandmarks(size = 33): LandmarkPoint[] {
  return Array.from({ length: size }, () => ({ x: 0.5, y: 0.5, z: 0, visibility: 0.9 }))
}

describe("angle-engine (Biomechanical Angle Calculation & Biometrics)", () => {
  it("menghitung sudut 2D 90 derajat dengan tepat", () => {
    const a: LandmarkPoint = { x: 0, y: 1 }
    const b: LandmarkPoint = { x: 0, y: 0 } // vertex
    const c: LandmarkPoint = { x: 1, y: 0 }

    const angle = calculateAngle(a, b, c)
    expect(angle).toBe(90)
  })

  it("menghitung sudut 2D 180 derajat (garis lurus) dengan tepat", () => {
    const a: LandmarkPoint = { x: -1, y: 0 }
    const b: LandmarkPoint = { x: 0, y: 0 }
    const c: LandmarkPoint = { x: 1, y: 0 }

    const angle = calculateAngle(a, b, c)
    expect(angle).toBe(180)
  })

  it("menghitung sudut 3D dengan akurat pada ruang Euclidean", () => {
    // Siku 90 derajat di ruang 3D
    const a: LandmarkPoint = { x: 0, y: 0.3, z: 0 }
    const b: LandmarkPoint = { x: 0, y: 0, z: 0 } // vertex siku
    const c: LandmarkPoint = { x: 0, y: 0, z: 0.3 } // mengarah ke kamera (z)

    const angle3d = calculateAngle3D(a, b, c)
    expect(angle3d).toBe(90)
  })

  it("menerapkan adaptive smoothing untuk meredam jitter kamera", () => {
    const smoother = new AngleSmoother(0.35)

    // Nilai awal langsung tercatat
    expect(smoother.update(90)).toBe(90)

    // Jitter kecil (92) diredam dengan mulus
    const smoothed = smoother.update(92)
    expect(smoothed).toBeGreaterThan(90)
    expect(smoothed).toBeLessThan(92)

    // Reset mengembalikan smoother ke kondisi awal
    smoother.reset()
    expect(smoother.update(120)).toBe(120)
  })

  it("mendeteksi kompensasi postur tubuh saat bahu miring / terangkat", () => {
    const landmarks = createDummyLandmarks()
    // Bahu normal sejajar
    landmarks[11] = { x: 0.35, y: 0.3, visibility: 1 }
    landmarks[12] = { x: 0.65, y: 0.3, visibility: 1 }
    landmarks[23] = { x: 0.4, y: 0.7, visibility: 1 }
    landmarks[24] = { x: 0.6, y: 0.7, visibility: 1 }

    const normalPost = detectPostureCompensation(landmarks)
    expect(normalPost.isCompensated).toBe(false)

    // Bahu kiri terangkat tajam (shoulder hike kompensasi)
    landmarks[11] = { x: 0.35, y: 0.2, visibility: 1 } // naik 0.1 y
    const compensatedPost = detectPostureCompensation(landmarks)
    expect(compensatedPost.isCompensated).toBe(true)
  })

  describe("3 Exercise Landmark Verification", () => {
    it("1. Elbow Flexion menggunakan index [11, 13, 15] (kiri) dan [12, 14, 16] (kanan)", () => {
      expect(EXERCISE_LANDMARK_MAP.elbow_flexion.left).toEqual([11, 13, 15])
      expect(EXERCISE_LANDMARK_MAP.elbow_flexion.right).toEqual([12, 14, 16])

      const landmarks = createDummyLandmarks()
      landmarks[11] = { x: 0.5, y: 0.2, visibility: 1 } // Bahu
      landmarks[13] = { x: 0.5, y: 0.5, visibility: 1 } // Siku (vertex)
      landmarks[15] = { x: 0.8, y: 0.5, visibility: 1 } // Pergelangan

      const angleLeft = calculateExerciseAngle(landmarks, "elbow_flexion", "left")
      expect(angleLeft).toBe(90)

      landmarks[12] = { x: 0.5, y: 0.2, visibility: 1 }
      landmarks[14] = { x: 0.5, y: 0.5, visibility: 1 }
      landmarks[16] = { x: 0.5, y: 0.8, visibility: 1 }

      const angleRight = calculateExerciseAngle(landmarks, "elbow_flexion", "right")
      expect(angleRight).toBe(180)
    })

    it("2. Shoulder Abduction menggunakan index [23, 11, 13] (kiri) dan [24, 12, 14] (kanan)", () => {
      expect(EXERCISE_LANDMARK_MAP.shoulder_abduction.left).toEqual([23, 11, 13])
      expect(EXERCISE_LANDMARK_MAP.shoulder_abduction.right).toEqual([24, 12, 14])

      const landmarks = createDummyLandmarks()
      landmarks[23] = { x: 0.4, y: 0.8, visibility: 1 } // Pinggul
      landmarks[11] = { x: 0.4, y: 0.4, visibility: 1 } // Bahu (vertex)
      landmarks[13] = { x: 0.8, y: 0.4, visibility: 1 } // Siku

      const angle = calculateExerciseAngle(landmarks, "shoulder_abduction", "left")
      expect(angle).toBe(90)
    })

    it("3. Seated Knee Extension menggunakan index [23, 25, 27] (kiri) dan [24, 26, 28] (kanan)", () => {
      expect(EXERCISE_LANDMARK_MAP.seated_knee_extension.left).toEqual([23, 25, 27])
      expect(EXERCISE_LANDMARK_MAP.seated_knee_extension.right).toEqual([24, 26, 28])

      const landmarks = createDummyLandmarks()
      landmarks[24] = { x: 0.6, y: 0.5, visibility: 1 } // Pinggul
      landmarks[26] = { x: 0.6, y: 0.7, visibility: 1 } // Lutut (vertex)
      landmarks[28] = { x: 0.6, y: 0.9, visibility: 1 } // Pergelangan kaki

      const angle = calculateExerciseAngle(landmarks, "seated_knee_extension", "right")
      expect(angle).toBe(180)
    })
  })
})
