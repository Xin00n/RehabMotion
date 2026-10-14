import { authStore } from "@/features/auth/stores/auth-store"
import { api } from "@/lib/api-client"
import type { RomTrendPoint } from "@/types/analytics"

export async function fetchRomTrend(patientId: string): Promise<RomTrendPoint[]> {
  return api.get<RomTrendPoint[]>(`/patients/${patientId}/analytics/rom-trend`)
}

export async function downloadSessionReportPdf(patientId: string): Promise<void> {
  const token = authStore.getAccessToken()
  const rawBaseUrl = import.meta.env.VITE_API_BASE_URL || "/api/v1"
  const baseUrl = rawBaseUrl.replace(/\/+$/, "")
  const url = `${baseUrl}/patients/${patientId}/reports/sessions.pdf`

  const headers: Record<string, string> = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }

  const response = await fetch(url, { method: "GET", headers })
  if (!response.ok) {
    throw new Error(`Gagal mengunduh laporan PDF (${response.status})`)
  }

  const blob = await response.blob()
  const downloadUrl = window.URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = downloadUrl
  a.download = `laporan-sesi-fisioterapi-${patientId}.pdf`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  window.URL.revokeObjectURL(downloadUrl)
}
