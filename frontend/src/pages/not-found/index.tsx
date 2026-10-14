import { Link, useLocation } from "react-router-dom"
import { ShieldAlert, FileQuestion } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { useAuth } from "@/features/auth/stores/auth-store"

export default function NotFoundPage() {
  const location = useLocation()
  const { token } = useAuth()

  // Cek apakah halaman dipanggil karena unauthorized (role mismatch / 403)
  const isUnauthorized =
    location.state?.reason === "unauthorized" ||
    new URLSearchParams(location.search).get("reason") === "unauthorized"

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between p-6 md:p-10">
      <header className="max-w-2xl w-full mx-auto py-4">
        <Link to="/" className="text-2xl font-bold tracking-tight">
          RehabMotion
        </Link>
      </header>

      <main className="max-w-2xl w-full mx-auto my-12 border-2 border-border bg-card rounded-xl p-8 sm:p-12 text-center space-y-6">
        <div className="mx-auto size-16 rounded-full bg-muted flex items-center justify-center text-foreground">
          {isUnauthorized ? (
            <ShieldAlert className="size-8 stroke-[2.2]" />
          ) : (
            <FileQuestion className="size-8 stroke-[2.2]" />
          )}
        </div>

        <div className="space-y-3">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            {isUnauthorized ? "Akses Tidak Diizinkan" : "Halaman Tidak Ditemukan"}
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed max-w-lg mx-auto">
            {isUnauthorized
              ? "Akun Anda tidak memiliki izin untuk mengakses halaman ini. Halaman ini dibatasi hanya untuk peran pengguna tertentu."
              : "Alamat web yang Anda tuju tidak ditemukan, sudah dihapus, atau terjadi kesalahan pengetikan alamat URL."}
          </p>
        </div>

        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
          {token ? (
            <Link
              to="/dashboard"
              className={buttonVariants({
                size: "lg",
                className: "h-12 px-6 text-base font-semibold",
              })}
            >
              Kembali ke Dashboard
            </Link>
          ) : (
            <Link
              to="/"
              className={buttonVariants({
                size: "lg",
                className: "h-12 px-6 text-base font-semibold",
              })}
            >
              Kembali ke Beranda
            </Link>
          )}

          <Link
            to="/login"
            className={buttonVariants({
              variant: "outline",
              size: "lg",
              className: "h-12 px-6 text-base font-semibold border-2",
            })}
          >
            Beralih Akun
          </Link>
        </div>
      </main>

      <footer className="max-w-2xl w-full mx-auto text-center py-4 text-sm text-muted-foreground">
        © {new Date().getFullYear()} RehabMotion
      </footer>
    </div>
  )
}
