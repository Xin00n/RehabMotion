import { Link } from "react-router-dom"
import { User, ChevronRight, Activity, Calendar } from "lucide-react"
import type { Patient } from "@/types/patient"

interface PatientCardProps {
  patient: Patient
  onClick?: () => void
  actionLabel?: string
  showCompliance?: boolean
  detailUrl?: string
}

function formatAffectedSide(side?: string): string {
  if (!side) return "Belum Ditentukan"
  switch (side.toLowerCase()) {
    case "left":
      return "Sisi Kiri"
    case "right":
      return "Sisi Kanan"
    case "both":
      return "Kedua Sisi"
    default:
      return side
  }
}

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

interface ComplianceInfo {
  label: string
  colorClasses: string
}

function getComplianceDetails(patient: Patient): ComplianceInfo | null {
  if (patient.compliance_rate !== undefined) {
    const rate =
      patient.compliance_rate <= 1
        ? Math.round(patient.compliance_rate * 100)
        : Math.round(patient.compliance_rate)
    if (rate >= 80) {
      return {
        label: `Kepatuhan ${rate}%`,
        colorClasses: "bg-success/15 text-success border-success/30",
      }
    }
    if (rate >= 50) {
      return {
        label: `Kepatuhan ${rate}%`,
        colorClasses: "bg-warning/15 text-warning border-warning/30",
      }
    }
    return {
      label: `Perhatian (${rate}%)`,
      colorClasses: "bg-danger/15 text-danger border-danger/30",
    }
  }

  if (patient.compliance_status) {
    const s = patient.compliance_status.toLowerCase()
    if (s.includes("good") || s.includes("high") || s.includes("patuh")) {
      return {
        label: "Kepatuhan Tinggi",
        colorClasses: "bg-success/15 text-success border-success/30",
      }
    }
    if (s.includes("mod") || s.includes("med") || s.includes("cukup") || s.includes("sedang")) {
      return {
        label: "Kepatuhan Sedang",
        colorClasses: "bg-warning/15 text-warning border-warning/30",
      }
    }
    return {
      label: "Perlu Perhatian",
      colorClasses: "bg-danger/15 text-danger border-danger/30",
    }
  }

  return null
}

export function PatientCard({
  patient,
  onClick,
  actionLabel = "Lihat Riwayat & Kemajuan",
  showCompliance = false,
  detailUrl,
}: PatientCardProps) {
  const targetUrl = detailUrl || `/progress?patient_id=${patient.id}`
  const compliance = showCompliance ? getComplianceDetails(patient) : null

  const content = (
    <div className="flex flex-col justify-between h-full p-6 space-y-6">
      {/* Header Kartu: Profil & Nama Pasien (Aksen --primary hanya pada nama) */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="size-12 rounded-xl bg-muted border border-border flex items-center justify-center shrink-0 text-foreground">
            <User className="size-6" />
          </div>
          <div className="min-w-0">
            {/* Aksen Utama: Nama Pasien menggunakan --primary */}
            <h3 className="text-xl font-bold text-primary truncate tracking-tight">
              {patient.full_name}
            </h3>
            {patient.email ? (
              <p className="text-sm text-muted-foreground truncate">{patient.email}</p>
            ) : patient.phone ? (
              <p className="text-sm text-muted-foreground truncate">{patient.phone}</p>
            ) : null}
          </div>
        </div>

        {/* Badges: Sisi Terdampak & Kepatuhan */}
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-muted text-foreground border border-border">
            {formatAffectedSide(patient.default_affected_side)}
          </span>
          {compliance && (
            <span
              className={`px-2.5 py-0.5 rounded-md text-xs font-bold border ${compliance.colorClasses}`}
            >
              {compliance.label}
            </span>
          )}
        </div>
      </div>

      {/* Info Tambahan: Program Latihan & Sesi Terakhir */}
      <div className="grid grid-cols-2 gap-3 pt-4 border-t border-border text-sm">
        <div className="p-3 rounded-lg bg-muted/40 border border-border space-y-1">
          <span className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
            <Activity className="size-3.5 text-muted-foreground" />
            Program Aktif
          </span>
          <p className="text-base font-bold text-foreground">
            {patient.active_prescriptions_count !== undefined
              ? `${patient.active_prescriptions_count} Resep`
              : "Aktif"}
          </p>
        </div>

        <div className="p-3 rounded-lg bg-muted/40 border border-border space-y-1">
          <span className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
            <Calendar className="size-3.5 text-muted-foreground" />
            Sesi Terakhir
          </span>
          <p className="text-base font-bold text-foreground truncate">
            {formatDateIndo(patient.last_session_at)}
          </p>
        </div>
      </div>

      {/* Footer Aksi */}
      <div className="pt-2 flex items-center justify-between text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
        <span>{actionLabel}</span>
        <ChevronRight className="size-4 shrink-0 transition-transform group-hover:translate-x-1" />
      </div>
    </div>
  )

  // Jika disediakan handler onClick kustom
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="w-full text-left rounded-2xl border-2 border-border bg-card hover:border-primary/50 transition-all cursor-pointer group shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {content}
      </button>
    )
  }

  // Standar: Navigasi ke Progress & History
  return (
    <Link
      to={targetUrl}
      className="block w-full text-left rounded-2xl border-2 border-border bg-card hover:border-primary/50 transition-all cursor-pointer group shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {content}
    </Link>
  )
}
