import { useState, useRef, useEffect } from "react"
import { useParams, useNavigate, Link } from "react-router-dom"
import { ArrowLeft, Camera, CheckCircle2, AlertTriangle, Play, Loader2 } from "lucide-react"

import { Button, buttonVariants } from "@/components/ui/button"
import { usePatientPrescriptions } from "@/features/patient/hooks/use-patient-data"
import { createSession } from "@/features/session/api/session-api"
import type { Prescription } from "@/types/patient"

export default function SessionSetupPage() {
  const { prescriptionId } = useParams<{ prescriptionId: string }>()
  const parsedPrescriptionId = prescriptionId ? Number(prescriptionId) : undefined
  const navigate = useNavigate()

  // Ambil detail resep untuk nama latihan & default sisi terdampak
  const { data: prescriptions = [], isLoading: isLoadingPrescription } =
    usePatientPrescriptions(false)
  const prescription = prescriptions.find((p: Prescription) => p.id === parsedPrescriptionId)

  // Sisi terdampak (FR-1.2): default dari resep, dapat diubah manual oleh pengguna
  const defaultSide: "left" | "right" =
    prescription?.affected_side?.toLowerCase() === "left" ? "left" : "right"
  const [userSelectedSide, setUserSelectedSide] = useState<"left" | "right" | null>(null)
  const selectedSide = userSelectedSide ?? defaultSide

  // Akses Webcam
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)

  // FR-1.1: Visual indicator box kesiapan posisi (placeholder slot UI)
  const [isBodyAligned, setIsBodyAligned] = useState<boolean>(true)

  // Modal Disclaimer Nyeri (Task 9e)
  const [showPainDisclaimer, setShowPainDisclaimer] = useState<boolean>(false)
  const [isCreatingSession, setIsCreatingSession] = useState<boolean>(false)

  useEffect(() => {
    let activeStream: MediaStream | null = null

    async function initCamera() {
      try {
        setCameraError(null)
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: "user",
          },
          audio: false,
        })
        activeStream = stream
        setCameraStream(stream)
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }
      } catch {
        setCameraError(
          "Kamera tidak dapat diakses. Pastikan Anda mengizinkan akses kamera di browser Anda."
        )
      }
    }

    initCamera()

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach((track) => track.stop())
      }
    }
  }, [])

  const handleStartClicked = () => {
    // Tampilkan disclaimer nyeri terlebih dahulu sesuai PRD Section 9
    setShowPainDisclaimer(true)
  }

  const handleConfirmStartSession = async () => {
    if (!prescriptionId) return

    // Ambil exercise_id dari relasi exercise pada prescription
    const exerciseId = prescription?.exercise_id ?? prescription?.exercise?.id
    if (!exerciseId) {
      alert("Data latihan untuk resep ini tidak lengkap (exercise_id tidak ditemukan).")
      return
    }

    setIsCreatingSession(true)
    try {
      const newSession = await createSession({
        exercise_id: exerciseId,
        prescription_id: Number(prescriptionId),
        affected_side: selectedSide,
      })
      // Tutup stream kamera setup sebelum pindah ke player
      if (cameraStream) {
        cameraStream.getTracks().forEach((t) => t.stop())
      }
      navigate(`/session-play/${newSession.id}`)
    } catch {
      // Fallback jika backend offline: tetap masuk ke session-play dengan mock ID
      if (cameraStream) {
        cameraStream.getTracks().forEach((t) => t.stop())
      }
      navigate(`/session-play/demo-${Date.now()}?prescription_id=${prescriptionId}&side=${selectedSide}`)
    } finally {
      setIsCreatingSession(false)
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between p-4 sm:p-6 md:p-8">
      {/* Top Header */}
      <header className="max-w-4xl w-full mx-auto flex items-center justify-between pb-6 border-b border-border">
        <Link
          to="/exercises"
          className={buttonVariants({
            variant: "outline",
            size: "sm",
            className: "cursor-pointer gap-1.5",
          })}
        >
          <ArrowLeft className="size-4" />
          <span>Kembali</span>
        </Link>
        <span className="text-xl font-bold tracking-tight">RehabMotion — Persiapan Sesi</span>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl w-full mx-auto my-6 space-y-8">
        <div>
          <span className="text-sm font-semibold uppercase tracking-wider text-muted-foreground bg-muted px-2.5 py-1 rounded">
            Pre-Session Setup
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground mt-2">
            {isLoadingPrescription
              ? "Memuat Latihan..."
              : prescription?.exercise?.name || prescription?.exercise_name || "Latihan Fisioterapi"}
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground mt-1">
            Posisikan tubuh Anda di depan kamera dan pastikan pencahayaan ruangan cukup terang.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          {/* Kamera Preview & FR-1.1 Bounding Box */}
          <div className="md:col-span-7 space-y-3">
            <div className="relative aspect-4/3 w-full rounded-2xl overflow-hidden bg-muted/90 border-2 border-border shadow-xs flex items-center justify-center">
              {cameraError ? (
                <div className="p-6 text-center space-y-3 text-destructive">
                  <Camera className="size-10 mx-auto opacity-70" />
                  <p className="text-sm font-medium">{cameraError}</p>
                </div>
              ) : (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover -scale-x-100"
                  />

                  {/* FR-1.1: Slot UI Bounding Box Indikator Hijau/Merah */}
                  <div className="absolute inset-4 sm:inset-6 pointer-events-none flex flex-col justify-between">
                    <div
                      className={`w-full h-full rounded-xl border-4 transition-colors ${
                        isBodyAligned
                          ? "border-emerald-500 bg-emerald-500/5"
                          : "border-amber-500 bg-amber-500/5"
                      }`}
                    />
                  </div>

                  {/* Status Badge FR-1.1 */}
                  <div className="absolute top-4 left-4 z-10">
                    <button
                      type="button"
                      onClick={() => setIsBodyAligned(!isBodyAligned)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs sm:text-sm font-bold shadow-md cursor-pointer transition-colors ${
                        isBodyAligned
                          ? "bg-emerald-600 text-white"
                          : "bg-amber-600 text-white"
                      }`}
                      title="Klik untuk simulasi status deteksi"
                    >
                      {isBodyAligned ? (
                        <>
                          <CheckCircle2 className="size-4" />
                          <span>Posisi Tubuh Terdeteksi (Siap)</span>
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="size-4" />
                          <span>Posisikan Tubuh di Dalam Kotak</span>
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
            <p className="text-xs text-muted-foreground text-center">
              * Video kamera diproses langsung di perangkat Anda dan tidak dikirim ke server.
            </p>
          </div>

          {/* Konfirmasi Sisi Terdampak (FR-1.2) & Tombol Mulai */}
          <div className="md:col-span-5 space-y-6">
            <div className="bg-card border-2 border-border rounded-2xl p-6 space-y-5">
              <div>
                <h2 className="text-lg font-bold text-foreground">
                  Konfirmasi Sisi Tubuh (FR-1.2)
                </h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Tentukan anggota tubuh yang akan dilatih pada sesi kali ini:
                </p>
              </div>

              {/* Selector Tombol Besar */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setUserSelectedSide("left")}
                  className={`min-h-14 p-4 rounded-xl border-2 text-center font-bold text-base cursor-pointer transition-colors ${
                    selectedSide === "left"
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background hover:bg-muted text-foreground"
                  }`}
                >
                  Sisi Kiri
                </button>

                <button
                  type="button"
                  onClick={() => setUserSelectedSide("right")}
                  className={`min-h-14 p-4 rounded-xl border-2 text-center font-bold text-base cursor-pointer transition-colors ${
                    selectedSide === "right"
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background hover:bg-muted text-foreground"
                  }`}
                >
                  Sisi Kanan
                </button>
              </div>

              <div className="text-sm text-muted-foreground pt-1 border-t border-border/80">
                <span>Target Sudut (ROM): </span>
                <span className="font-bold text-foreground">
                  {prescription?.target_rom ? `${prescription.target_rom}°` : "Sesuai Toleransi"}
                </span>
              </div>
            </div>

            {/* Tombol "Siap, Mulai" */}
            <Button
              type="button"
              onClick={handleStartClicked}
              disabled={Boolean(cameraError)}
              className="w-full h-16 text-xl font-bold gap-2 rounded-xl cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90"
              size="lg"
            >
              <Play className="size-6 fill-current" />
              <span>Siap, Mulai Latihan</span>
            </Button>
          </div>
        </div>
      </main>

      {/* Modal Disclaimer Rasa Nyeri (Task 9e / PRD Section 9) */}
      {showPainDisclaimer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border-2 border-border rounded-2xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-xl animate-in fade-in zoom-in-95">
            <div className="flex items-start gap-4">
              <div className="size-12 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center shrink-0">
                <AlertTriangle className="size-6 stroke-[2.2]" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-extrabold text-foreground">
                  Panduan Keamanan & Rasa Nyeri
                </h3>
                <p className="text-sm text-muted-foreground">
                  Harap baca sebelum memulai gerakan latihan:
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-muted/50 border border-border space-y-2 text-sm sm:text-base text-foreground/90 leading-relaxed">
              <p>
                <strong>1. Jangan Memaksakan Diri:</strong> Lakukan gerakan secara perlahan dan berhenti sebelum timbul rasa nyeri tajam.
              </p>
              <p>
                <strong>2. Tombol Stop / Nyeri:</strong> Selama latihan, tombol darurat berwarna merah selalu tersedia di layar. Tekan kapan saja untuk menghentikan sesi seketika.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowPainDisclaimer(false)}
                className="w-full sm:w-auto h-12 text-base font-semibold cursor-pointer"
              >
                Batal
              </Button>
              <Button
                type="button"
                onClick={handleConfirmStartSession}
                disabled={isCreatingSession}
                className="w-full sm:flex-1 h-12 text-base font-bold cursor-pointer"
              >
                {isCreatingSession ? (
                  <>
                    <Loader2 className="size-5 animate-spin mr-2" />
                    Menyiapkan Sesi...
                  </>
                ) : (
                  "Saya Mengerti & Mulai Sesi"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="max-w-4xl w-full mx-auto text-center py-4 text-sm text-muted-foreground border-t border-border">
        © {new Date().getFullYear()} RehabMotion
      </footer>
    </div>
  )
}
