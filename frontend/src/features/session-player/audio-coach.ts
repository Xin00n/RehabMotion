/**
 * RehabMotion - Audio Coach & Sound Synthesizer
 *
 * Menggabungkan dua lapisan audio terpercaya:
 * 1. Web Audio API Chimes (100% reliable, latensi 0ms, tanpa dependensi suara OS/jaringan)
 * 2. Web Speech API Voice Coach (panduan suara verbal dengan fallback voice & proteksi Chrome GC)
 */

export type AudioChimeType = "start" | "target" | "rep" | "finish" | "tick" | "warning"

export class AudioCoach {
  private synth: SpeechSynthesis | null = null
  private audioCtx: AudioContext | null = null
  private activeUtterances: Set<SpeechSynthesisUtterance> = new Set()
  private lastSpokenText = ""
  private lastSpokenTime = 0
  private cooldownMs = 2000
  private idVoice: SpeechSynthesisVoice | null = null
  private fallbackVoice: SpeechSynthesisVoice | null = null
  private isMuted = false
  private isUnlocked = false

  constructor() {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("rehabmotion_audio_muted")
        if (stored !== null) {
          this.isMuted = stored === "true"
        }
      } catch {}

      if ("speechSynthesis" in window) {
        this.synth = window.speechSynthesis
        this.loadVoices()
        if ("onvoiceschanged" in this.synth) {
          this.synth.onvoiceschanged = () => this.loadVoices()
        }
      }
    }
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === "undefined") return null
    if (!this.audioCtx) {
      try {
        const AudioCtxClass =
          window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
        if (AudioCtxClass) {
          this.audioCtx = new AudioCtxClass()
        }
      } catch {
        // Abaikan jika browser memblokir pembuatan AudioContext
      }
    }
    return this.audioCtx
  }

  private loadVoices() {
    if (!this.synth) return
    try {
      const voices = this.synth.getVoices()
      if (!voices || voices.length === 0) return

      // Prioritas 1: Bahasa Indonesia (id-ID)
      this.idVoice =
        voices.find((v) => v.lang.toLowerCase().startsWith("id")) ||
        voices.find((v) => v.lang.toLowerCase().includes("indonesia")) ||
        null

      // Prioritas 2: Voice default browser/sistem atau voice pertama
      this.fallbackVoice =
        voices.find((v) => v.default) ||
        voices.find((v) => v.lang.toLowerCase().startsWith("en")) ||
        voices[0] ||
        null
    } catch {
      // Abaikan jika getVoices gagal
    }
  }

  /**
   * Buka kunci AudioContext & SpeechSynthesis sesuai kebijakan browser autoplay
   * Dipanggil saat ada interaksi user (klik, sentuh, mulai sesi).
   */
  unlock() {
    if (typeof window === "undefined") return

    // 1. Resume Web Audio Context
    const ctx = this.getAudioContext()
    if (ctx && ctx.state === "suspended") {
      ctx.resume().catch(() => {})
    }

    // 2. Unfreeze SpeechSynthesis jika terhenti di Chrome
    if (this.synth) {
      if (this.synth.paused) {
        try {
          this.synth.resume()
        } catch {}
      }
    }

    this.isUnlocked = true
  }

  /**
   * Mainkan efek suara sintetis (Web Audio API)
   * Selalu bekerja secara offline tanpa memerlukan voice pack OS.
   */
  playChime(type: AudioChimeType) {
    if (this.isMuted) return
    const ctx = this.getAudioContext()
    if (!ctx) return

    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {})
    }

    const now = ctx.currentTime

    switch (type) {
      case "start": {
        // Nada naik ceria 3 akor: C5 (523Hz) -> E5 (659Hz) -> G5 (784Hz)
        const notes = [523.25, 659.25, 783.99]
        notes.forEach((freq, idx) => {
          this.playTone(freq, now + idx * 0.12, 0.22, "sine", 0.18)
        })
        break
      }
      case "target": {
        // Bel target tercapai: A5 (880Hz) shimmer jernih
        this.playTone(880, now, 0.35, "sine", 0.22)
        this.playTone(1760, now, 0.2, "triangle", 0.08)
        break
      }
      case "rep": {
        // Ding-dong sukses repetisi: D5 (587Hz) -> A5 (880Hz)
        this.playTone(587.33, now, 0.16, "sine", 0.22)
        this.playTone(880, now + 0.11, 0.38, "sine", 0.24)
        break
      }
      case "tick": {
        // Detak lembut detik penahanan (hold countdown)
        this.playTone(987.77, now, 0.06, "sine", 0.12)
        break
      }
      case "warning": {
        // Peringatan lembut kompensasi postur: dua nada turun
        this.playTone(329.63, now, 0.18, "triangle", 0.16)
        this.playTone(261.63, now + 0.12, 0.25, "triangle", 0.16)
        break
      }
      case "finish": {
        // Fanfare kemenangan: C5 -> E5 -> G5 -> C6
        const fanfare = [
          { f: 523.25, d: 0.14 },
          { f: 659.25, d: 0.14 },
          { f: 783.99, d: 0.18 },
          { f: 1046.5, d: 0.55 },
        ]
        let offset = 0
        fanfare.forEach((n) => {
          this.playTone(n.f, now + offset, n.d, "sine", 0.2)
          offset += 0.13
        })
        break
      }
    }
  }

  private playTone(
    frequency: number,
    startTime: number,
    duration: number,
    type: OscillatorType = "sine",
    maxGain = 0.2
  ) {
    const ctx = this.getAudioContext()
    if (!ctx) return

    try {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = type
      osc.frequency.setValueAtTime(frequency, startTime)

      gain.gain.setValueAtTime(0.0001, startTime)
      gain.gain.exponentialRampToValueAtTime(maxGain, startTime + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(startTime)
      osc.stop(startTime + duration + 0.05)
    } catch {
      // Abaikan error penjadwalan AudioContext
    }
  }

  /**
   * Ucapkan teks menggunakan SpeechSynthesis
   */
  speak(text: string, force = false) {
    if (this.isMuted || !this.synth || !text) return

    const now = Date.now()

    // Jika pesan sama dan masih dalam jeda, abaikan agar tidak berulang-ulang
    if (!force && text === this.lastSpokenText && now - this.lastSpokenTime < this.cooldownMs) {
      return
    }

    // Hindari tabrakan jika baru saja berbicara kurang dari 1.2 detik lalu
    if (!force && now - this.lastSpokenTime < 1200) {
      return
    }

    // Pulihkan synth jika dalam kondisi paused (workaround bug Chrome)
    if (this.synth.paused) {
      try {
        this.synth.resume()
      } catch {}
    }

    // Batalkan ucapan sebelumnya jika force atau sedang berbicara
    if (force || this.synth.speaking) {
      try {
        this.synth.cancel()
      } catch {}
    }

    const utterance = new SpeechSynthesisUtterance(text)

    // Muat ulang suara jika belum ter-cache
    if (!this.idVoice && !this.fallbackVoice) {
      this.loadVoices()
    }

    // Pilih suara: gunakan bahasa Indonesia jika ada, jika tidak ada gunakan default browser
    if (this.idVoice) {
      utterance.voice = this.idVoice
      utterance.lang = this.idVoice.lang || "id-ID"
    } else if (this.fallbackVoice) {
      utterance.voice = this.fallbackVoice
      utterance.lang = this.fallbackVoice.lang || "en-US"
    } else {
      utterance.lang = "id-ID"
    }

    utterance.rate = 1.0
    utterance.pitch = 1.0
    utterance.volume = 1.0

    // Simpan referensi objek untuk mencegah garbage collection Chrome bug
    this.activeUtterances.add(utterance)
    const cleanup = () => {
      this.activeUtterances.delete(utterance)
    }
    utterance.onend = cleanup
    utterance.onerror = cleanup

    this.lastSpokenText = text
    this.lastSpokenTime = now

    try {
      this.synth.speak(utterance)
      if (this.synth.paused) {
        this.synth.resume()
      }
    } catch {
      cleanup()
    }
  }

  /**
   * Tes audio langsung untuk verifikasi user
   */
  testSound() {
    this.unlock()
    if (this.isMuted) {
      this.setMuted(false)
    }
    this.playChime("rep")
    setTimeout(() => {
      this.speak("Tes suara berhasil. Panduan audio RehabMotion aktif.", true)
    }, 200)
  }

  stop() {
    this.activeUtterances.clear()
    if (this.synth) {
      try {
        this.synth.cancel()
      } catch {}
    }
  }

  setMuted(muted: boolean) {
    this.isMuted = muted
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("rehabmotion_audio_muted", String(muted))
      } catch {}
    }
    if (muted) {
      this.stop()
    }
  }

  toggleMuted(): boolean {
    this.setMuted(!this.isMuted)
    return this.isMuted
  }

  getMuted(): boolean {
    return this.isMuted
  }

  getIsUnlocked(): boolean {
    return this.isUnlocked
  }
}

export const audioCoach = new AudioCoach()
