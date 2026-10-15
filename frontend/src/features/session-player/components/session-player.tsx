import { useEffect, useRef, useState, useCallback, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { useQueryClient } from "@tanstack/react-query"
import { PoseLandmarker, FilesetResolver } from "@mediapipe/tasks-vision"
import { AlertOctagon, Volume2, VolumeX, CheckCircle, Flame, ArrowLeft, Loader2, HelpCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { getExerciseIllustration } from "@/pages/exercises"
import {
  calculateExerciseAngle,
  detectPostureCompensation,
  AngleSmoother,
  EXERCISE_LANDMARK_MAP,
  normalizeExerciseType,
  type Side,
} from "@/features/session-player/angle-engine"
import {
  createInitialRepCounterContext,
  stepRepCounter,
  getExerciseMotionConfig,
  type RepCounterConfig,
  type RepCounterContext,
} from "@/features/session-player/rep-counter"
import { drawPoseSkeleton } from "@/features/session-player/pose-overlay"
import { audioCoach } from "@/features/session-player/audio-coach"
import {
  submitBatchRomMeasurements,
  finishSession,
  type RomMeasurement,
} from "@/features/session/api/session-api"
import type { Prescription } from "@/types/patient"

interface SessionPlayerProps {
  sessionId: string
  prescription?: Prescription | null
  affectedSide?: Side
  targetReps?: number
  targetRom?: number
  exerciseName?: string
}

export function SessionPlayer({
  sessionId,
  prescription,
  affectedSide = "right",
  targetReps = 10,
  targetRom = 90,
  exerciseName = "Elbow Flexion",
}: SessionPlayerProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // Video & Canvas Refs
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const landmarkerRef = useRef<PoseLandmarker | null>(null)
  const animFrameRef = useRef<number | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const isSessionFinishedRef = useRef(false)
  const currentAngleRef = useRef<number>(0)
  const angleSmootherRef = useRef<AngleSmoother>(new AngleSmoother(0.35))

  // Audio State
  const [isAudioEnabled, setIsAudioEnabled] = useState(true)
  const [showGuideModal, setShowGuideModal] = useState(false)

  const activeExerciseName =
    prescription?.exercise?.name || prescription?.exercise_name || exerciseName
  const illustration = getExerciseIllustration(
    prescription?.exercise?.code,
    activeExerciseName
  )

  // Tracking & Engine State
  const [currentAngle, setCurrentAngle] = useState<number>(0)
  const [repContext, setRepContext] = useState<RepCounterContext>(() =>
    createInitialRepCounterContext(0)
  )
  const repContextRef = useRef<RepCounterContext>(repContext)
  repContextRef.current = repContext

  const [isPoseReady, setIsPoseReady] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [isFinishing, setIsFinishing] = useState(false)

  // Durasi sesi
  const [elapsedSeconds, setElapsedSeconds] = useState(0)

  // Ref buffer untuk batching periodic measurement (Task 9f)
  const measurementsBufferRef = useRef<RomMeasurement[]>([])

  const resolvedExerciseType = useMemo(
    () =>
      normalizeExerciseType(
        prescription?.exercise?.name || prescription?.exercise_name || exerciseName
      ),
    [prescription?.exercise?.name, prescription?.exercise_name, exerciseName]
  )
  const resolvedExerciseTypeRef = useRef(resolvedExerciseType)
  useEffect(() => {
    resolvedExerciseTypeRef.current = resolvedExerciseType
  }, [resolvedExerciseType])

  const safeSide: Side = affectedSide === "left" ? "left" : "right"
  const affectedSideRef = useRef(safeSide)
  useEffect(() => {
    affectedSideRef.current = safeSide
  }, [safeSide])

  const targetRepsRef = useRef(targetReps)
  useEffect(() => {
    targetRepsRef.current = targetReps
  }, [targetReps])

  const targetRomRef = useRef(targetRom)
  useEffect(() => {
    targetRomRef.current = targetRom
  }, [targetRom])

  const activeIndices = EXERCISE_LANDMARK_MAP[resolvedExerciseType]?.[safeSide]
  const activeIndicesRef = useRef(activeIndices)
  useEffect(() => {
    activeIndicesRef.current = activeIndices
  }, [activeIndices])

  const repConfig: RepCounterConfig = useMemo(
    () => getExerciseMotionConfig(resolvedExerciseType, targetRom),
    [resolvedExerciseType, targetRom]
  )
  const repConfigRef = useRef(repConfig)
  useEffect(() => {
    repConfigRef.current = repConfig
  }, [repConfig])

  // Timer durasi
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds((s) => s + 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Fungsi pengiriman batch periodic (Task 9f)
  const flushBatchMeasurements = useCallback(async () => {
    if (measurementsBufferRef.current.length === 0) return
    const batch = [...measurementsBufferRef.current]
    measurementsBufferRef.current = []

    try {
      await submitBatchRomMeasurements(sessionId, { measurements: batch })
    } catch {
      // Abaikan kendala jaringan batch di background agar tidak mengganggu latihan pasien
    }
  }, [sessionId])

  // Periodic flush tiap 4 detik
  useEffect(() => {
    const interval = setInterval(() => {
      flushBatchMeasurements()
    }, 4000)
    return () => clearInterval(interval)
  }, [flushBatchMeasurements])

  // Ref pelacakan repetisi dan peak ROM
  const peakRomListRef = useRef<number[]>([])

  // Selesai Sesi (completed / stopped)
  const handleFinishSession = useCallback(
    async (notes?: string, isEmergency = false) => {
      if (isSessionFinishedRef.current) return
      isSessionFinishedRef.current = true
      setIsFinishing(true)
      audioCoach.speak(isEmergency ? "Sesi dihentikan." : "Sesi latihan selesai. Kerja luar biasa!", true)
      await flushBatchMeasurements()

      // Kalkulasi peak ROM
      const peaks = peakRomListRef.current
      const current = currentAngleRef.current
      const maxPeak = peaks.length > 0 ? Math.max(...peaks) : current || 0
      const avgPeak = peaks.length > 0 ? peaks.reduce((a, b) => a + b, 0) / peaks.length : current || 0

      const totalReps = repContextRef.current.repsCompleted
      const successfulReps = repContextRef.current.repsCompleted

      try {
        await finishSession(sessionId, {
          status: isEmergency ? "stopped" : "completed",
          total_repetitions: totalReps,
          successful_repetitions: successfulReps,
          average_peak_rom_deg: Number(avgPeak.toFixed(1)),
          maximum_peak_rom_deg: Number(maxPeak.toFixed(1)),
          stop_reason: isEmergency ? "pain_or_fatigue" : null,
          notes,
        })
      } catch {
        // Fallback jika API backend offline
      } finally {
        await queryClient.invalidateQueries({ queryKey: ["patients"] })
      }

      // Berhenti audio & redirect
      audioCoach.stop()
      navigate(`/dashboard?session_finished=true&reps=${totalReps}`)
    },
    [flushBatchMeasurements, sessionId, navigate, queryClient]
  )
  const handleFinishSessionRef = useRef(handleFinishSession)
  useEffect(() => {
    handleFinishSessionRef.current = handleFinishSession
  }, [handleFinishSession])

  // Emergency Stop / Nyeri (Task 9e / PRD Section 9)
  const handleEmergencyStop = () => {
    audioCoach.stop()
    handleFinishSession("Dihentikan oleh pasien karena rasa nyeri atau kelelahan.", true)
  }

  // Audio Feedback effect
  useEffect(() => {
    if (isAudioEnabled && repContext.feedbackMessage) {
      audioCoach.speak(repContext.feedbackMessage)
    }
  }, [isAudioEnabled, repContext.feedbackMessage, repContext.state])

  // Screen Wake Lock & Tab Visibility listener agar layar & kamera tidak sleep
  useEffect(() => {
    let wakeLock: any = null

    async function requestWakeLock() {
      if ("wakeLock" in navigator && !wakeLock) {
        try {
          wakeLock = await (navigator as any).wakeLock.request("screen")
        } catch {
          // Abaikan jika tidak didukung browser
        }
      }
    }

    requestWakeLock()

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        requestWakeLock()
        const video = videoRef.current
        const stream = mediaStreamRef.current
        if (video && stream) {
          if (video.srcObject !== stream) {
            video.srcObject = stream
          }
          if (video.paused) {
            video.play().catch(() => {})
          }
        }
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      if (wakeLock) {
        try {
          wakeLock.release().catch(() => {})
        } catch {}
        wakeLock = null
      }
    }
  }, [])

  // Inisialisasi MediaPipe PoseLandmarker & Kamera - Dijalankan SEKALI saat mount
  useEffect(() => {
    let isCancelled = false
    let lastVideoTime = -1
    let lastDetectTimestamp = -1

    async function initMediaPipeAndCamera() {
      try {
        setCameraError(null)

        // 1. Inisialisasi WASM MediaPipe Vision & PoseLandmarker
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm"
        )

        if (isCancelled) return

        const poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numPoses: 1,
        })

        if (isCancelled) {
          poseLandmarker.close()
          return
        }

        landmarkerRef.current = poseLandmarker

        // 2. Akses Kamera Webcam
        const userMediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: "user",
          },
          audio: false,
        })

        if (isCancelled) {
          userMediaStream.getTracks().forEach((t) => t.stop())
          return
        }

        mediaStreamRef.current = userMediaStream

        if (videoRef.current) {
          videoRef.current.srcObject = userMediaStream
          videoRef.current.onloadedmetadata = () => {
            if (videoRef.current && !isCancelled) {
              videoRef.current.play().catch(() => {})
            }
          }
          videoRef.current.play().catch(() => {})
        }

        // 3. Loop Animasi Frame Processing
        const processFrame = () => {
          if (isCancelled) return

          try {
            const video = videoRef.current
            const canvas = canvasRef.current
            const landmarker = landmarkerRef.current

            if (video && canvas && landmarker && video.readyState >= 2 && !video.paused) {
              const ctx = canvas.getContext("2d")

              if (video.currentTime !== lastVideoTime) {
                lastVideoTime = video.currentTime

                // Pastikan timestamp selalu monotonically increasing untuk MediaPipe
                let nowMs = performance.now()
                if (nowMs <= lastDetectTimestamp) {
                  nowMs = lastDetectTimestamp + 1
                }
                lastDetectTimestamp = nowMs

                const results = landmarker.detectForVideo(video, nowMs)

                if (ctx) {
                  const width = canvas.width
                  const height = canvas.height
                  const aspectRatio = width / (height || 1)

                  if (
                    results.landmarks &&
                    results.landmarks.length > 0 &&
                    results.landmarks[0].length >= 33
                  ) {
                    setIsPoseReady(true)
                    const landmarks = results.landmarks[0]
                    const worldLandmarks = (results as any).worldLandmarks?.[0]
                    const currentType = resolvedExerciseTypeRef.current
                    const currentSide = affectedSideRef.current
                    const currentIndices = activeIndicesRef.current
                    const currentTargetReps = targetRepsRef.current
                    const currentTargetRom = targetRomRef.current

                    // 1. Hitung sudut sendi aktif (menggunakan 3D worldLandmarks / aspect-ratio corrected 2D)
                    const rawAngle = calculateExerciseAngle(landmarks, currentType, currentSide, aspectRatio, worldLandmarks)

                    if (rawAngle !== null) {
                      // 2. Terapkan smoothing adaptif anti-jitter
                      const angle = angleSmootherRef.current.update(rawAngle)
                      currentAngleRef.current = angle
                      setCurrentAngle(angle)

                      // 3. Deteksi kompensasi postur tubuh
                      const compensation = detectPostureCompensation(landmarks)
                      const isCompensated = compensation.isCompensated

                      // 4. Step state machine
                      const now = Date.now()
                      const prevCtx = repContextRef.current
                      const nextCtx = stepRepCounter(prevCtx, angle, now, repConfigRef.current, isCompensated)
                      repContextRef.current = nextCtx
                      setRepContext(nextCtx)

                      // Simpan peak ROM saat memasuki HOLD atau PEAK_CHECK
                      if (nextCtx.state === "HOLD" || nextCtx.state === "PEAK_CHECK") {
                        peakRomListRef.current.push(angle)
                      }

                      // 5. Tambahkan ke batch buffer
                      measurementsBufferRef.current.push({
                        angle_deg: Number(angle.toFixed(1)),
                        affected_side: currentSide,
                        phase: nextCtx.state.toLowerCase(),
                        target_reached: nextCtx.state === "HOLD" || nextCtx.state === "RETURN",
                        measured_at: new Date(now).toISOString(),
                        timestamp_ms: now,
                        repetition_index: nextCtx.repsCompleted,
                        current_angle: angle,
                        target_angle: currentTargetRom,
                        is_target_reached: nextCtx.state === "HOLD",
                        is_compensated: nextCtx.isCompensated,
                      })

                      // Cek apakah target repetisi tercapai
                      if (
                        nextCtx.repsCompleted >= currentTargetReps &&
                        prevCtx.repsCompleted < currentTargetReps &&
                        !isSessionFinishedRef.current
                      ) {
                        setTimeout(() => {
                          handleFinishSessionRef.current("Target repetisi berhasil diselesaikan penuh.")
                        }, 1200)
                      }

                      // 6. Render skeleton overlay dengan live angle badge pada vertex joint
                      drawPoseSkeleton(
                        ctx,
                        landmarks,
                        width,
                        height,
                        nextCtx.state,
                        nextCtx.isCompensated,
                        currentIndices,
                        angle
                      )
                    } else {
                      drawPoseSkeleton(
                        ctx,
                        landmarks,
                        width,
                        height,
                        repContextRef.current.state,
                        repContextRef.current.isCompensated,
                        currentIndices
                      )
                    }
                  } else {
                    ctx.clearRect(0, 0, width, height)
                  }
                }
              }
            }
          } catch (frameErr) {
            console.warn("MediaPipe frame processing error (non-fatal):", frameErr)
          }

          if (!isCancelled) {
            animFrameRef.current = requestAnimationFrame(processFrame)
          }
        }

        // Mulai frame loop
        animFrameRef.current = requestAnimationFrame(processFrame)
      } catch (err) {
        console.error("Camera / MediaPipe initialization error:", err)
        setCameraError("Kamera atau model MediaPipe Pose tidak dapat diinisialisasi. Pastikan izin kamera aktif.")
      }
    }

    initMediaPipeAndCamera()

    return () => {
      isCancelled = true
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current)
        animFrameRef.current = null
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop())
        mediaStreamRef.current = null
      }
      if (landmarkerRef.current) {
        landmarkerRef.current.close()
        landmarkerRef.current = null
      }
      audioCoach.stop()
    }
  }, []) // Mount-only: stream kamera dan MediaPipe tetap hidup stabil tanpa remount berulang


  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between p-3 sm:p-6 select-none">
      {/* Top Session Status Bar */}
      <header className="w-full max-w-5xl mx-auto flex items-center justify-between pb-4 border-b border-border">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleEmergencyStop}
            className="cursor-pointer gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            <span className="hidden sm:inline">Keluar Sesi</span>
          </Button>
          <div>
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
              Sesi Latihan Aktif
            </span>
            <span className="text-lg sm:text-xl font-extrabold text-foreground">
              {prescription?.exercise?.name || prescription?.exercise_name || exerciseName}
            </span>
          </div>
        </div>

        {/* Audio Toggle, Guide & Timer */}
        <div className="flex items-center gap-2 sm:gap-3">
          {illustration && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowGuideModal(true)}
              className="cursor-pointer gap-1.5 text-xs sm:text-sm font-semibold"
            >
              <HelpCircle className="size-4 text-primary" />
              <span className="hidden sm:inline">Contoh Gerakan</span>
            </Button>
          )}
          <div className="px-3 py-1 bg-muted rounded-lg font-mono font-bold text-sm sm:text-base border border-border">
            {formatTimer(elapsedSeconds)}
          </div>
          <Button
            variant="outline"
            size="icon-lg"
            onClick={() => {
              if (isAudioEnabled) audioCoach.stop()
              setIsAudioEnabled(!isAudioEnabled)
            }}
            className="cursor-pointer"
            title={isAudioEnabled ? "Matikan panduan suara" : "Aktifkan panduan suara"}
          >
            {isAudioEnabled ? <Volume2 className="size-5" /> : <VolumeX className="size-5" />}
          </Button>
        </div>
      </header>

      {/* Main Workout Area */}
      <main className="w-full max-w-5xl mx-auto my-4 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        {/* Video Canvas Container dengan Skeleton Overlay */}
        <div className="md:col-span-8 space-y-3">
          <div className="relative aspect-4/3 w-full rounded-2xl overflow-hidden bg-black border-2 border-border shadow-md">
            {cameraError ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-destructive bg-destructive/10 space-y-3">
                <AlertOctagon className="size-10 mx-auto opacity-70" />
                <p className="font-semibold text-sm">{cameraError}</p>
                <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
                  Muat Ulang Sesi
                </Button>
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
                <canvas
                  ref={canvasRef}
                  width={640}
                  height={480}
                  className="absolute inset-0 w-full h-full pointer-events-none -scale-x-100"
                />

                {/* Status MediaPipe Badge */}
                <div className="absolute top-4 left-4 z-10">
                  <div
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold shadow-md ${
                      isPoseReady
                        ? "bg-emerald-600 text-white"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <CheckCircle className="size-3.5" />
                    <span>{isPoseReady ? "Skeleton 33 Landmark Aktif" : "Mendeteksi Tubuh..."}</span>
                  </div>
                </div>

                {/* FR-4.3 Color Legend Overlay */}
                <div className="absolute bottom-4 left-4 right-4 z-10 flex items-center justify-between pointer-events-none">
                  <div className="px-3.5 py-1.5 rounded-lg bg-black/80 backdrop-blur-xs text-white text-xs sm:text-sm font-semibold flex items-center gap-3">
                    <span className="flex items-center gap-1.5">
                      <span className="size-2.5 rounded-full bg-yellow-400 inline-block" />
                      Bergerak
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="size-2.5 rounded-full bg-emerald-500 inline-block" />
                      Target ROM
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="size-2.5 rounded-full bg-red-500 inline-block" />
                      Kompensasi
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Feedback Suara Real-Time Banner */}
          <div className="p-4 rounded-xl border-2 border-border bg-card flex items-center gap-3">
            <Volume2 className="size-5 shrink-0 text-foreground" />
            <p className="text-base sm:text-lg font-bold text-foreground leading-snug">
              {repContext.feedbackMessage}
            </p>
          </div>
        </div>

        {/* Panel Kontrol Latihan & Emergency Stop */}
        <div className="md:col-span-4 space-y-6">
          {/* Kartu Repetisi & Sudut */}
          <div className="border-2 border-border bg-card rounded-2xl p-6 sm:p-8 space-y-6">
            {/* Rep Counter Display */}
            <div>
              <span className="text-sm font-bold text-muted-foreground uppercase tracking-wider block">
                Repetisi Selesai
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-6xl sm:text-7xl font-extrabold text-foreground tracking-tight">
                  {repContext.repsCompleted}
                </span>
                <span className="text-2xl font-bold text-muted-foreground">
                  / {targetReps}
                </span>
              </div>
            </div>

            {/* Sudut Saat Ini vs Target ROM */}
            <div className="space-y-2 pt-4 border-t border-border">
              <div className="flex items-center justify-between text-base">
                <span className="text-muted-foreground">Sudut Sendi Saat Ini:</span>
                <span className="font-extrabold text-2xl text-foreground">
                  {currentAngle}°
                </span>
              </div>
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Target ROM:</span>
                <span className="font-semibold text-foreground">{targetRom}°</span>
              </div>

              {/* Hold Progress Bar */}
              {repContext.state === "HOLD" && (
                <div className="space-y-1 pt-2">
                  <div className="flex justify-between text-xs font-bold text-emerald-600">
                    <span>Menahan Posisi...</span>
                    <span>{Math.round(repContext.holdProgress * 100)}%</span>
                  </div>
                  <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-150 rounded-full"
                      style={{ width: `${repContext.holdProgress * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* TASK 9E: Tombol Besar Emergency Stop "Stop / Nyeri" SELALU VISIBLE */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={handleEmergencyStop}
              className="w-full min-h-20 p-5 rounded-2xl bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors flex items-center justify-center gap-3 font-extrabold text-xl sm:text-2xl shadow-lg cursor-pointer"
            >
              <AlertOctagon className="size-8 stroke-[2.5]" />
              <span>STOP / NYERI</span>
            </button>
            <p className="text-xs text-muted-foreground text-center leading-relaxed">
              Tekan tombol merah di atas kapan saja jika Anda merasakan nyeri tajam atau kelelahan.
            </p>
          </div>

          {/* Tombol Selesai Manual */}
          <Button
            variant="outline"
            size="lg"
            onClick={() => handleFinishSession("Sesi diakhiri secara manual oleh pengguna.")}
            disabled={isFinishing}
            className="w-full h-12 text-base font-semibold cursor-pointer border-2"
          >
            {isFinishing ? (
              <>
                <Loader2 className="size-4 animate-spin mr-2" />
                Menyimpan Sesi...
              </>
            ) : (
              <>
                <Flame className="size-4 mr-2" />
                Selesaikan Latihan
              </>
            )}
          </Button>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-5xl mx-auto text-center py-2 text-xs text-muted-foreground border-t border-border">
        RehabMotion — Panduan Gerakan AI & Umpan Balik Suara Real-Time
      </footer>

      {/* Modal Contoh Gerakan */}
      {showGuideModal && illustration && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in"
        >
          <div className="bg-card text-card-foreground border-2 border-border rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-lg font-bold text-foreground">
                  Panduan Gerakan: {activeExerciseName}
                </h3>
                <p className="text-xs text-muted-foreground">
                  Ikuti 3 tahapan posisi (Awal, Gerakan, Selesai Tahan)
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowGuideModal(false)}
                className="cursor-pointer"
              >
                ✕
              </Button>
            </div>

            <div className="rounded-xl overflow-hidden border border-border bg-muted/20 p-2">
              <img
                src={illustration}
                alt={activeExerciseName}
                className="w-full h-auto max-h-[60vh] object-contain rounded-lg mx-auto"
              />
            </div>

            <div className="flex justify-end pt-2">
              <Button
                onClick={() => setShowGuideModal(false)}
                className="cursor-pointer font-bold px-6"
              >
                Lanjutkan Latihan
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
