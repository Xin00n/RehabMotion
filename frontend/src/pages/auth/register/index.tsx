import { Link } from "react-router-dom"
import { RegisterForm } from "@/features/auth/components/register-form"

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between p-4 sm:p-6 md:p-8">
      {/* Header Navigasi Sederhana */}
      <header className="w-full max-w-xl mx-auto flex items-center justify-between py-4">
        <Link
          to="/"
          className="text-2xl font-bold tracking-tight text-foreground hover:opacity-80 transition-opacity"
        >
          RehabMotion
        </Link>
        <Link
          to="/login"
          className="text-base font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          Masuk
        </Link>
      </header>

      {/* Main Content Form */}
      <main className="w-full max-w-xl mx-auto my-8">
        <div className="bg-card border-2 border-border rounded-xl p-6 sm:p-8 md:p-10">
          <div className="mb-8 space-y-2 text-left">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Daftar Akun Baru
            </h1>
            <p className="text-base text-muted-foreground leading-relaxed">
              Lengkapi data berikut untuk memulai sesi panduan fisioterapi pasca-stroke Anda.
            </p>
          </div>

          <RegisterForm />
        </div>
      </main>

      {/* Footer Minimalis */}
      <footer className="w-full max-w-xl mx-auto text-center py-6 border-t border-border/40">
        <p className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} RehabMotion. Panduan latihan mandiri berbasis computer vision.
        </p>
      </footer>
    </div>
  )
}
