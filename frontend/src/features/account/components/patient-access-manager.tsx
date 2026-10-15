import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { Plus, Trash2, CheckCircle2, AlertCircle, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/features/auth/stores/auth-store"
import { usePatientAccessList } from "@/features/patient/hooks/use-patient-data"
import { grantCaregiverAccess, revokeCaregiverAccess } from "@/features/patient/api/patient-api"

export function PatientAccessManager() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const patientId = user?.id

  const { data: accessList = [], isLoading } = usePatientAccessList(patientId)

  const [email, setEmail] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const [revokingId, setRevokingId] = useState<number | null>(null)

  if (user?.role !== "patient") {
    return null
  }

  const handleGrantAccess = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!patientId || !email.trim()) return

    setIsSubmitting(true)
    setSuccessMsg(null)
    setErrorMsg(null)

    try {
      await grantCaregiverAccess({
        patient_id: patientId,
        email: email.trim().toLowerCase(),
        access_role: "clinician",
      })
      await queryClient.invalidateQueries({
        queryKey: ["patients", patientId, "access"],
      })
      setEmail("")
      setSuccessMsg("Izin akses untuk fisioterapis/dokter berhasil diberikan.")
      setTimeout(() => setSuccessMsg(null), 5000)
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal memberikan izin akses."
      setErrorMsg(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRevoke = async (accessId: number) => {
    if (!patientId) return
    const confirmed = window.confirm("Apakah Anda yakin ingin mencabut izin akses untuk dokter ini?")
    if (!confirmed) return

    setRevokingId(accessId)
    try {
      await revokeCaregiverAccess(patientId, accessId)
      await queryClient.invalidateQueries({
        queryKey: ["patients", patientId, "access"],
      })
    } catch {
      alert("Gagal mencabut izin akses.")
    } finally {
      setRevokingId(null)
    }
  }

  return (
    <div className="space-y-6">
      {successMsg && (
        <div className="p-4 rounded-xl border border-success/30 bg-success/10 text-success text-sm font-semibold flex items-center gap-2.5">
          <CheckCircle2 className="size-5 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl border border-destructive bg-destructive/10 text-destructive text-sm font-semibold flex items-center gap-2.5">
          <AlertCircle className="size-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Form Tambah Izin Akses */}
      <form onSubmit={handleGrantAccess} className="p-5 rounded-xl border-2 border-border bg-muted/30 space-y-4">
        <h3 className="text-base font-bold text-foreground flex items-center gap-2">
          <Plus className="size-4" />
          <span>Hubungkan Fisioterapis / Dokter Baru</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
          <div className="sm:col-span-9 space-y-1.5">
            <Label htmlFor="access_email" className="text-xs font-bold text-foreground">
              Alamat Email Fisioterapis / Dokter
            </Label>
            <Input
              id="access_email"
              type="email"
              required
              placeholder="Contoh: dokter@rehabmotion.id"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-10 text-sm"
            />
          </div>

          <div className="sm:col-span-3">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-10 font-bold cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : "Hubungkan Dokter"}
            </Button>
          </div>
        </div>
      </form>

      {/* Daftar Akun Terhubung */}
      <div className="space-y-3">
        <h3 className="text-base font-bold text-foreground">
          Daftar Fisioterapis & Dokter Terhubung
        </h3>

        {isLoading ? (
          <div className="py-6 text-center text-muted-foreground animate-pulse text-sm">
            Memuat daftar akses...
          </div>
        ) : accessList.length === 0 ? (
          <div className="border-2 border-dashed border-border rounded-xl p-6 text-center text-sm text-muted-foreground">
            Belum ada akun fisioterapis atau dokter yang terhubung dengan akun Anda.
          </div>
        ) : (
          <div className="divide-y divide-border border-2 border-border rounded-xl overflow-hidden bg-card">
            {accessList.map((access) => {
              return (
                <div
                  key={access.id}
                  className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-foreground">
                        {access.full_name || access.email}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-primary/10 border border-primary/20 text-primary">
                        Fisioterapis / Dokter
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground font-mono">
                      {access.email}
                    </p>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={revokingId === access.id}
                    onClick={() => handleRevoke(access.id)}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30 cursor-pointer text-xs h-8"
                  >
                    {revokingId === access.id ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <>
                        <Trash2 className="size-3.5 mr-1" />
                        <span>Cabut Akses</span>
                      </>
                    )}
                  </Button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
