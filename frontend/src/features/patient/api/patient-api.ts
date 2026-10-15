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
  patientId: number | string,
  activeOnly = true
): Promise<Prescription[]> {
  const query = activeOnly ? "?active_only=true" : ""
  return api.get<Prescription[]>(`/patients/${Number(patientId)}/prescriptions${query}`)
}

export async function fetchPatientSessions(
  patientId: number | string
): Promise<Session[]> {
  return api.get<Session[]>(`/patients/${Number(patientId)}/sessions`)
}

export async function fetchCaregiverPatients(): Promise<Patient[]> {
  return api.get<Patient[]>("/patients")
}

export async function fetchPatientProfile(patientId: number | string): Promise<PatientProfile> {
  return api.get<PatientProfile>(`/patients/${Number(patientId)}/profile`)
}

export async function updatePatientProfile(
  patientId: number | string,
  data: Partial<PatientProfile>
): Promise<PatientProfile> {
  return api.patch<PatientProfile>(`/patients/${Number(patientId)}/profile`, data)
}

export async function createPatientPrescription(
  patientId: number | string,
  data: CreatePrescriptionDto
): Promise<Prescription> {
  const payload = {
    ...data,
    target_rom_deg: data.target_rom_deg ?? data.target_rom,
  }
  return api.post<Prescription>(`/patients/${Number(patientId)}/prescriptions`, payload)
}

export async function fetchPatientAccessList(patientId: number | string): Promise<CaregiverAccess[]> {
  return api.get<CaregiverAccess[]>(`/patients/${Number(patientId)}/access`)
}

export async function grantCaregiverAccess(data: {
  patient_id: number | string
  email: string
  access_role?: "clinician"
  caregiver_email?: string
  notes?: string
}): Promise<CaregiverAccess> {
  const patientId = Number(data.patient_id)
  const email = data.email || data.caregiver_email || ""
  const payload = {
    email,
    access_role: data.access_role || "clinician",
  }
  return api.post<CaregiverAccess>(`/patients/${patientId}/access`, payload)
}

export async function revokeCaregiverAccess(patientId: number | string, accessId: number | string): Promise<void> {
  return api.delete<void>(`/patients/${Number(patientId)}/access/${Number(accessId)}`)
}
