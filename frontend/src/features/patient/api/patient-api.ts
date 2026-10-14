import { api } from "@/lib/api-client"
import type {
  Patient,
  PatientProfile,
  Prescription,
  Session,
  CreatePrescriptionDto,
  CaregiverAccess,
} from "@/types/patient"

export async function fetchPatientPrescriptions(
  patientId: string,
  activeOnly = true
): Promise<Prescription[]> {
  const query = activeOnly ? "?active_only=true" : ""
  return api.get<Prescription[]>(`/patients/${patientId}/prescriptions${query}`)
}

export async function fetchPatientSessions(
  patientId: string
): Promise<Session[]> {
  return api.get<Session[]>(`/patients/${patientId}/sessions`)
}

export async function fetchCaregiverPatients(): Promise<Patient[]> {
  return api.get<Patient[]>("/patients")
}

export async function fetchPatientProfile(patientId: string): Promise<PatientProfile> {
  return api.get<PatientProfile>(`/patients/${patientId}/profile`)
}

export async function updatePatientProfile(
  patientId: string,
  data: Partial<PatientProfile>
): Promise<PatientProfile> {
  return api.patch<PatientProfile>(`/patients/${patientId}/profile`, data)
}

export async function createPatientPrescription(
  patientId: string,
  data: CreatePrescriptionDto
): Promise<Prescription> {
  return api.post<Prescription>(`/patients/${patientId}/prescriptions`, data)
}

export async function fetchPatientAccessList(patientId: string): Promise<CaregiverAccess[]> {
  return api.get<CaregiverAccess[]>(`/access?patient_id=${patientId}`)
}

export async function grantCaregiverAccess(data: {
  patient_id: string
  caregiver_email: string
  notes?: string
}): Promise<CaregiverAccess> {
  return api.post<CaregiverAccess>("/access", data)
}

export async function revokeCaregiverAccess(accessId: string): Promise<void> {
  return api.delete<void>(`/access/${accessId}`)
}
