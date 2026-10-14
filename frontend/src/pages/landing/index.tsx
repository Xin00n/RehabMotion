import { Link } from "react-router-dom"
import { ArrowRight, Activity, Volume2, ShieldCheck, AlertCircle } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between selection:bg-foreground selection:text-background">
      {/* Top Navigation */}
      <header className="border-b border-border/80 sticky top-0 bg-background/95 backdrop-blur-xs z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link
            to="/"
            className="text-2xl font-bold tracking-tight text-foreground hover:opacity-85 transition-opacity"
          >
            RehabMotion
          </Link>
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className={buttonVariants({ variant: "ghost", size: "lg", className: "text-base font-semibold" })}
            >
              Masuk
            </Link>
            <Link
              to="/register"
              className={buttonVariants({ size: "lg", className: "text-base font-semibold" })}
            >
              Daftar
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {/* Hero Section */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 pt-16 pb-20 sm:pt-24 sm:pb-28">
          <div className="max-w-3xl space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-muted/50 text-sm font-medium text-foreground">
              <span>Program Fisioterapi Mandiri Pasca-Stroke</span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-foreground leading-[1.15]">
              RehabMotion
            </h1>

            <p className="text-xl sm:text-2xl font-medium text-muted-foreground leading-relaxed">
              Panduan Fisioterapi Pasca-Stroke Berbasis AI Skeleton & Real-Time Audio Feedback
            </p>

            <p className="text-lg text-foreground/80 leading-relaxed max-w-2xl">
              Bantu pemulihan motorik Anda dari rumah dengan bimbingan gerakan terstruktur,
              umpan balik seketika, dan rasa aman tanpa perlu khawatir salah posisi.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4 sm:items-center">
              <Link
                to="/register"
                className={buttonVariants({
                  size: "lg",
                  className: "h-14 px-8 text-lg font-semibold cursor-pointer",
                })}
              >
                Mulai Sekarang
                <ArrowRight className="size-5 ml-2" />
              </Link>

              <Link
                to="/login"
                className={buttonVariants({
                  variant: "outline",
                  size: "lg",
                  className: "h-14 px-8 text-lg font-semibold border-2 cursor-pointer",
                })}
              >
                Masuk ke Akun
              </Link>
            </div>
          </div>
        </section>

        {/* Section 3 Manfaat Inti */}
        <section className="border-t border-border bg-muted/20 py-20">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <div className="mb-14">
              <h2 className="text-3xl font-bold tracking-tight text-foreground">
                Tiga Manfaat Utama untuk Kenyamanan Latihan Anda
              </h2>
              <p className="text-lg text-muted-foreground mt-2">
                Dirancang khusus untuk mendukung kemandirian pasien dan ketenangan keluarga pendamping.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Manfaat 1 */}
              <div className="border-2 border-border bg-card p-6 sm:p-8 rounded-xl flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="p-3 bg-muted rounded-lg w-fit text-foreground">
                    <Activity className="size-6 stroke-[2.2]" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground">
                    Deteksi Gerakan Real-Time
                  </h3>
                  <p className="text-base text-muted-foreground leading-relaxed">
                    Kamera memantau posisi sendi dan kelurusan postur saat Anda bergerak,
                    membantu memastikan setiap repetisi latihan dilakukan dengan aman dan tepat.
                  </p>
                </div>
              </div>

              {/* Manfaat 2 */}
              <div className="border-2 border-border bg-card p-6 sm:p-8 rounded-xl flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="p-3 bg-muted rounded-lg w-fit text-foreground">
                    <Volume2 className="size-6 stroke-[2.2]" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground">
                    Panduan & Feedback Suara
                  </h3>
                  <p className="text-base text-muted-foreground leading-relaxed">
                    Instruksi suara langsung membimbing Anda jika gerakan perlu ditinggikan
                    atau diperlambat, sehingga Anda tidak perlu memaksakan mata menatap layar.
                  </p>
                </div>
              </div>

              {/* Manfaat 3 */}
              <div className="border-2 border-border bg-card p-6 sm:p-8 rounded-xl flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="p-3 bg-muted rounded-lg w-fit text-foreground">
                    <ShieldCheck className="size-6 stroke-[2.2]" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground">
                    Privasi Terjaga Sepenuhnya
                  </h3>
                  <p className="text-base text-muted-foreground leading-relaxed">
                    Seluruh analisis gerakan berjalan langsung di perangkat Anda. Video rekaman
                    kamera tidak pernah dikirim, disimpan, atau diunggah ke server mana pun.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section Disclaimer Medis */}
        <section className="py-16 max-w-5xl mx-auto px-4 sm:px-6">
          <div className="border-2 border-border bg-card rounded-xl p-6 sm:p-8 flex items-start gap-4">
            <AlertCircle className="size-7 text-muted-foreground shrink-0 mt-0.5" />
            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-foreground uppercase tracking-wider">
                Catatan Medis Penting
              </h3>
              <p className="text-base sm:text-lg text-foreground/90 font-medium leading-relaxed">
                RehabMotion adalah alat bantu kepatuhan latihan, bukan pengganti pemeriksaan klinis dokter/fisioterapis.
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed pt-1">
                Selalu konsultasikan rencana pemulihan gerak Anda dengan tenaga medis profesional sebelum melakukan variasi latihan baru.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8 bg-background">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-base font-semibold text-foreground">RehabMotion</p>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} RehabMotion. Hak cipta dilindungi undang-undang.
          </p>
        </div>
      </footer>
    </div>
  )
}
