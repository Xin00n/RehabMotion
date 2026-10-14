export interface Exercise {
  id: number
  code?: string
  name: string
  primary_joint?: string
  landmarks?: Record<string, number[]>
  rom_min_deg?: number
  rom_max_deg?: number
  description?: string
  category?: string
  target_rom?: number
}

export type AffectedSide = "left" | "right" | "both"

export interface Prescription {
  id: number
  patient_id?: number
  clinician_id?: number
  exercise_id?: number
  exercise?: Exercise
  exercise_name?: string
  affected_side: AffectedSide | string
  target_rom: number | string
  target_rom_deg?: number
  rom_margin_deg?: number
  hold_seconds?: number
  target_repetitions?: number
  target_sets?: number
  starts_on?: string
  ends_on?: string | null
  notes?: string | null
  is_active: boolean
  created_at?: string
  updated_at?: string
}

export interface Session {
  id: number
  patient_id?: number
  prescription_id?: number | null
  exercise_id?: number
  exercise_name?: string
  exercise?: Exercise
  status?: string
  started_at?: string
  ended_at?: string | null
  duration_seconds?: number | null
  repetitions_completed?: number
  total_repetitions?: number
  successful_repetitions?: number
  target_repetitions?: number
  average_peak_rom_deg?: number | null
  maximum_peak_rom_deg?: number | null
  avg_rom?: number
  stop_reason?: string | null
  notes?: string | null
  created_at: string
  completed_at?: string
}

export interface Patient {
  id: number
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
  id: number
  user_id?: number
  full_name: string
  email?: string
  phone?: string
  default_affected_side?: AffectedSide | string
  caregiver_notes?: string | null
  notes?: string
  date_of_birth?: string
  gender?: string
  created_at?: string
  updated_at?: string
}

export interface CreatePrescriptionDto {
  exercise_id?: number
  exercise_name: string
  affected_side: AffectedSide | string
  target_rom: number
  target_repetitions: number
  target_sets: number
  notes?: string
}

export interface CaregiverAccess {
  id: number
  patient_id: number
  accessor_id?: number
  caregiver_id?: number
  caregiver_name?: string
  full_name?: string
  caregiver_email?: string
  email?: string
  access_role?: string
  status?: "active" | "pending" | "revoked" | string
  notes?: string
  created_at?: string
  granted_at?: string
  expires_at?: string
}
