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

export function usePatientPrescriptions(activeOnly = true) {
  const { user } = useAuth()
  const patientId = user?.id

  return useQuery<Prescription[], Error>({
    queryKey: ["patients", patientId, "prescriptions", { activeOnly }],
    queryFn: () => {
      if (!patientId) return Promise.resolve([])
      return fetchPatientPrescriptions(patientId, activeOnly)
    },
    enabled: Boolean(patientId),
  })
}

export function usePatientSessions(explicitPatientId?: string) {
  const { user } = useAuth()
  const patientId = explicitPatientId || user?.id

  return useQuery<Session[], Error>({
    queryKey: ["patients", patientId, "sessions"],
    queryFn: () => {
      if (!patientId) return Promise.resolve([])
      return fetchPatientSessions(patientId)
    },
    enabled: Boolean(patientId),
  })
}

function isDateInCurrentWeek(dateString: string): boolean {
  const date = new Date(dateString)
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
    const timeA = new Date(b.completed_at || b.created_at).getTime()
    const timeB = new Date(a.completed_at || a.created_at).getTime()
    return timeA - timeB
  })

  const latestSession: Session | null = sortedSessions[0] || null

  // Total sesi minggu ini
  const sessionsThisWeekCount = sessions.filter((s) =>
    isDateInCurrentWeek(s.completed_at || s.created_at)
  ).length

  return {
    isLoading: prescriptionsQuery.isLoading || sessionsQuery.isLoading,
    isError: prescriptionsQuery.isError || sessionsQuery.isError,
    activePrescriptionsCount: prescriptions.length,
    latestSession,
    sessionsThisWeekCount,
    prescriptions,
  }
}

export function useCaregiverPatients() {
  const { user } = useAuth()
  const isCaregiverOrClinician = user?.role === "caregiver" || user?.role === "clinician"

  return useQuery<Patient[], Error>({
    queryKey: ["caregiver", "patients"],
    queryFn: () => fetchCaregiverPatients(),
    enabled: Boolean(isCaregiverOrClinician),
  })
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

export function usePatientProfile(patientId?: string) {
  return useQuery<PatientProfile, Error>({
    queryKey: ["patients", patientId, "profile"],
    queryFn: () => {
      if (!patientId) throw new Error("Patient ID is required")
      return fetchPatientProfile(patientId)
    },
    enabled: Boolean(patientId),
  })
}

export function usePatientAccessList(patientId?: string) {
  return useQuery<CaregiverAccess[], Error>({
    queryKey: ["patients", patientId, "access"],
    queryFn: () => {
      if (!patientId) return Promise.resolve([])
      return fetchPatientAccessList(patientId)
    },
    enabled: Boolean(patientId),
  })
}
