class AudioCoach {
  private synth: SpeechSynthesis | null = null
  private lastSpokenText = ""
  private lastSpokenTime = 0
  private cooldownMs = 2500 // minimal jeda antar ucapan agar tidak bertumpuk

  constructor() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      this.synth = window.speechSynthesis
    }
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
    const voices = this.synth.getVoices()
    const idVoice = voices.find((v) => v.lang.startsWith("id"))
    if (idVoice) {
      utterance.voice = idVoice
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
