import { authStore } from "@/features/auth/stores/auth-store"
import { api } from "@/lib/api-client"
import type { RomTrendPoint } from "@/types/analytics"

export async function fetchRomTrend(patientId: number | string): Promise<RomTrendPoint[]> {
  return api.get<RomTrendPoint[]>(`/patients/${Number(patientId)}/analytics/rom-trend`)
}

export async function downloadSessionReportPdf(
  patientId: number | string,
  startDate?: string,
  endDate?: string
): Promise<void> {
  const parsedId = Number(patientId)
  if (!patientId || isNaN(parsedId) || parsedId <= 0) {
    throw new Error("ID Pasien tidak valid untuk mengunduh laporan.")
  }

  const token = authStore.getAccessToken()
  const rawBaseUrl = import.meta.env.VITE_API_BASE_URL || "/api/v1"
  const baseUrl = rawBaseUrl.replace(/\/+$/, "")

  const queryParams = new URLSearchParams()
  if (token) {
    queryParams.set("token", token)
  }
  if (startDate) {
    queryParams.set("start_date", startDate)
  }
  if (endDate) {
    queryParams.set("end_date", endDate)
  }
  const queryString = queryParams.toString() ? `?${queryParams.toString()}` : ""
  const url = `${baseUrl}/patients/${parsedId}/reports/sessions.pdf${queryString}`

  const headers: Record<string, string> = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }

  const response = await fetch(url, { method: "GET", headers })
  if (!response.ok) {
    let errorDetail = `Status ${response.status}`
    try {
      const errorJson = await response.json()
      if (errorJson && typeof errorJson === "object" && "detail" in errorJson) {
        errorDetail = String((errorJson as { detail: unknown }).detail)
      }
    } catch {
      // Abaikan jika bukan JSON
    }
    throw new Error(`Gagal mengunduh laporan PDF: ${errorDetail}`)
  }

  const blob = await response.blob()

  // Ambil nama file dari header jika dikirim server
  let filename = `rehabmotion-laporan-pasien-${parsedId}.pdf`
  const disposition = response.headers.get("content-disposition")
  if (disposition && disposition.includes("filename=")) {
    const filenameMatch = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/)
    if (filenameMatch && filenameMatch[1]) {
      filename = filenameMatch[1].replace(/['"]/g, "")
    }
  }

  const downloadUrl = window.URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.style.display = "none"
  a.href = downloadUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()

  // Berikan waktu tunda sebelum revoke agar browser download thread dapat memproses file sepenuhnya
  setTimeout(() => {
    try {
      if (document.body.contains(a)) {
        document.body.removeChild(a)
      }
      window.URL.revokeObjectURL(downloadUrl)
    } catch {
      // Abaikan error cleanup
    }
  }, 10000)
}

