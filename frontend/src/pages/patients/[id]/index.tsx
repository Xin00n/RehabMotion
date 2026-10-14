import { useState } from "react"
import { useParams, Link, useNavigate } from "react-router-dom"
import { useQueryClient } from "@tanstack/react-query"
import {
  ArrowLeft,
  User,
  Activity,
  Shield,
  Plus,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Mail,
  Loader2,
  Trash2,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  usePatientProfile,
  usePatientPrescriptions,
  usePatientAccessList,
} from "@/features/patient/hooks/use-patient-data"
import {
  updatePatientProfile,
  createPatientPrescription,
  grantCaregiverAccess,
  revokeCaregiverAccess,
} from "@/features/patient/api/patient-api"
import type {
  CaregiverAccess,
  CreatePrescriptionDto,
  AffectedSide,
  PatientProfile,
} from "@/types/patient"

type ActiveTab = "profile" | "prescriptions" | "access"

function formatDateIndo(dateStr?: string): string {
  if (!dateStr) return "-"
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

interface PatientProfileFormProps {
  patientId: string
  profile: PatientProfile
}

function PatientProfileForm({ patientId, profile }: PatientProfileFormProps) {
  const queryClient = useQueryClient()
  const [profileForm, setProfileForm] = useState({
    full_name: profile.full_name || "",
    phone: profile.phone || "",
    default_affected_side: (profile.default_affected_side as AffectedSide) || "right",
    notes: profile.notes || "",
  })
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false)
  const [profileSuccessMsg, setProfileSuccessMsg] = useState<string | null>(null)
  const [profileErrorMsg, setProfileErrorMsg] = useState<string | null>(null)

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsUpdatingProfile(true)
    setProfileSuccessMsg(null)
    setProfileErrorMsg(null)

    try {
      await updatePatientProfile(patientId, profileForm)
      await queryClient.invalidateQueries({ queryKey: ["patients", patientId, "profile"] })
      setProfileSuccessMsg("Perubahan profil pasien berhasil disimpan.")
      setTimeout(() => setProfileSuccessMsg(null), 4000)
    } catch {
      setProfileErrorMsg("Gagal menyimpan profil pasien. Pastikan data valid.")
    } finally {
      setIsUpdatingProfile(false)
    }
  }

  return (
    <form onSubmit={handleProfileSubmit} className="space-y-6 max-w-2xl">
      {profileSuccessMsg && (
        <div className="p-4 rounded-xl border border-success/30 bg-success/10 text-success text-sm font-semibold flex items-center gap-2.5">
          <CheckCircle2 className="size-5 shrink-0" />
          <span>{profileSuccessMsg}</span>
        </div>
      )}

      {profileErrorMsg && (
        <div className="p-4 rounded-xl border border-danger/30 bg-danger/10 text-danger text-sm font-semibold flex items-center gap-2.5">
          <AlertCircle className="size-5 shrink-0" />
          <span>{profileErrorMsg}</span>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="full_name" className="text-sm font-bold text-foreground">
          Nama Lengkap Pasien
        </Label>
        <Input
          id="full_name"
          type="text"
          required
          value={profileForm.full_name}
          onChange={(e) =>
            setProfileForm({ ...profileForm, full_name: e.target.value })
          }
          className="h-11"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone" className="text-sm font-bold text-foreground">
          Nomor Telepon / WhatsApp Pasien
        </Label>
        <Input
          id="phone"
          type="tel"
          placeholder="Contoh: 081234567890"
          value={profileForm.phone}
          onChange={(e) =>
            setProfileForm({ ...profileForm, phone: e.target.value })
          }
          className="h-11"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-bold text-foreground block">
          Sisi Tubuh Terdampak Utama (Affected Side)
        </Label>
        <div className="grid grid-cols-3 gap-3">
          {(["left", "right", "both"] as AffectedSide[]).map((side) => (
            <button
              key={side}
              type="button"
              onClick={() =>
                setProfileForm({ ...profileForm, default_affected_side: side })
              }
              className={`h-11 rounded-lg border-2 text-sm font-bold cursor-pointer transition-all ${
                profileForm.default_affected_side === side
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background hover:bg-muted text-foreground"
              }`}
            >
              {side === "left" ? "Sisi Kiri" : side === "right" ? "Sisi Kanan" : "Kedua Sisi"}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes" className="text-sm font-bold text-foreground">
          Catatan Klinis / Rekomendasi Terapi Fisioterapis
        </Label>
        <textarea
          id="notes"
          rows={4}
          value={profileForm.notes}
          onChange={(e) =>
            setProfileForm({ ...profileForm, notes: e.target.value })
          }
          placeholder="Catatan perkembangan motorik, batas toleransi nyeri, atau riwayat hemiparesis..."
          className="w-full rounded-lg border border-border bg-background p-3 text-sm text-foreground outline-none focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary"
        />
      </div>

      <div className="pt-2">
        <Button
          type="submit"
          disabled={isUpdatingProfile}
          className="h-12 px-6 font-bold cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {isUpdatingProfile ? (
            <>
              <Loader2 className="size-4 animate-spin mr-2" />
              Menyimpan Perubahan...
            </>
          ) : (
            "Simpan Perubahan Profil"
          )}
        </Button>
      </div>
    </form>
  )
}

export default function PatientDetailPage() {
  const { id: patientId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [activeTab, setActiveTab] = useState<ActiveTab>("profile")

  // Query Data
  const {
    data: profile,
    isLoading: isLoadingProfile,
    isError: isProfileError,
  } = usePatientProfile(patientId)

  const {
    data: prescriptions = [],
    isLoading: isLoadingPrescriptions,
  } = usePatientPrescriptions(false)

  const {
    data: accessList = [],
    isLoading: isLoadingAccess,
  } = usePatientAccessList(patientId)

  // State Form Resep Baru
  const [showPrescriptionForm, setShowPrescriptionForm] = useState(false)
  const [newPrescription, setNewPrescription] = useState<CreatePrescriptionDto>({
    exercise_name: "Fleksi Siku (Elbow Flexion)",
    affected_side: "right",
    target_rom: 90,
    target_repetitions: 10,
    target_sets: 3,
    notes: "",
  })
  const [isCreatingPrescription, setIsCreatingPrescription] = useState(false)
  const [prescriptionSuccessMsg, setPrescriptionSuccessMsg] = useState<string | null>(null)

  const handlePrescriptionSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!patientId) return

    setIsCreatingPrescription(true)
    try {
      await createPatientPrescription(patientId, newPrescription)
      await queryClient.invalidateQueries({
        queryKey: ["patients", patientId, "prescriptions"],
      })
      setShowPrescriptionForm(false)
      setPrescriptionSuccessMsg("Resep latihan baru berhasil ditambahkan.")
      setTimeout(() => setPrescriptionSuccessMsg(null), 4000)
    } catch {
      alert("Gagal menambahkan resep latihan.")
    } finally {
      setIsCreatingPrescription(false)
    }
  }

  // State Form Beri Akses Caregiver
  const [grantEmail, setGrantEmail] = useState("")
  const [grantNotes, setGrantNotes] = useState("")
  const [isGrantingAccess, setIsGrantingAccess] = useState(false)
  const [grantSuccessMsg, setGrantSuccessMsg] = useState<string | null>(null)

  const handleGrantAccessSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!patientId || !grantEmail) return

    setIsGrantingAccess(true)
    try {
      await grantCaregiverAccess({
        patient_id: Number(patientId),
        email: grantEmail,
        access_role: "caregiver",
        notes: grantNotes,
      })
      await queryClient.invalidateQueries({
        queryKey: ["patients", patientId, "access"],
      })
      setGrantEmail("")
      setGrantNotes("")
      setGrantSuccessMsg("Izin akses pendamping berhasil diberikan.")
      setTimeout(() => setGrantSuccessMsg(null), 4000)
    } catch {
      alert("Gagal memberikan akses pendamping.")
    } finally {
      setIsGrantingAccess(false)
    }
  }

  // State Modal Konfirmasi Sensitif Revoke Akses
  const [accessToRevoke, setAccessToRevoke] = useState<CaregiverAccess | null>(null)
  const [isRevoking, setIsRevoking] = useState(false)

  const handleConfirmRevoke = async () => {
    if (!accessToRevoke || !patientId) return

    setIsRevoking(true)
    try {
      await revokeCaregiverAccess(Number(patientId), accessToRevoke.id)
      await queryClient.invalidateQueries({
        queryKey: ["patients", patientId, "access"],
      })
      setAccessToRevoke(null)
    } catch {
      alert("Gagal mencabut akses pendamping.")
    } finally {
      setIsRevoking(false)
    }
  }

  if (!patientId) {
    return (
      <div className="p-8 text-center">
        <p className="text-danger font-bold">ID Pasien tidak ditemukan.</p>
        <Button onClick={() => navigate("/dashboard/clinician")} className="mt-4">
          Kembali ke Dashboard
        </Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between p-4 sm:p-6 md:p-10">
      {/* Top Header & Breadcrumb Navigation */}
      <header className="max-w-5xl w-full mx-auto flex items-center justify-between pb-6 border-b border-border">
        <div className="flex items-center gap-3">
          <Link
            to="/dashboard/clinician"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted text-sm font-semibold text-foreground transition-colors cursor-pointer"
          >
            <ArrowLeft className="size-4" />
            <span>Kembali ke Daftar Pasien</span>
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to={`/progress?patient_id=${patientId}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted text-sm font-semibold text-foreground transition-colors"
          >
            <Activity className="size-4" />
            <span>Grafik & Riwayat ROM</span>
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-5xl w-full mx-auto my-8 space-y-8">
        {/* Ringkasan Header Pasien */}
        <div className="rounded-2xl border-2 border-border bg-card p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 shadow-xs">
          <div className="flex items-center gap-4 min-w-0">
            <div className="size-16 rounded-2xl bg-muted border border-border flex items-center justify-center shrink-0 text-foreground">
              <User className="size-8" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-muted text-muted-foreground border border-border inline-block mb-1">
                Rekam Medis Pasien
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground truncate tracking-tight">
                {isLoadingProfile ? "Memuat Data Pasien..." : profile?.full_name || "Pasien Fisioterapi"}
              </h1>
              <p className="text-sm text-muted-foreground truncate">
                ID Pasien: <span className="font-mono text-foreground">{patientId}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <span className="px-3 py-1 rounded-md text-xs font-bold bg-muted text-foreground border border-border">
              Sisi: {profile?.default_affected_side === "left" ? "Kiri" : profile?.default_affected_side === "right" ? "Kanan" : "Kedua Sisi"}
            </span>
          </div>
        </div>

        {/* Tab Switcher Navigation */}
        <div className="flex border-b border-border gap-2 sm:gap-4 overflow-x-auto pb-px">
          <button
            type="button"
            onClick={() => setActiveTab("profile")}
            className={`flex items-center gap-2 px-5 py-3 text-base font-bold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === "profile"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <User className="size-4" />
            <span>1. Profil Pasien</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("prescriptions")}
            className={`flex items-center gap-2 px-5 py-3 text-base font-bold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === "prescriptions"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Activity className="size-4" />
            <span>2. Resep Latihan ({prescriptions.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("access")}
            className={`flex items-center gap-2 px-5 py-3 text-base font-bold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === "access"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Shield className="size-4" />
            <span>3. Manajemen Akses ({accessList.length})</span>
          </button>
        </div>

        {/* TAB 1: PROFIL PASIEN */}
        {activeTab === "profile" && (
          <div className="rounded-2xl border-2 border-border bg-card p-6 sm:p-8 space-y-6">
            <div>
              <h2 className="text-xl font-bold text-foreground">
                Informasi & Catatan Klinis Pasien
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Perbarui data identitas pasien dan diagnosa sisi tubuh yang terdampak pasca-stroke.
              </p>
            </div>

            {isLoadingProfile ? (
              <div className="py-8 text-center text-muted-foreground animate-pulse">
                Memuat data profil pasien...
              </div>
            ) : isProfileError || !profile ? (
              <div className="py-8 text-center text-danger font-medium">
                Gagal memuat profil pasien dari endpoint backend.
              </div>
            ) : (
              <PatientProfileForm
                key={profile.id || patientId}
                patientId={patientId}
                profile={profile}
              />
            )}
          </div>
        )}

        {/* TAB 2: RESEP LATIHAN */}
        {activeTab === "prescriptions" && (
          <div className="rounded-2xl border-2 border-border bg-card p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
              <div>
                <h2 className="text-xl font-bold text-foreground">
                  Program Resep Fisioterapi
                </h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Daftar latihan aktif dan target sudut rentang gerak (ROM) yang diresepkan.
                </p>
              </div>

              <Button
                type="button"
                onClick={() => setShowPrescriptionForm(!showPrescriptionForm)}
                className="gap-2 font-bold cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Plus className="size-4" />
                <span>+ Resep Baru</span>
              </Button>
            </div>

            {prescriptionSuccessMsg && (
              <div className="p-4 rounded-xl border border-success/30 bg-success/10 text-success text-sm font-semibold flex items-center gap-2.5">
                <CheckCircle2 className="size-5 shrink-0" />
                <span>{prescriptionSuccessMsg}</span>
              </div>
            )}

            {/* Form Buat Resep Baru (Toggle) */}
            {showPrescriptionForm && (
              <form
                onSubmit={handlePrescriptionSubmit}
                className="p-6 rounded-xl border-2 border-primary/30 bg-muted/30 space-y-5 animate-in fade-in"
              >
                <h3 className="text-lg font-bold text-foreground">
                  Formulir Resep Latihan Baru
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-bold text-foreground">
                      Jenis Gerakan Latihan
                    </Label>
                    <Input
                      type="text"
                      required
                      value={newPrescription.exercise_name}
                      onChange={(e) =>
                        setNewPrescription({ ...newPrescription, exercise_name: e.target.value })
                      }
                      placeholder="Contoh: Fleksi Siku, Abduksi Bahu"
                      className="h-10"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-bold text-foreground">
                      Sisi Tubuh yang Dilatih
                    </Label>
                    <select
                      value={newPrescription.affected_side}
                      onChange={(e) =>
                        setNewPrescription({ ...newPrescription, affected_side: e.target.value as AffectedSide })
                      }
                      className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none"
                    >
                      <option value="right">Sisi Kanan</option>
                      <option value="left">Sisi Kiri</option>
                      <option value="both">Kedua Sisi</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-bold text-foreground">
                      Target Sudut (ROM Derajat)
                    </Label>
                    <Input
                      type="number"
                      required
                      min={10}
                      max={180}
                      value={newPrescription.target_rom}
                      onChange={(e) =>
                        setNewPrescription({ ...newPrescription, target_rom: Number(e.target.value) })
                      }
                      className="h-10"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-bold text-foreground">
                      Target Repetisi per Sesi
                    </Label>
                    <Input
                      type="number"
                      required
                      min={1}
                      max={50}
                      value={newPrescription.target_repetitions}
                      onChange={(e) =>
                        setNewPrescription({
                          ...newPrescription,
                          target_repetitions: Number(e.target.value),
                        })
                      }
                      className="h-10"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <Button
                    type="submit"
                    disabled={isCreatingPrescription}
                    className="font-bold cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    {isCreatingPrescription ? "Menyimpan Resep..." : "Simpan Resep Latihan"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowPrescriptionForm(false)}
                    className="cursor-pointer"
                  >
                    Batal
                  </Button>
                </div>
              </form>
            )}

            {/* List Resep Aktif */}
            {isLoadingPrescriptions ? (
              <div className="py-8 text-center text-muted-foreground animate-pulse">
                Memuat daftar resep latihan...
              </div>
            ) : prescriptions.length === 0 ? (
              <div className="border-2 border-dashed border-border rounded-xl p-8 text-center space-y-3">
                <p className="text-base text-muted-foreground">
                  Belum ada resep latihan yang aktif untuk pasien ini.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPrescriptionForm(true)}
                  className="cursor-pointer"
                >
                  Buat Resep Pertama
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {prescriptions.map((p) => (
                  <div
                    key={p.id}
                    className="p-5 rounded-xl border-2 border-border bg-background space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-bold text-lg text-foreground">
                        {p.exercise?.name || p.exercise_name || "Latihan Fisioterapi"}
                      </h4>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-muted text-foreground border border-border">
                        {p.affected_side === "left" ? "Sisi Kiri" : p.affected_side === "right" ? "Sisi Kanan" : "Kedua Sisi"}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm pt-2 border-t border-border">
                      <div>
                        <span className="text-xs text-muted-foreground block">Target Sudut ROM</span>
                        <strong className="text-base text-primary">{p.target_rom}°</strong>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground block">Repetisi</span>
                        <strong className="text-base text-foreground">
                          {p.target_repetitions || 10} Reps
                        </strong>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: MANAJEMEN AKSES CAREGIVER */}
        {activeTab === "access" && (
          <div className="rounded-2xl border-2 border-border bg-card p-6 sm:p-8 space-y-8">
            <div>
              <h2 className="text-xl font-bold text-foreground">
                Manajemen Izin Akses Pendamping (Caregiver)
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Kelola daftar akun pendamping yang diizinkan memantau perkembangan dan kepatuhan latihan pasien ini.
              </p>
            </div>

            {grantSuccessMsg && (
              <div className="p-4 rounded-xl border border-success/30 bg-success/10 text-success text-sm font-semibold flex items-center gap-2.5">
                <CheckCircle2 className="size-5 shrink-0" />
                <span>{grantSuccessMsg}</span>
              </div>
            )}

            {/* Form Grant Akses Baru */}
            <form
              onSubmit={handleGrantAccessSubmit}
              className="p-5 sm:p-6 rounded-xl border-2 border-border bg-muted/30 space-y-4"
            >
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <Mail className="size-4" />
                <span>Beri Akses Pendamping Baru</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="grant_email" className="text-xs font-bold text-foreground">
                    Email Akun Pendamping (Caregiver)
                  </Label>
                  <Input
                    id="grant_email"
                    type="email"
                    required
                    placeholder="caregiver@email.com"
                    value={grantEmail}
                    onChange={(e) => setGrantEmail(e.target.value)}
                    className="h-10"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="grant_notes" className="text-xs font-bold text-foreground">
                    Catatan Hubungan (Opsional)
                  </Label>
                  <Input
                    id="grant_notes"
                    type="text"
                    placeholder="Contoh: Anak kandung / Pendamping harian"
                    value={grantNotes}
                    onChange={(e) => setGrantNotes(e.target.value)}
                    className="h-10"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={isGrantingAccess}
                className="font-bold cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90 mt-2"
              >
                {isGrantingAccess ? "Memproses Izin Akses..." : "Beri Izin Akses"}
              </Button>
            </form>

            {/* List Caregiver yang Memiliki Akses */}
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-foreground">
                Daftar Pendamping Terdaftar
              </h3>

              {isLoadingAccess ? (
                <div className="py-6 text-center text-muted-foreground animate-pulse">
                  Memuat daftar akses pendamping...
                </div>
              ) : accessList.length === 0 ? (
                <div className="border-2 border-dashed border-border rounded-xl p-8 text-center text-muted-foreground">
                  Belum ada akun pendamping yang terhubung dengan pasien ini.
                </div>
              ) : (
                <div className="divide-y divide-border border-2 border-border rounded-xl overflow-hidden bg-background">
                  {accessList.map((access) => {
                    const isPending =
                      access.status?.toLowerCase() === "pending" ||
                      access.status?.toLowerCase().includes("revoke")
                    return (
                      <div
                        key={access.id}
                        className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-base text-foreground">
                              {access.caregiver_name || access.caregiver_email}
                            </span>

                            {/* Badge Status: Sesuai aturan, --warning digunakan untuk status pending atau akan direvoke */}
                            {isPending ? (
                              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold border border-warning/40 bg-warning/15 text-warning">
                                {access.status === "pending"
                                  ? "Menunggu Konfirmasi"
                                  : "Akses Akan Dicabut"}
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold border border-success/40 bg-success/15 text-success">
                                Akses Aktif
                              </span>
                            )}
                          </div>

                          <p className="text-sm text-muted-foreground truncate">
                            {access.caregiver_email}
                            {access.notes ? ` • ${access.notes}` : ""}
                          </p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1.5 pt-0.5">
                            <Calendar className="size-3.5" />
                            <span>Diberikan sejak: {formatDateIndo(access.granted_at)}</span>
                          </p>
                        </div>

                        {/* Tombol Revoke: Memicu Modal Konfirmasi Sensitif */}
                        <div className="shrink-0">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setAccessToRevoke(access)}
                            className="cursor-pointer gap-1.5 text-danger border-border hover:bg-danger/10 hover:border-danger/40"
                          >
                            <Trash2 className="size-4" />
                            <span>Cabut Akses</span>
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Modal Konfirmasi Sensitif Sebelum Revoke Akses */}
      {accessToRevoke && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border-2 border-border rounded-2xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-xl animate-in fade-in zoom-in-95">
            <div className="flex items-start gap-4">
              <div className="size-12 rounded-xl bg-danger/10 text-danger flex items-center justify-center shrink-0">
                <AlertTriangle className="size-6 stroke-[2.2]" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-extrabold text-foreground">
                  Konfirmasi Pencabutan Akses
                </h3>
                <p className="text-sm text-muted-foreground">
                  Tindakan sensitif keamanan data medis pasien.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-muted/50 border border-border space-y-2 text-sm text-foreground/90 leading-relaxed">
              <p>
                Apakah Anda yakin ingin mencabut izin akses pendamping untuk:
              </p>
              <div className="p-2.5 rounded-lg bg-background border border-border font-bold text-foreground">
                {accessToRevoke.caregiver_name || accessToRevoke.caregiver_email}
              </div>
              <p className="text-xs text-muted-foreground pt-1">
                Setelah dicabut, pendamping tidak akan lagi memiliki hak akses untuk memantau grafik pemulihan sudut gerak (ROM) dan riwayat sesi pasien ini.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                disabled={isRevoking}
                onClick={() => setAccessToRevoke(null)}
                className="w-full sm:w-auto h-11 text-sm font-semibold cursor-pointer"
              >
                Batalkan
              </Button>

              {/* Tombol Revoke Sensitif: Menggunakan warna --danger khusus untuk aksi ini */}
              <Button
                type="button"
                disabled={isRevoking}
                onClick={handleConfirmRevoke}
                className="w-full sm:w-auto h-11 text-sm font-bold cursor-pointer bg-danger text-primary-foreground hover:bg-danger/90 gap-1.5"
              >
                {isRevoking ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    <span>Mencabut Akses...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="size-4" />
                    <span>Ya, Cabut Akses Sekarang</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="max-w-5xl w-full mx-auto text-center py-6 text-sm text-muted-foreground border-t border-border">
        © {new Date().getFullYear()} RehabMotion — Portal Manajemen Pasien Klinis
      </footer>
    </div>
  )
}
