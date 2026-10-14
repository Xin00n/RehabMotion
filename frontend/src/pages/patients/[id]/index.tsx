import { useState } from "react"
import { useParams, Link, useNavigate, Navigate } from "react-router-dom"
import { useQueryClient } from "@tanstack/react-query"
import {
  ArrowLeft,
  User,
  Activity,
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
} from "@/features/patient/hooks/use-patient-data"
import {
  updatePatientProfile,
  createPatientPrescription,
} from "@/features/patient/api/patient-api"
import type {
  CreatePrescriptionDto,
  AffectedSide,
  PatientProfile,
} from "@/types/patient"

export const EXERCISE_OPTIONS = [
  { id: 1, name: "Fleksi Siku (Elbow Flexion)", minRom: 40, maxRom: 135, defaultRom: 90 },
  { id: 2, name: "Abduksi Bahu (Shoulder Abduction)", minRom: 0, maxRom: 90, defaultRom: 80 },
  { id: 3, name: "Ekstensi Lutut (Seated Knee Extension)", minRom: 90, maxRom: 160, defaultRom: 120 },
]

type ActiveTab = "profile" | "prescriptions"

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

  if (!patientId || patientId === "grant-access" || isNaN(Number(patientId))) {
    return <Navigate to="/dashboard" replace />
  }

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
  } = usePatientPrescriptions(false, patientId)

  // State Form Resep Baru
  const [showPrescriptionForm, setShowPrescriptionForm] = useState(false)
  const [newPrescription, setNewPrescription] = useState<CreatePrescriptionDto>({
    exercise_id: 1,
    exercise_name: "Fleksi Siku (Elbow Flexion)",
    affected_side: "right",
    target_rom: 90,
    target_rom_deg: 90,
    target_repetitions: 10,
    target_sets: 3,
    notes: "",
  })
  const [isCreatingPrescription, setIsCreatingPrescription] = useState(false)
  const [prescriptionSuccessMsg, setPrescriptionSuccessMsg] = useState<string | null>(null)
  const [prescriptionErrorMsg, setPrescriptionErrorMsg] = useState<string | null>(null)

  const handlePrescriptionSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!patientId || isNaN(Number(patientId))) return

    setIsCreatingPrescription(true)
    setPrescriptionSuccessMsg(null)
    setPrescriptionErrorMsg(null)

    try {
      const selectedEx =
        EXERCISE_OPTIONS.find((ex) => ex.id === (newPrescription.exercise_id || 1)) ||
        EXERCISE_OPTIONS[0]

      await createPatientPrescription(patientId, {
        exercise_id: selectedEx.id,
        exercise_name: selectedEx.name,
        affected_side: newPrescription.affected_side,
        target_rom: Number(newPrescription.target_rom),
        target_rom_deg: Number(newPrescription.target_rom),
        target_repetitions: Number(newPrescription.target_repetitions),
        target_sets: Number(newPrescription.target_sets || 3),
        notes: newPrescription.notes || "",
      })
      await queryClient.invalidateQueries({
        queryKey: ["patients", patientId, "prescriptions"],
      })
      setShowPrescriptionForm(false)
      setPrescriptionSuccessMsg("Resep latihan baru berhasil ditambahkan.")
      setTimeout(() => setPrescriptionSuccessMsg(null), 4000)
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal menambahkan resep latihan."
      setPrescriptionErrorMsg(msg)
    } finally {
      setIsCreatingPrescription(false)
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

            {prescriptionErrorMsg && (
              <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-sm font-semibold flex items-center gap-2.5">
                <AlertCircle className="size-5 shrink-0" />
                <span>{prescriptionErrorMsg}</span>
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
                    <select
                      value={newPrescription.exercise_id || 1}
                      onChange={(e) => {
                        const selectedId = Number(e.target.value)
                        const selectedEx =
                          EXERCISE_OPTIONS.find((ex) => ex.id === selectedId) ||
                          EXERCISE_OPTIONS[0]
                        setNewPrescription({
                          ...newPrescription,
                          exercise_id: selectedEx.id,
                          exercise_name: selectedEx.name,
                          target_rom: selectedEx.defaultRom,
                          target_rom_deg: selectedEx.defaultRom,
                        })
                      }}
                      className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none"
                    >
                      {EXERCISE_OPTIONS.map((ex) => (
                        <option key={ex.id} value={ex.id}>
                          {ex.name} (Rentang: {ex.minRom}° – {ex.maxRom}°)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-bold text-foreground">
                      Sisi Tubuh yang Dilatih
                    </Label>
                    <select
                      value={newPrescription.affected_side}
                      onChange={(e) =>
                        setNewPrescription({
                          ...newPrescription,
                          affected_side: e.target.value as AffectedSide,
                        })
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
                      min={
                        EXERCISE_OPTIONS.find(
                          (ex) => ex.id === (newPrescription.exercise_id || 1)
                        )?.minRom || 0
                      }
                      max={
                        EXERCISE_OPTIONS.find(
                          (ex) => ex.id === (newPrescription.exercise_id || 1)
                        )?.maxRom || 180
                      }
                      value={newPrescription.target_rom}
                      onChange={(e) =>
                        setNewPrescription({
                          ...newPrescription,
                          target_rom: Number(e.target.value),
                          target_rom_deg: Number(e.target.value),
                        })
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

                <div className="space-y-2">
                  <Label htmlFor="prescription_notes" className="text-sm font-bold text-foreground">
                    Catatan Klinis Latihan (Opsional)
                  </Label>
                  <Input
                    id="prescription_notes"
                    type="text"
                    placeholder="Contoh: Lakukan perlahan, istirahat bila terasa pegal"
                    value={newPrescription.notes || ""}
                    onChange={(e) =>
                      setNewPrescription({
                        ...newPrescription,
                        notes: e.target.value,
                      })
                    }
                    className="h-10"
                  />
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <Button
                    type="submit"
                    disabled={isCreatingPrescription}
                    className="font-bold cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    {isCreatingPrescription ? (
                      <>
                        <Loader2 className="size-4 animate-spin mr-2" />
                        Menyimpan Resep...
                      </>
                    ) : (
                      "Simpan Resep Latihan"
                    )}
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
                        <strong className="text-base text-primary">
                          {(p.target_rom_deg ?? p.target_rom)}°
                        </strong>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground block">Repetisi</span>
                        <strong className="text-base text-foreground">
                          {p.target_repetitions || 10} Reps
                        </strong>
                      </div>
                    </div>
                    {p.notes && (
                      <p className="text-xs text-muted-foreground italic border-t border-border/60 pt-2">
                        {p.notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="max-w-5xl w-full mx-auto text-center py-6 text-sm text-muted-foreground border-t border-border">
        © {new Date().getFullYear()} RehabMotion — Portal Manajemen Pasien Klinis
      </footer>
    </div>
  )
}
