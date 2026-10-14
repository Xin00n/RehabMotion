import { describe, it, expect } from "vitest"
import {
  calculateAngle,
  calculateExerciseAngle,
  EXERCISE_LANDMARK_MAP,
  type LandmarkPoint,
} from "./angle-engine"

function createDummyLandmarks(size = 33): LandmarkPoint[] {
  return Array.from({ length: size }, () => ({ x: 0, y: 0, z: 0, visibility: 0.9 }))
}

describe("angle-engine (PRD FR-2.2 Dot Product Angle Calculation)", () => {
  it("menghitung sudut 90 derajat dengan tepat", () => {
    const a: LandmarkPoint = { x: 0, y: 1 }
    const b: LandmarkPoint = { x: 0, y: 0 } // vertex
    const c: LandmarkPoint = { x: 1, y: 0 }

    const angle = calculateAngle(a, b, c)
    expect(angle).toBe(90)
  })

  it("menghitung sudut 180 derajat (garis lurus) dengan tepat", () => {
    const a: LandmarkPoint = { x: -1, y: 0 }
    const b: LandmarkPoint = { x: 0, y: 0 }
    const c: LandmarkPoint = { x: 1, y: 0 }

    const angle = calculateAngle(a, b, c)
    expect(angle).toBe(180)
  })

  it("menghitung sudut 45 derajat dengan tepat", () => {
    const a: LandmarkPoint = { x: 1, y: 1 }
    const b: LandmarkPoint = { x: 0, y: 0 }
    const c: LandmarkPoint = { x: 1, y: 0 }

    const angle = calculateAngle(a, b, c)
    expect(angle).toBe(45)
  })

  describe("3 Exercise MVP Landmark Verification (PRD Section 8)", () => {
    it("1. Elbow Flexion menggunakan index [11, 13, 15] (kiri) dan [12, 14, 16] (kanan)", () => {
      expect(EXERCISE_LANDMARK_MAP.elbow_flexion.left).toEqual([11, 13, 15])
      expect(EXERCISE_LANDMARK_MAP.elbow_flexion.right).toEqual([12, 14, 16])

      const landmarks = createDummyLandmarks()
      // Setup siku kiri membentuk 90 derajat (Bahu=11, Siku=13, Pergelangan=15)
      landmarks[11] = { x: 0.5, y: 0.2, visibility: 1 } // Bahu
      landmarks[13] = { x: 0.5, y: 0.5, visibility: 1 } // Siku (vertex)
      landmarks[15] = { x: 0.8, y: 0.5, visibility: 1 } // Pergelangan

      const angleLeft = calculateExerciseAngle(landmarks, "elbow_flexion", "left")
      expect(angleLeft).toBe(90)

      // Setup siku kanan membentuk 180 derajat
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
      // Setup bahu kiri abduksi 90 derajat (Pinggul=23, Bahu=11, Siku=13)
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
      // Setup lutut kanan ekstensi lurus 180 derajat (Pinggul=24, Lutut=26, Pergelangan Kaki=28)
      landmarks[24] = { x: 0.6, y: 0.5, visibility: 1 } // Pinggul
      landmarks[26] = { x: 0.6, y: 0.7, visibility: 1 } // Lutut (vertex)
      landmarks[28] = { x: 0.6, y: 0.9, visibility: 1 } // Pergelangan kaki

      const angle = calculateExerciseAngle(landmarks, "seated_knee_extension", "right")
      expect(angle).toBe(180)
    })
  })
})
