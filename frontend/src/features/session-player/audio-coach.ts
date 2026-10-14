class AudioCoach {
  private synth: SpeechSynthesis | null = null
  private lastSpokenText = ""
  private lastSpokenTime = 0
  private cooldownMs = 2500 // minimal jeda antar ucapan agar tidak bertumpuk
  private idVoice: SpeechSynthesisVoice | null = null

  constructor() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      this.synth = window.speechSynthesis
      this.loadVoices()
      if ("onvoiceschanged" in this.synth) {
        this.synth.onvoiceschanged = () => this.loadVoices()
      }
    }
  }

  private loadVoices() {
    if (!this.synth) return
    const voices = this.synth.getVoices()
    this.idVoice =
      voices.find((v) => v.lang.toLowerCase().startsWith("id")) ||
      voices.find((v) => v.lang.toLowerCase().includes("indonesia")) ||
      null
  }

  speak(text: string, force = false) {
    if (!this.synth || !text) return

    const now = Date.now()
    if (!force && text === this.lastSpokenText && now - this.lastSpokenTime < this.cooldownMs) {
      return
    }

    if (!force && now - this.lastSpokenTime < 1500) {
      return
    }

    // Batalkan ucapan sebelumnya jika force atau sedang berbicara
    if (force || this.synth.speaking) {
      this.synth.cancel()
    }

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = "id-ID"
    utterance.rate = 0.95 // sedikit lebih lambat agar jelas untuk lansia
    utterance.pitch = 1.0

    // Pilih suara bahasa Indonesia jika tersedia di browser
    if (!this.idVoice) {
      this.loadVoices()
    }
    if (this.idVoice) {
      utterance.voice = this.idVoice
    }

    this.lastSpokenText = text
    this.lastSpokenTime = now

    this.synth.speak(utterance)
  }

  stop() {
    if (this.synth) {
      this.synth.cancel()
    }
  }
}

export const audioCoach = new AudioCoach()
