import { useState, useMemo } from "react"
import { Link, useNavigate } from "react-router-dom"
import {
  Users,
  User,
  LogOut,
  Plus,
  RefreshCw,
  AlertCircle,
  Search,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth, authStore } from "@/features/auth/stores/auth-store"
import { useClinicianPatients } from "@/features/patient/hooks/use-patient-data"
import { PatientCard } from "@/features/patient/components/patient-card"

export default function ClinicianDashboardPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { data: patients = [], isLoading, isError, refetch } = useClinicianPatients()
  const [searchQuery, setSearchQuery] = useState("")
  const [complianceFilter, setComplianceFilter] = useState<"all" | "attention" | "compliant">("all")
  const [showAddPatientModal, setShowAddPatientModal] = useState(false)
  const [copiedEmail, setCopiedEmail] = useState(false)

  const handleCopyEmail = () => {
    if (user?.email) {
      navigator.clipboard.writeText(user.email)
      setCopiedEmail(true)
      setTimeout(() => setCopiedEmail(false), 3000)
    }
  }

  const handleLogout = () => {
    authStore.clearAuth()
    navigate("/login")
  }

  // Ringkasan metrik kepatuhan
  const metrics = useMemo(() => {
    const total = patients.length
    let compliant = 0
    let attention = 0

    patients.forEach((p) => {
      const rate = p.compliance_rate !== undefined ? (p.compliance_rate <= 1 ? p.compliance_rate * 100 : p.compliance_rate) : null
      const status = p.compliance_status?.toLowerCase() || ""

      if ((rate !== null && rate >= 80) || status.includes("good") || status.includes("high") || status.includes("patuh")) {
        compliant++
      } else if ((rate !== null && rate < 50) || status.includes("poor") || status.includes("low") || status.includes("rendah") || !p.last_session_at) {
        attention++
      }
    })

    return { total, compliant, attention }
  }, [patients])

  // Filter pencarian dan kepatuhan
  const filteredPatients = useMemo(() => {
    return patients.filter((patient) => {
      const matchesSearch =
        patient.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (patient.email && patient.email.toLowerCase().includes(searchQuery.toLowerCase()))

      if (!matchesSearch) return false

      if (complianceFilter === "all") return true

      const rate = patient.compliance_rate !== undefined ? (patient.compliance_rate <= 1 ? patient.compliance_rate * 100 : patient.compliance_rate) : null
      const status = patient.compliance_status?.toLowerCase() || ""

      if (complianceFilter === "compliant") {
        return (rate !== null && rate >= 80) || status.includes("good") || status.includes("high") || status.includes("patuh")
      }

      if (complianceFilter === "attention") {
        return (rate !== null && rate < 50) || status.includes("poor") || status.includes("low") || status.includes("rendah") || !patient.last_session_at
      }

      return true
    })
  }, [patients, searchQuery, complianceFilter])

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between p-4 sm:p-6 md:p-10">
      {/* Top Navbar */}
      <header className="max-w-6xl w-full mx-auto flex items-center justify-between pb-6 border-b border-border">
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
      <main className="max-w-6xl w-full mx-auto my-8 space-y-10">
        {/* Header Section: Sapaan Klinisi & Tombol Utama "+ Pasien Baru" */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-2">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-muted text-foreground border border-border">
                Portal Fisioterapis & Klinisi
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
              Halo, {user?.full_name || "Fisioterapis"}!
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-2xl">
              Pantau kepatuhan repetisi harian, progres sudut gerak sendi (ROM), dan riwayat latihan dari pasien fisioterapi pasca-stroke Anda.
            </p>
          </div>

          {/* Tombol Utama "+ Pasien Baru" */}
          <div className="shrink-0">
            <Button
              onClick={() => setShowAddPatientModal(true)}
              size="lg"
              className="cursor-pointer font-bold gap-2 bg-primary text-primary-foreground hover:bg-primary/90 h-12 px-6 rounded-xl shadow-xs transition-all"
            >
              <Plus className="size-5 shrink-0" />
              <span>+ Pasien Baru</span>
            </Button>
          </div>
        </div>

        {/* Metrik Ringkas Kepatuhan (WCAG compliant 2 distinct color values) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="rounded-2xl border-2 border-border bg-card p-5 space-y-2">
            <span className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
              <Users className="size-4 text-muted-foreground" />
              Total Pasien Aktif
            </span>
            <p className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
              {isLoading ? "-" : metrics.total}
            </p>
          </div>

          <div className="rounded-2xl border-2 border-border bg-card p-5 space-y-2">
            <span className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="size-4 text-success" />
              Kepatuhan Tinggi (≥ 80%)
            </span>
            <p className="text-3xl sm:text-4xl font-extrabold text-primary tracking-tight">
              {isLoading ? "-" : metrics.compliant}
            </p>
          </div>

          <div className="rounded-2xl border-2 border-border bg-card p-5 space-y-2">
            <span className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="size-4 text-danger" />
              Perlu Perhatian / Pantauan
            </span>
            <p className="text-3xl sm:text-4xl font-extrabold text-danger tracking-tight">
              {isLoading ? "-" : metrics.attention}
            </p>
          </div>
        </div>

        {/* Section Daftar Pasien & Filter */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <Users className="size-6 text-foreground" />
              <h2 className="text-2xl font-bold text-foreground">
                Daftar Pasien Fisioterapi
              </h2>
              {!isLoading && !isError && (
                <span className="text-sm font-semibold px-2.5 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                  {filteredPatients.length} dari {patients.length} Pasien
                </span>
              )}
            </div>

            {/* Kontrol Pencarian & Filter Tab */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative min-w-[220px]">
                <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <Input
                  type="text"
                  placeholder="Cari nama pasien..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-sm rounded-lg"
                />
              </div>

              <div className="flex items-center rounded-lg border border-border bg-muted p-1 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setComplianceFilter("all")}
                  className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                    complianceFilter === "all"
                      ? "bg-card text-foreground shadow-xs font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Semua
                </button>
                <button
                  type="button"
                  onClick={() => setComplianceFilter("compliant")}
                  className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                    complianceFilter === "compliant"
                      ? "bg-card text-foreground shadow-xs font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Patuh
                </button>
                <button
                  type="button"
                  onClick={() => setComplianceFilter("attention")}
                  className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                    complianceFilter === "attention"
                      ? "bg-card text-foreground shadow-xs font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Perlu Perhatian
                </button>
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
          </div>

          {/* Kondisi Loading */}
          {isLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2, 3, 4].map((i) => (
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
                  Gagal Memuat Daftar Pasien Klinis
                </h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  Terjadi kendala saat menyambung ke server. Pastikan server backend aktif atau coba muat ulang data.
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
            <div className="border-2 border-border bg-card rounded-2xl p-8 sm:p-12 text-center space-y-5">
              <div className="mx-auto size-14 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                <Users className="size-7" />
              </div>
              <div className="space-y-2 max-w-md mx-auto">
                <h3 className="text-xl font-bold text-foreground">
                  Belum Ada Pasien Terhubung
                </h3>
                <p className="text-base text-muted-foreground leading-relaxed">
                  Anda belum memiliki pasien yang terhubung ke daftar klinis Anda. Tekan tombol di bawah untuk menautkan pasien baru melalui izin akses.
                </p>
              </div>
              <div className="pt-2">
                <Button
                  onClick={() => setShowAddPatientModal(true)}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold gap-2 cursor-pointer"
                >
                  <Plus className="size-4" />
                  <span>Tambah Pasien Baru</span>
                </Button>
              </div>
            </div>
          )}

          {/* Tidak ada hasil pencarian / filter */}
          {!isLoading && !isError && patients.length > 0 && filteredPatients.length === 0 && (
            <div className="border-2 border-dashed border-border rounded-2xl p-8 text-center space-y-3">
              <p className="text-base text-muted-foreground">
                Tidak ada pasien yang cocok dengan kriteria pencarian &quot;{searchQuery}&quot; atau filter kepatuhan saat ini.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery("")
                  setComplianceFilter("all")
                }}
                className="cursor-pointer"
              >
                Reset Filter
              </Button>
            </div>
          )}

          {/* Grid Kartu Pasien dengan Badge Kepatuhan */}
          {!isLoading && !isError && filteredPatients.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredPatients.map((patient) => (
                <PatientCard
                  key={patient.id}
                  patient={patient}
                  showCompliance={true}
                  detailUrl={`/patients/${patient.id}`}
                  actionLabel="Kelola Profil & Terapi →"
                />
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="max-w-6xl w-full mx-auto text-center py-6 text-sm text-muted-foreground border-t border-border">
        © {new Date().getFullYear()} RehabMotion — Portal Klinisi & Fisioterapi Pasca-Stroke
      </footer>

      {/* Modal Panduan Hubungkan Pasien Baru */}
      {showAddPatientModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border-2 border-border rounded-2xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-xl animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                  <Users className="size-5 text-primary" />
                  Hubungkan Pasien Baru
                </h3>
                <p className="text-sm text-muted-foreground">
                  Panduan menghubungkan pasien fisioterapi ke daftar klinis Anda.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddPatientModal(false)}
                className="text-muted-foreground hover:text-foreground text-lg font-bold p-1 rounded-md cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-sm text-foreground/90 bg-muted/40 p-4 rounded-xl border border-border">
              <p className="font-semibold text-foreground">
                Sesuai prinsip privasi medis, pasien harus memberikan izin akses langsung dari akun mereka:
              </p>
              <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                <li>
                  Berikan alamat email akun Fisioterapis Anda kepada pasien.
                </li>
                <li>
                  Pasien masuk ke aplikasi dan membuka menu <strong className="text-foreground">Pengaturan Akun</strong>.
                </li>
                <li>
                  Pada bagian <strong className="text-foreground">Daftar Pendamping & Fisioterapis</strong>, pasien memasukkan email Anda dan memilih role <strong className="text-foreground">Fisioterapis / Dokter</strong>.
                </li>
                <li>
                  Setelah disimpan oleh pasien, nama dan rekam medis pasien akan langsung otomatis muncul di dashboard ini.
                </li>
              </ol>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground">
                Alamat Email Fisioterapis Anda:
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={user?.email || ""}
                  className="font-mono text-sm bg-muted"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCopyEmail}
                  className="cursor-pointer gap-1.5 shrink-0"
                >
                  {copiedEmail ? (
                    <>
                      <CheckCircle2 className="size-4 text-success" />
                      <span>Tersalin!</span>
                    </>
                  ) : (
                    <span>Salin Email</span>
                  )}
                </Button>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                type="button"
                onClick={() => setShowAddPatientModal(false)}
                className="cursor-pointer font-bold px-6 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Mengerti
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
