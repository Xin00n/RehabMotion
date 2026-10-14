export interface Exercise {
  id: string
  name: string
  description?: string
  category?: string
  target_rom?: number
}

export type AffectedSide = "left" | "right" | "both"

export interface Prescription {
  id: string
  patient_id?: string
  exercise_id?: string
  exercise?: Exercise
  exercise_name?: string
  affected_side: AffectedSide | string
  target_rom: number | string
  target_repetitions?: number
  target_sets?: number
  is_active: boolean
  created_at?: string
}

export interface Session {
  id: string
  patient_id?: string
  prescription_id?: string
  exercise_name?: string
  exercise?: Exercise
  repetitions_completed: number
  target_repetitions?: number
  avg_rom?: number
  created_at: string
  completed_at?: string
}

export interface Patient {
  id: string
  full_name: string
  email?: string
  phone?: string
  default_affected_side?: AffectedSide | string
  notes?: string
  created_at?: string
  active_prescriptions_count?: number
  last_session_at?: string
  compliance_rate?: number
  compliance_status?: "good" | "moderate" | "poor" | string
  total_sessions_completed?: number
}

export interface PatientProfile {
  id: string
  full_name: string
  email?: string
  phone?: string
  default_affected_side?: AffectedSide | string
  notes?: string
  date_of_birth?: string
  gender?: string
  created_at?: string
  updated_at?: string
}

export interface CreatePrescriptionDto {
  exercise_name: string
  affected_side: AffectedSide | string
  target_rom: number
  target_repetitions: number
  target_sets: number
  notes?: string
}

export interface CaregiverAccess {
  id: string
  patient_id: string
  caregiver_id?: string
  caregiver_name?: string
  caregiver_email: string
  status: "active" | "pending" | "revoked" | string
  notes?: string
  granted_at?: string
  expires_at?: string
}
