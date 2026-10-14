import { Link } from "react-router-dom"
import { LoginForm } from "@/features/auth/components/login-form"

export default function LoginPage() {
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
          to="/register"
          className="text-base font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          Daftar
        </Link>
      </header>

      {/* Main Content Form */}
      <main className="w-full max-w-xl mx-auto my-8">
        <div className="bg-card border-2 border-border rounded-xl p-6 sm:p-8 md:p-10">
          <div className="mb-8 space-y-2 text-left">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Masuk ke Akun
            </h1>
            <p className="text-base text-muted-foreground leading-relaxed">
              Masuk untuk melanjutkan sesi latihan dan memantau perkembangan fisioterapi Anda.
            </p>
          </div>

          <LoginForm />
        </div>
      </main>

      {/* Footer Minimalis */}
      <footer className="w-full max-w-xl mx-auto text-center py-6 border-t border-border/40">
        <p className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} RehabMotion. Panduan fisioterapi pasca-stroke terpercaya.
        </p>
      </footer>
    </div>
  )
}
