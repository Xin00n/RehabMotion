import { Link, useNavigate } from "react-router-dom"
import { Play, TrendingUp, Calendar, Activity, User, LogOut } from "lucide-react"

import { Button, buttonVariants } from "@/components/ui/button"
import { useAuth, authStore } from "@/features/auth/stores/auth-store"
import { usePatientDashboardData } from "@/features/patient/hooks/use-patient-data"

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

export default function PatientDashboardPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const {
    isLoading,
    activePrescriptionsCount,
    latestSession,
    sessionsThisWeekCount,
  } = usePatientDashboardData()

  const handleLogout = () => {
    authStore.clearAuth()
    navigate("/login")
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between p-4 sm:p-6 md:p-10">
      {/* Top Navbar */}
      <header className="max-w-4xl w-full mx-auto flex items-center justify-between pb-6 border-b border-border">
        <Link to="/" className="text-2xl font-bold tracking-tight hover:opacity-85 transition-opacity">
          RehabMotion
        </Link>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/account")}
            className="cursor-pointer gap-1.5"
          >
            <User className="size-4" />
            <span className="hidden sm:inline">Pengaturan Akun</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="cursor-pointer gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <LogOut className="size-4" />
            <span className="hidden sm:inline">Keluar</span>
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl w-full mx-auto my-8 space-y-10">
        {/* Sapaan Ramah & Fokus */}
        <div className="space-y-2">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            Halo, {user?.full_name || "Pasien"}!
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed">
            Semoga hari Anda menyenangkan. Luangkan waktu untuk melatih kelenturan motorik Anda hari ini.
          </p>
        </div>

        {/* 1 CTA UTAMA BESAR: "Mulai Latihan" */}
        <div>
          <Link
            to="/exercises"
            className={buttonVariants({
              size: "lg",
              className:
                "w-full min-h-20 sm:min-h-24 p-4 sm:p-6 md:p-8 flex items-center justify-between text-left rounded-2xl cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90 transition-all gap-3",
            })}
          >
            <div className="space-y-1 min-w-0 flex-1">
              <span className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight block truncate">
                Mulai Latihan
              </span>
              <span className="text-sm sm:text-base md:text-lg text-primary-foreground/80 block font-normal line-clamp-1 sm:line-clamp-none">
                Lihat panduan dan mulai sesi fisioterapi hari ini
              </span>
            </div>
            <div className="size-10 sm:size-12 md:size-14 rounded-full bg-primary-foreground text-primary flex items-center justify-center shrink-0">
              <Play className="size-5 sm:size-6 md:size-7 fill-current ml-0.5" />
            </div>
          </Link>
        </div>

        {/* Ringkasan Resep, Sesi Terakhir, & Mini Progress */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Kartu Ringkasan Resep & Sesi Terakhir */}
          <div className="border-2 border-border bg-card rounded-2xl p-6 sm:p-8 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-foreground font-bold text-lg">
                <Activity className="size-5" />
                <span>Status Program Latihan</span>
              </div>

              {isLoading ? (
                <div className="space-y-2 py-4 animate-pulse">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-4 bg-muted rounded w-1/2" />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-muted/40 border border-border">
                    <span className="text-sm text-muted-foreground block">Resep Aktif</span>
                    <span className="text-xl font-bold text-foreground">
                      {activePrescriptionsCount} Program Latihan Aktif
                    </span>
                  </div>

                  <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-1">
                    <span className="text-sm text-muted-foreground block">Sesi Terakhir</span>
                    {latestSession ? (
                      <>
                        <p className="text-base font-bold text-foreground">
                          {latestSession.exercise?.name ||
                            latestSession.exercise_name ||
                            "Sesi Fisioterapi"}
                        </p>
                        <p className="text-sm text-foreground/80 flex items-center gap-2 pt-0.5">
                          <Calendar className="size-4 text-muted-foreground" />
                          <span>
                            {formatDateIndo(latestSession.completed_at || latestSession.created_at)}
                          </span>
                          <span>•</span>
                          <span className="font-semibold">
                            {latestSession.repetitions_completed} repetisi
                          </span>
                        </p>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Belum ada sesi latihan yang tercatat. Tekan Mulai Latihan di atas untuk sesi pertama Anda.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <Link
              to="/exercises"
              className="text-base font-semibold text-foreground underline underline-offset-4 hover:opacity-80 pt-2"
            >
              Lihat Semua Resep Latihan →
            </Link>
          </div>

          {/* Kartu Mini Progress (1 Angka Besar) */}
          <Link
            to="/progress"
            className="border-2 border-border bg-card rounded-2xl p-6 sm:p-8 flex flex-col justify-between hover:border-foreground/40 transition-colors group"
          >
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-foreground font-bold text-lg">
                <TrendingUp className="size-5" />
                <span>Kemajuan Minggu Ini</span>
              </div>

              {isLoading ? (
                <div className="h-20 bg-muted rounded-xl animate-pulse my-4" />
              ) : (
                <div className="py-2">
                  <span className="text-6xl sm:text-7xl font-extrabold text-foreground tracking-tight block">
                    {sessionsThisWeekCount}
                  </span>
                  <span className="text-lg font-semibold text-muted-foreground mt-1 block">
                    Total Sesi Selesai Minggu Ini
                  </span>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-border flex items-center justify-between text-base font-semibold text-foreground">
              <span>Buka Riwayat & Grafik Kemajuan</span>
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </div>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-4xl w-full mx-auto text-center py-6 text-sm text-muted-foreground border-t border-border">
        © {new Date().getFullYear()} RehabMotion — Pendamping Fisioterapi Pasca-Stroke
      </footer>
    </div>
  )
}
