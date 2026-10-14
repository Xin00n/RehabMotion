import { describe, it, expect } from "vitest"
import {
  createInitialRepCounterContext,
  stepRepCounter,
  type RepCounterConfig,
} from "./rep-counter"

describe("rep-counter (PRD FR-3.1/3.2 State Machine)", () => {
  const config: RepCounterConfig = {
    baselineAngle: 20, // misal abduksi bahu mulai dari 20 derajat
    targetRom: 90, // target 90 derajat
    isDecreasingTarget: false,
    startThresholdDeg: 15, // > 35 derajat triggers MOVING
    targetToleranceDeg: 10, // >= 80 derajat triggers PEAK_CHECK
    returnToleranceDeg: 15, // <= 35 derajat triggers completion
    holdDurationMs: 2000,
  }

  it("bertransisi dari STATE_START -> MOVING saat sendi mulai bergerak", () => {
    let ctx = createInitialRepCounterContext(20)
    expect(ctx.state).toBe("STATE_START")

    // Sudut belum melampaui start threshold (20 + 10 = 30)
    ctx = stepRepCounter(ctx, 30, 1000, config)
    expect(ctx.state).toBe("STATE_START")

    // Sudut melampaui threshold (40 > 35) -> MOVING
    ctx = stepRepCounter(ctx, 40, 1100, config)
    expect(ctx.state).toBe("MOVING")
  })

  it("bertransisi dari MOVING -> PEAK_CHECK -> HOLD -> RETURN -> STATE_START dan menambah repetisi", () => {
    let ctx = createInitialRepCounterContext(20)
    let time = 1000

    // 1. Bergerak ke 50 derajat -> MOVING
    ctx = stepRepCounter(ctx, 50, time, config)
    expect(ctx.state).toBe("MOVING")

    // 2. Mencapai target 85 derajat (targetRom 90 - tolerance 10 = 80) -> PEAK_CHECK
    time += 500
    ctx = stepRepCounter(ctx, 85, time, config)
    expect(ctx.state).toBe("PEAK_CHECK")

    // 3. Masuk fase HOLD
    time += 100
    ctx = stepRepCounter(ctx, 85, time, config)
    expect(ctx.state).toBe("HOLD")
    expect(ctx.holdProgress).toBe(0)

    // 4. Masih dalam fase HOLD (1 detik berlalu dari 2 detik)
    time += 1000
    ctx = stepRepCounter(ctx, 86, time, config)
    expect(ctx.state).toBe("HOLD")
    expect(ctx.holdProgress).toBe(0.5)

    // 5. Durasi HOLD 2 detik terpenuhi -> RETURN
    time += 1100
    ctx = stepRepCounter(ctx, 88, time, config)
    expect(ctx.state).toBe("RETURN")

    // 6. Kembali ke posisi awal (25 <= 20 + 15) -> Selesai 1 Repetisi!
    time += 500
    ctx = stepRepCounter(ctx, 25, time, config)
    expect(ctx.state).toBe("STATE_START")
    expect(ctx.repsCompleted).toBe(1)
  })
})
