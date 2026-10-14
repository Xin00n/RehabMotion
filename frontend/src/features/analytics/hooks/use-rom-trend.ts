import { useQuery } from "@tanstack/react-query"
import { fetchRomTrend } from "@/features/analytics/api/analytics-api"
import type { RomTrendPoint } from "@/types/analytics"

export function useRomTrend(patientId?: string) {
  return useQuery<RomTrendPoint[], Error>({
    queryKey: ["patients", patientId, "analytics", "rom-trend"],
    queryFn: () => {
      if (!patientId) return Promise.resolve([])
      return fetchRomTrend(patientId)
    },
    enabled: Boolean(patientId),
  })
}
