import { useState } from "react"
import { useSearchParams, Link } from "react-router-dom"
import {
  ArrowLeft,
  FileDown,
  TrendingUp,
  History,
  Calendar,
  Clock,
  Dumbbell,
  AlertCircle,
  Loader2,
  CheckCircle2,
} from "lucide-react"

import { Button, buttonVariants } from "@/components/ui/button"
import { useAuth } from "@/features/auth/stores/auth-store"
import { useRomTrend } from "@/features/analytics/hooks/use-rom-trend"
import { usePatientSessions, getSessionDate, getSessionReps } from "@/features/patient/hooks/use-patient-data"
import { downloadSessionReportPdf } from "@/features/analytics/api/analytics-api"
import { RomTrendChart } from "@/features/analytics/components/rom-trend-chart"
import type { Session } from "@/types/patient"

function formatDateIndo(dateStr?: string): string {
  if (!dateStr) return "-"
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  return d.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

function formatDuration(sec?: number): string {
  if (!sec || sec <= 0) return "< 1 mnt"
  const m = Math.floor(sec / 60)
  const s = sec % 60
  if (m === 0) return `${s} dtk`
  return `${m} mnt ${s} dtk`
}

export default function ProgressPage() {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const [isExporting, setIsExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const [exportSuccess, setExportSuccess] = useState(false)

  // Resolusi patient_id: default diri sendiri jika role=patient, wajib parameter untuk clinician
  const paramPatientId = searchParams.get("patient_id")
  const userRole = user?.role?.toLowerCase()
  const isPatientRole = userRole === "patient"

  const resolvedPatientId = isPatientRole
    ? paramPatientId || user?.id
    : paramPatientId

  // Hooks data React Query
  const { data: trendData = [], isLoading: isLoadingTrend } = useRomTrend(
    resolvedPatientId || undefined
  )
  const { data: sessions = [], isLoading: isLoadingSessions } = usePatientSessions(
    resolvedPatientId || undefined
  )

  const handleExport = async () => {
    if (!resolvedPatientId) {
      setExportError("ID Pasien tidak ditemukan untuk mengunduh laporan PDF.")
      return
    }
    setIsExporting(true)
    setExportError(null)
    setExportSuccess(false)

    try {
      await downloadSessionReportPdf(resolvedPatientId)
      setExportSuccess(true)
      setTimeout(() => setExportSuccess(false), 5000)
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal mengunduh laporan PDF."
      setExportError(msg)
    } finally {
      setIsExporting(false)
    }
  }

  // Jika role clinician tapi tidak ada parameter patient_id
  if (!isPatientRole && !resolvedPatientId) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col justify-between p-6 md:p-10">
        <header className="max-w-4xl w-full mx-auto flex items-center justify-between pb-6 border-b border-border">
          <Link
            to="/dashboard"
            className={buttonVariants({
              variant: "outline",
              size: "sm",
              className: "cursor-pointer gap-1.5",
            })}
          >
            <ArrowLeft className="size-4" />
            <span>Kembali ke Dashboard</span>
          </Link>
          <span className="text-xl font-bold tracking-tight">RehabMotion</span>
        </header>

        <main className="max-w-md w-full mx-auto my-16 border-2 border-border bg-card rounded-2xl p-8 text-center space-y-5">
          <div className="mx-auto size-16 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
            <AlertCircle className="size-8" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">Pilih Pasien Terlebih Dahulu</h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Sebagai fisioterapis / dokter, silakan buka menu daftar pasien Anda dan pilih salah satu pasien untuk melihat grafik dan riwayat latihan mereka.
            </p>
          </div>
          <Link
            to="/dashboard"
            className={buttonVariants({
              size: "lg",
              className: "w-full h-12 text-base font-semibold",
            })}
          >
            Kembali ke Dashboard
          </Link>
        </main>

        <footer className="max-w-4xl w-full mx-auto text-center py-4 text-sm text-muted-foreground">
          © {new Date().getFullYear()} RehabMotion
        </footer>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between p-4 sm:p-6 md:p-10">
      {/* Top Header */}
      <header className="max-w-5xl w-full mx-auto flex flex-wrap items-center justify-between gap-3 pb-6 border-b border-border">
        <Link
          to="/dashboard"
          className={buttonVariants({
            variant: "outline",
            size: "sm",
            className: "cursor-pointer gap-1.5 shrink-0",
          })}
        >
          <ArrowLeft className="size-4" />
          <span>Kembali ke Dashboard</span>
        </Link>

        <div className="flex items-center gap-3 shrink-0">
          {/* Tombol Ekspor PDF */}
          <Button
            onClick={handleExport}
            disabled={isExporting || isLoadingSessions}
            className="h-10 sm:h-11 px-3.5 sm:px-5 text-sm sm:text-base font-semibold cursor-pointer gap-2"
          >
            {isExporting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                <span>Mengunduh...</span>
              </>
            ) : (
              <>
                <FileDown className="size-4" />
                <span>Ekspor <span className="hidden sm:inline">Laporan</span> PDF</span>
              </>
            )}
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl w-full mx-auto my-8 space-y-10">
        {/* Banner Notifikasi Ekspor */}
        {exportSuccess && (
          <div
            role="status"
            className="rounded-xl border-2 border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-800 dark:text-emerald-200 flex items-center gap-3 animate-in fade-in"
          >
            <CheckCircle2 className="size-5 shrink-0 text-emerald-600" />
            <p className="text-sm font-semibold">
              Laporan PDF berhasil diunduh ke perangkat Anda.
            </p>
          </div>
        )}

        {exportError && (
          <div
            role="alert"
            className="rounded-xl border-2 border-destructive bg-destructive/10 p-4 text-destructive flex items-center gap-3"
          >
            <AlertCircle className="size-5 shrink-0" />
            <p className="text-sm font-medium">{exportError}</p>
          </div>
        )}

        {/* Heading & Context Mode */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
              Kemajuan & Riwayat Latihan
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground">
              Pantau perkembangan sudut rentang gerak (ROM) dan riwayat sesi latihan berkala.
            </p>
          </div>

        </div>

        {/* Section 1: Grafik Tren Sudut Sendi (Reusable RomTrendChart) */}
        <section className="border-2 border-border bg-card rounded-2xl p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-muted rounded-lg text-foreground">
                <TrendingUp className="size-5 stroke-[2.2]" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">
                  Grafik Tren Sudut Gerak (ROM)
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Rata-rata sudut yang dicapai pada setiap tanggal sesi latihan
                </p>
              </div>
            </div>
          </div>

          {isLoadingTrend ? (
            <div className="h-80 w-full flex items-center justify-center bg-muted/20 rounded-xl animate-pulse">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <RomTrendChart data={trendData} height={360} />
          )}
        </section>

        {/* Section 2: Daftar Riwayat Sesi (GET /patients/{id}/sessions) */}
        <section className="border-2 border-border bg-card rounded-2xl p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-2.5 border-b border-border pb-4">
            <div className="p-2 bg-muted rounded-lg text-foreground">
              <History className="size-5 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">Riwayat Sesi Latihan</h2>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Daftar rekaman latihan fisioterapi yang telah diselesaikan
              </p>
            </div>
          </div>

          {isLoadingSessions && (
            <div className="space-y-3 py-4">
              <div className="h-16 bg-muted rounded-xl animate-pulse" />
              <div className="h-16 bg-muted rounded-xl animate-pulse" />
            </div>
          )}

          {!isLoadingSessions && sessions.length === 0 && (
            <div className="py-12 text-center space-y-2 border-2 border-dashed border-border rounded-xl">
              <p className="text-base font-semibold text-foreground">
                Belum ada rekaman sesi latihan
              </p>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                Sesi yang telah diselesaikan akan tercatat otomatis di tabel riwayat ini.
              </p>
            </div>
          )}

          {!isLoadingSessions && sessions.length > 0 && (
            <div className="space-y-4">
              {sessions.map((session: Session) => (
                <div
                  key={session.id}
                  className="p-5 rounded-xl border-2 border-border bg-background flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="size-4" />
                      <span>{formatDateIndo(getSessionDate(session))}</span>
                    </div>
                    <h3 className="text-lg font-bold text-foreground">
                      {session.exercise?.name || session.exercise_name || "Latihan Fisioterapi"}
                    </h3>
                  </div>

                  <div className="flex items-center gap-6 text-sm">
                    <div className="text-right sm:text-left">
                      <span className="text-xs text-muted-foreground block flex items-center gap-1">
                        <Dumbbell className="size-3.5" /> Repetisi
                      </span>
                      <span className="text-base font-bold text-foreground">
                        {getSessionReps(session)}{" "}
                        {session.target_repetitions ? `/ ${session.target_repetitions}` : "rep"}
                      </span>
                    </div>

                    {(session.avg_rom ?? session.average_peak_rom_deg) !== undefined &&
                      (session.avg_rom ?? session.average_peak_rom_deg) !== null && (
                      <div className="text-right sm:text-left">
                        <span className="text-xs text-muted-foreground block">
                          Sudut Rata-rata
                        </span>
                        <span className="text-base font-bold text-foreground">
                          {Math.round(session.avg_rom ?? session.average_peak_rom_deg ?? 0)}°
                        </span>
                      </div>
                    )}

                    <div className="text-right sm:text-left">
                      <span className="text-xs text-muted-foreground block flex items-center gap-1">
                        <Clock className="size-3.5" /> Durasi Latihan
                      </span>
                      <span className="text-sm font-semibold text-foreground">
                        {formatDuration(
                          session.duration_seconds ??
                            (session.completed_at && session.created_at
                              ? Math.round(
                                  (new Date(session.completed_at).getTime() -
                                    new Date(session.created_at).getTime()) /
                                    1000
                                )
                              : undefined)
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="max-w-5xl w-full mx-auto text-center py-6 text-sm text-muted-foreground border-t border-border">
        © {new Date().getFullYear()} RehabMotion — Analisis Pemulihan & Riwayat Pasca-Stroke
      </footer>
    </div>
  )
}
