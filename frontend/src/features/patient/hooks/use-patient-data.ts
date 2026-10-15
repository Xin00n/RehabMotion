import { useQuery } from "@tanstack/react-query"
import { useAuth } from "@/features/auth/stores/auth-store"
import {
  fetchPatientPrescriptions,
  fetchPatientSessions,
  fetchCaregiverPatients,
  fetchPatientProfile,
  fetchPatientAccessList,
} from "@/features/patient/api/patient-api"
import type {
  Patient,
  PatientProfile,
  Prescription,
  Session,
  CaregiverAccess,
} from "@/types/patient"

export function usePatientPrescriptions(
  activeOnly = true,
  explicitPatientId?: number | string
) {
  const { user } = useAuth()
  const patientId =
    explicitPatientId !== undefined && explicitPatientId !== null
      ? explicitPatientId
      : user?.id

  return useQuery<Prescription[], Error>({
    queryKey: ["patients", patientId, "prescriptions", { activeOnly }],
    queryFn: () => {
      if (!patientId || isNaN(Number(patientId))) return Promise.resolve([])
      return fetchPatientPrescriptions(patientId, activeOnly)
    },
    enabled: Boolean(patientId && !isNaN(Number(patientId))),
  })
}

export function usePatientSessions(explicitPatientId?: number | string) {
  const { user } = useAuth()
  const patientId = explicitPatientId !== undefined ? explicitPatientId : user?.id

  return useQuery<Session[], Error>({
    queryKey: ["patients", patientId, "sessions"],
    queryFn: () => {
      if (patientId === undefined || patientId === null) return Promise.resolve([])
      return fetchPatientSessions(patientId)
    },
    enabled: patientId !== undefined && patientId !== null,
  })
}

export function getSessionDate(s?: Partial<Session> | null): string {
  if (!s) return ""
  return s.completed_at || s.ended_at || s.started_at || s.created_at || ""
}

export function getSessionReps(s?: Partial<Session> | null): number {
  if (!s) return 0
  return s.repetitions_completed ?? s.successful_repetitions ?? s.total_repetitions ?? 0
}

export function isDateInCurrentWeek(dateInput?: string | Date | null): boolean {
  if (!dateInput) return false
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput
  if (isNaN(date.getTime())) return false

  const now = new Date()
  const currentDay = now.getDay() // 0 (Sun) to 6 (Sat)
  const distanceToMonday = currentDay === 0 ? 6 : currentDay - 1

  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - distanceToMonday)
  startOfWeek.setHours(0, 0, 0, 0)

  const endOfWeek = new Date(startOfWeek)
  endOfWeek.setDate(startOfWeek.getDate() + 7)

  return date >= startOfWeek && date < endOfWeek
}

export function usePatientDashboardData() {
  const prescriptionsQuery = usePatientPrescriptions(true)
  const sessionsQuery = usePatientSessions()

  const prescriptions = prescriptionsQuery.data || []
  const sessions = sessionsQuery.data || []

  // Sesi terakhir diurutkan berdasarkan tanggal terbaru
  const sortedSessions = [...sessions].sort((a, b) => {
    const timeA = new Date(getSessionDate(b)).getTime() || 0
    const timeB = new Date(getSessionDate(a)).getTime() || 0
    return timeA - timeB
  })

  const latestSession: Session | null = sortedSessions[0] || null

  // Total sesi minggu ini
  const sessionsThisWeekCount = sessions.filter((s) => {
    const dateStr = getSessionDate(s)
    return isDateInCurrentWeek(dateStr)
  }).length

  return {
    isLoading: prescriptionsQuery.isLoading || sessionsQuery.isLoading,
    isError: prescriptionsQuery.isError || sessionsQuery.isError,
    activePrescriptionsCount: prescriptions.length,
    latestSession,
    sessionsThisWeekCount,
    prescriptions,
    refetch: () => {
      prescriptionsQuery.refetch()
      sessionsQuery.refetch()
    },
  }
}

export function useClinicianPatients() {
  const { user } = useAuth()
  const isClinician = user?.role === "clinician"

  return useQuery<Patient[], Error>({
    queryKey: ["clinician", "patients"],
    queryFn: () => fetchCaregiverPatients(),
    enabled: Boolean(isClinician),
  })
}

export const useCaregiverPatients = useClinicianPatients

export function usePatientProfile(patientId?: number | string) {
  return useQuery<PatientProfile, Error>({
    queryKey: ["patients", patientId, "profile"],
    queryFn: () => {
      if (patientId === undefined || patientId === null || isNaN(Number(patientId)))
        throw new Error("Patient ID is required")
      return fetchPatientProfile(patientId)
    },
    enabled: Boolean(patientId !== undefined && patientId !== null && !isNaN(Number(patientId))),
  })
}

export function usePatientAccessList(patientId?: number | string) {
  return useQuery<CaregiverAccess[], Error>({
    queryKey: ["patients", patientId, "access"],
    queryFn: () => {
      if (patientId === undefined || patientId === null || isNaN(Number(patientId)))
        return Promise.resolve([])
      return fetchPatientAccessList(patientId)
    },
    enabled: Boolean(patientId !== undefined && patientId !== null && !isNaN(Number(patientId))),
  })
}
