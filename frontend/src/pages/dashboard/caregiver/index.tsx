import { Link, useNavigate } from "react-router-dom"
import { Users, User, LogOut, RefreshCw, AlertCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useAuth, authStore } from "@/features/auth/stores/auth-store"
import { useCaregiverPatients } from "@/features/patient/hooks/use-patient-data"
import { PatientCard } from "@/features/patient/components/patient-card"

export default function CaregiverDashboardPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { data: patients = [], isLoading, isError, refetch } = useCaregiverPatients()

  const handleLogout = () => {
    authStore.clearAuth()
    navigate("/login")
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between p-4 sm:p-6 md:p-10">
      {/* Top Navbar */}
      <header className="max-w-5xl w-full mx-auto flex items-center justify-between pb-6 border-b border-border">
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
      <main className="max-w-5xl w-full mx-auto my-8 space-y-10">
        {/* Sapaan Ramah & Identitas Caregiver */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-muted text-foreground border border-border">
              Dashboard Pendamping / Caregiver
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            Halo, {user?.full_name || "Pendamping"}!
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed max-w-3xl">
            Pantau kemajuan latihan fisioterapi, ketercapaian target sudut sendi (ROM), dan riwayat sesi latihan dari pasien yang Anda dampingi.
          </p>
        </div>

        {/* Section Daftar Pasien */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Users className="size-6 text-foreground" />
              <h2 className="text-2xl font-bold text-foreground">
                Pasien Dalam Pendampingan
              </h2>
              {!isLoading && !isError && (
                <span className="text-sm font-semibold px-2.5 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                  {patients.length} Pasien
                </span>
              )}
            </div>

            {isError && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                className="cursor-pointer gap-1.5"
              >
                <RefreshCw className="size-4" />
                <span>Coba Lagi</span>
              </Button>
            )}
          </div>

          {/* Kondisi Loading */}
          {isLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="rounded-2xl border-2 border-border bg-card p-6 space-y-6 animate-pulse"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="size-12 rounded-xl bg-muted" />
                    <div className="space-y-2 flex-1">
                      <div className="h-5 bg-muted rounded w-1/2" />
                      <div className="h-4 bg-muted rounded w-1/3" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-4 border-t border-border">
                    <div className="h-16 bg-muted rounded-lg" />
                    <div className="h-16 bg-muted rounded-lg" />
                  </div>
                  <div className="h-4 bg-muted rounded w-1/4 pt-2" />
                </div>
              ))}
            </div>
          )}

          {/* Kondisi Error */}
          {!isLoading && isError && (
            <div className="border-2 border-border bg-card rounded-2xl p-8 text-center space-y-4">
              <div className="mx-auto size-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                <AlertCircle className="size-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-foreground">
                  Gagal Memuat Daftar Pasien
                </h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  Terjadi kendala saat mengambil data pasien dari server. Silakan periksa koneksi atau coba beberapa saat lagi.
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => refetch()}
                className="cursor-pointer gap-2 mt-2"
              >
                <RefreshCw className="size-4" />
                <span>Muat Ulang Data</span>
              </Button>
            </div>
          )}

          {/* Kondisi Kosong (Empty State) */}
          {!isLoading && !isError && patients.length === 0 && (
            <div className="border-2 border-border bg-card rounded-2xl p-8 sm:p-12 text-center space-y-4">
              <div className="mx-auto size-14 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                <Users className="size-7" />
              </div>
              <div className="space-y-2 max-w-md mx-auto">
                <h3 className="text-xl font-bold text-foreground">
                  Belum Ada Pasien Tertaut
                </h3>
                <p className="text-base text-muted-foreground leading-relaxed">
                  Akun pendamping Anda saat ini belum memiliki pasien yang terhubung. Hubungi fisioterapis atau administrator klinis Anda untuk menautkan pasien ke akun ini.
                </p>
              </div>
            </div>
          )}

          {/* Grid Kartu Pasien (Menggunakan PatientCard yang reusable) */}
          {!isLoading && !isError && patients.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {patients.map((patient) => (
                <PatientCard key={patient.id} patient={patient} />
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="max-w-5xl w-full mx-auto text-center py-6 text-sm text-muted-foreground border-t border-border">
        © {new Date().getFullYear()} RehabMotion — Pendamping Fisioterapi Pasca-Stroke
      </footer>
    </div>
  )
}
