import { useQuery } from "@tanstack/react-query"
import { fetchRomTrend } from "@/features/analytics/api/analytics-api"
import type { RomTrendPoint } from "@/types/analytics"

export function useRomTrend(patientId?: number | string) {
  return useQuery<RomTrendPoint[], Error>({
    queryKey: ["patients", patientId, "analytics", "rom-trend"],
    queryFn: () => {
      if (patientId === undefined || patientId === null) return Promise.resolve([])
      return fetchRomTrend(patientId)
    },
    enabled: patientId !== undefined && patientId !== null,
  })
}
