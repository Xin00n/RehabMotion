import { describe, it, expect, beforeEach } from "vitest"
import { AudioCoach } from "./audio-coach"

describe("AudioCoach", () => {
  let coach: AudioCoach

  beforeEach(() => {
    coach = new AudioCoach()
  })

  it("dapat diinisialisasi tanpa error meski di environment headless", () => {
    expect(coach).toBeDefined()
    expect(coach.getMuted()).toBe(false)
  })

  it("dapat mematikan dan menyalakan audio (mute/unmute)", () => {
    coach.setMuted(true)
    expect(coach.getMuted()).toBe(true)

    coach.setMuted(false)
    expect(coach.getMuted()).toBe(false)
  })

  it("dapat memanggil unlock, playChime, speak, dan stop tanpa melempar exception", () => {
    expect(() => {
      coach.unlock()
      coach.playChime("start")
      coach.playChime("target")
      coach.playChime("rep")
      coach.playChime("tick")
      coach.playChime("warning")
      coach.playChime("finish")
      coach.speak("Halo")
      coach.stop()
    }).not.toThrow()
  })
})
