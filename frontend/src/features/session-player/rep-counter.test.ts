import { describe, it, expect } from "vitest"
import {
  createInitialRepCounterContext,
  stepRepCounter,
  getExerciseMotionConfig,
} from "./rep-counter"

describe("rep-counter (State Machine with Hysteresis & Hold Grace Period)", () => {
  it("menghasilkan konfigurasi biomekanik akurat per latihan", () => {
    const elbowConfig = getExerciseMotionConfig("elbow_flexion", 90)
    expect(elbowConfig.baselineAngle).toBe(160)
    expect(elbowConfig.targetRom).toBe(90)
    expect(elbowConfig.isDecreasingTarget).toBe(true)

    const shoulderConfig = getExerciseMotionConfig("shoulder_abduction", 90)
    expect(shoulderConfig.baselineAngle).toBe(25)
    expect(shoulderConfig.targetRom).toBe(90)
    expect(shoulderConfig.isDecreasingTarget).toBe(false)

    const kneeConfig = getExerciseMotionConfig("seated_knee_extension", 150)
    expect(kneeConfig.baselineAngle).toBe(90)
    expect(kneeConfig.targetRom).toBe(150)
    expect(kneeConfig.isDecreasingTarget).toBe(false)
  })

  it("bertransisi dari STATE_START -> MOVING saat sendi mulai bergerak melampaui histeresis", () => {
    const config = getExerciseMotionConfig("shoulder_abduction", 90)
    let ctx = createInitialRepCounterContext(25)
    expect(ctx.state).toBe("STATE_START")

    // Sudut belum melampaui start threshold (25 + 10 = 35 < 40)
    ctx = stepRepCounter(ctx, 35, 1000, config)
    expect(ctx.state).toBe("STATE_START")

    // Sudut melampaui threshold (42 >= 40) -> MOVING
    ctx = stepRepCounter(ctx, 42, 1100, config)
    expect(ctx.state).toBe("MOVING")
  })

  it("menyelesaikan siklus penuh repetisi (MOVING -> PEAK_CHECK -> HOLD -> RETURN -> Selesai)", () => {
    const config = getExerciseMotionConfig("shoulder_abduction", 90)
    let ctx = createInitialRepCounterContext(25)
    let time = 1000

    // 1. Bergerak ke 50 derajat -> MOVING
    ctx = stepRepCounter(ctx, 50, time, config)
    expect(ctx.state).toBe("MOVING")

    // 2. Mencapai target 85 derajat (target 90 - tolerance 12 = 78) -> PEAK_CHECK
    time += 500
    ctx = stepRepCounter(ctx, 85, time, config)
    expect(ctx.state).toBe("PEAK_CHECK")

    // 3. Masuk fase HOLD
    time += 100
    ctx = stepRepCounter(ctx, 85, time, config)
    expect(ctx.state).toBe("HOLD")
    expect(ctx.holdProgress).toBe(0)

    // 4. Masih dalam fase HOLD (1 detik dari 2 detik)
    time += 1000
    ctx = stepRepCounter(ctx, 86, time, config)
    expect(ctx.state).toBe("HOLD")
    expect(ctx.holdProgress).toBe(0.5)

    // 5. Durasi HOLD 2 detik terpenuhi -> RETURN
    time += 1100
    ctx = stepRepCounter(ctx, 88, time, config)
    expect(ctx.state).toBe("RETURN")

    // 6. Kembali ke posisi awal (28 <= 25 + 10 = 35) -> Selesai 1 Repetisi!
    time += 500
    ctx = stepRepCounter(ctx, 28, time, config)
    expect(ctx.state).toBe("STATE_START")
    expect(ctx.repsCompleted).toBe(1)
  })

  it("menangani grace period saat getaran/jitter sesaat terjadi di fase HOLD", () => {
    const config = getExerciseMotionConfig("shoulder_abduction", 90)
    let ctx = createInitialRepCounterContext(25)
    let time = 1000

    // Masuk ke HOLD
    ctx = stepRepCounter(ctx, 50, time, config)
    ctx = stepRepCounter(ctx, 85, time + 200, config)
    ctx = stepRepCounter(ctx, 85, time + 300, config)
    expect(ctx.state).toBe("HOLD")

    // Jitter sesaat di bawah ambang selama 150ms (< 400ms grace period)
    time += 500
    ctx = stepRepCounter(ctx, 70, time, config) // turun sementara
    expect(ctx.state).toBe("HOLD") // tidak langsung di-reset!
    expect(ctx.feedbackMessage).toContain("Pertahankan")

    // Pasien kembali ke target dalam window grace period
    time += 100
    ctx = stepRepCounter(ctx, 85, time, config)
    expect(ctx.state).toBe("HOLD")

    // Selesaikan hold
    time += 2000
    ctx = stepRepCounter(ctx, 85, time, config)
    expect(ctx.state).toBe("RETURN")
  })

  it("mendukung latihan fleksi siku (target menurun dari 160 ke 90)", () => {
    const config = getExerciseMotionConfig("elbow_flexion", 90)
    let ctx = createInitialRepCounterContext(160)
    let time = 1000

    // Mulai tekuk siku (turun ke 130 <= 145) -> MOVING
    ctx = stepRepCounter(ctx, 130, time, config)
    expect(ctx.state).toBe("MOVING")

    // Capai target fleksi (88 <= 90 + 12 = 102) -> PEAK_CHECK
    time += 500
    ctx = stepRepCounter(ctx, 88, time, config)
    expect(ctx.state).toBe("PEAK_CHECK")

    // Tahan
    time += 100
    ctx = stepRepCounter(ctx, 88, time, config)
    expect(ctx.state).toBe("HOLD")

    // Selesai tahan (2 detik) -> RETURN
    time += 2100
    ctx = stepRepCounter(ctx, 88, time, config)
    expect(ctx.state).toBe("RETURN")

    // Luruskan kembali ke posisi awal (152 >= 160 - 10 = 150) -> Selesai
    time += 600
    ctx = stepRepCounter(ctx, 155, time, config)
    expect(ctx.state).toBe("STATE_START")
    expect(ctx.repsCompleted).toBe(1)
  })
})
