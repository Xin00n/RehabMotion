import { useNavigate } from "react-router-dom"
import { useAuth, authStore } from "@/features/auth/stores/auth-store"
import { Button } from "@/components/ui/button"

export default function DashboardPage() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const handleLogout = () => {
    authStore.clearAuth()
    navigate("/login")
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-6 md:p-10 flex flex-col justify-between">
      <header className="max-w-4xl w-full mx-auto flex items-center justify-between pb-6 border-b border-border">
        <h1 className="text-2xl font-bold tracking-tight">RehabMotion — Dashboard</h1>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => navigate("/account")} className="cursor-pointer">
            Pengaturan Akun
          </Button>
          <Button variant="outline" onClick={handleLogout} className="cursor-pointer">
            Keluar
          </Button>
        </div>
      </header>

      <main className="max-w-4xl w-full mx-auto my-12 space-y-6">
        <div className="border-2 border-border bg-card rounded-xl p-8 space-y-4">
          <h2 className="text-3xl font-bold">
            Selamat Datang, {user?.full_name || "Pengguna"}!
          </h2>
          <p className="text-lg text-muted-foreground">
            Peran akun Anda:{" "}
            <span className="font-semibold text-foreground capitalize">
              {user?.role === "patient" ? "Pasien" : user?.role === "clinician" ? "Fisioterapis / Dokter" : user?.role || "-"}
            </span>
          </p>
          <div className="pt-4 border-t border-border">
            <p className="text-base text-foreground/80">
              Pendaftaran berhasil diselesaikan dan token otentikasi telah tersimpan. Modul sesi latihan fisioterapi akan segera aktif pada tahap berikutnya.
            </p>
          </div>
        </div>
      </main>

      <footer className="max-w-4xl w-full mx-auto text-center py-4 text-sm text-muted-foreground border-t border-border">
        RehabMotion © {new Date().getFullYear()}
      </footer>
    </div>
  )
}
