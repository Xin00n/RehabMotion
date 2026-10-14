import { Link } from "react-router-dom"
import { ArrowLeft } from "lucide-react"

import { buttonVariants } from "@/components/ui/button"
import { useAuth } from "@/features/auth/stores/auth-store"
import { UpdateProfileForm } from "@/features/account/components/update-profile-form"
import { ChangePasswordForm } from "@/features/account/components/change-password-form"
import { PatientAccessManager } from "@/features/account/components/patient-access-manager"

export default function AccountPage() {
  const { user } = useAuth()
  const isPatient = user?.role === "patient"

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between p-4 sm:p-6 md:p-10">
      {/* Top Header */}
      <header className="max-w-3xl w-full mx-auto flex items-center justify-between pb-6 border-b border-border">
        <div className="flex items-center gap-4">
          <Link
            to="/dashboard"
            className={buttonVariants({
              variant: "outline",
              size: "sm",
              className: "cursor-pointer",
            })}
          >
            <ArrowLeft className="size-4 mr-1.5" />
            Kembali ke Dashboard
          </Link>
          <span className="text-xl font-bold tracking-tight">RehabMotion</span>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-3xl w-full mx-auto my-8 space-y-10">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Pengaturan Akun
          </h1>
          <p className="text-base text-muted-foreground mt-1">
            Kelola profil informasi pribadi dan keamanan akses akun Anda.
          </p>
        </div>

        {/* Section Profil */}
        <section className="bg-card border-2 border-border rounded-xl p-6 sm:p-8 space-y-6">
          <div className="border-b border-border pb-4">
            <h2 className="text-xl font-bold text-foreground">Informasi Profil</h2>
            <p className="text-sm text-muted-foreground">
              Perbarui nama lengkap yang ditampilkan pada sesi dan laporan latihan.
            </p>
          </div>
          <UpdateProfileForm />
        </section>

        {/* Section Delegasi Akses Pendamping & Dokter (Khusus Pasien) */}
        {isPatient && (
          <section className="bg-card border-2 border-border rounded-xl p-6 sm:p-8 space-y-6">
            <div className="border-b border-border pb-4">
              <h2 className="text-xl font-bold text-foreground">Daftar Pendamping & Fisioterapis</h2>
              <p className="text-sm text-muted-foreground">
                Beri izin kepada keluarga (caregiver) atau fisioterapis/dokter Anda untuk memantau perkembangan latihan.
              </p>
            </div>
            <PatientAccessManager />
          </section>
        )}

        {/* Section Password */}
        <section className="bg-card border-2 border-border rounded-xl p-6 sm:p-8 space-y-6">
          <div className="border-b border-border pb-4">
            <h2 className="text-xl font-bold text-foreground">Ganti Kata Sandi</h2>
            <p className="text-sm text-muted-foreground">
              Pastikan kata sandi baru Anda memiliki minimal 10 karakter untuk keamanan akun.
            </p>
          </div>
          <ChangePasswordForm />
        </section>
      </main>

      {/* Footer */}
      <footer className="max-w-3xl w-full mx-auto text-center py-6 text-sm text-muted-foreground border-t border-border">
        © {new Date().getFullYear()} RehabMotion
      </footer>
    </div>
  )
}
