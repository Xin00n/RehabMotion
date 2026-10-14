import { api } from "@/lib/api-client"
import type { Session, AffectedSide } from "@/types/patient"

export interface CreateSessionRequest {
  exercise_id: number
  affected_side: AffectedSide | string
  prescription_id?: number
  patient_id?: number
  notes?: string
}

export interface RomMeasurement {
  // Field backend API
  angle_deg: number
  affected_side: AffectedSide | string
  phase: string
  target_reached: boolean
  measured_at?: string

  // Field internal state frontend (tidak dikirim ke backend)
  timestamp_ms?: number
  repetition_index?: number
  current_angle?: number
  target_angle?: number
  is_target_reached?: boolean
  is_compensated?: boolean
}

export interface BatchRomMeasurementRequest {
  measurements: RomMeasurement[]
}

export interface FinishSessionRequest {
  status: "completed" | "stopped"
  total_repetitions: number
  successful_repetitions: number
  average_peak_rom_deg?: number | null
  maximum_peak_rom_deg?: number | null
  stop_reason?: string | null
  notes?: string | null
  // Backward compatibility alias opsional
  repetitions_completed?: number
  duration_seconds?: number | null
}

export async function createSession(payload: CreateSessionRequest): Promise<Session> {
  return api.post<Session>("/sessions", {
    exercise_id: payload.exercise_id,
    affected_side: payload.affected_side,
    ...(payload.prescription_id ? { prescription_id: payload.prescription_id } : {}),
    ...(payload.patient_id ? { patient_id: payload.patient_id } : {}),
    ...(payload.notes ? { notes: payload.notes } : {}),
  })
}

export async function submitBatchRomMeasurements(
  sessionId: number | string,
  payload: BatchRomMeasurementRequest
): Promise<void> {
  // Hanya petakan field yang dikenali oleh backend FastAPI (ROMMeasurementCreate)
  const apiMeasurements = payload.measurements.map((m) => ({
    angle_deg: m.angle_deg,
    affected_side: m.affected_side,
    phase: m.phase || "moving",
    target_reached: Boolean(m.target_reached),
    ...(m.measured_at ? { measured_at: m.measured_at } : {}),
  }))

  return api.post<void>(`/sessions/${Number(sessionId)}/rom-measurements`, {
    measurements: apiMeasurements,
  })
}

export async function finishSession(
  sessionId: number | string,
  payload: FinishSessionRequest
): Promise<Session> {
  const apiPayload = {
    status: payload.status,
    total_repetitions: payload.total_repetitions,
    successful_repetitions: payload.successful_repetitions,
    ...(payload.average_peak_rom_deg !== undefined ? { average_peak_rom_deg: payload.average_peak_rom_deg } : {}),
    ...(payload.maximum_peak_rom_deg !== undefined ? { maximum_peak_rom_deg: payload.maximum_peak_rom_deg } : {}),
    ...(payload.stop_reason ? { stop_reason: payload.stop_reason } : {}),
    ...(payload.notes ? { notes: payload.notes } : {}),
  }
  return api.post<Session>(`/sessions/${Number(sessionId)}/finish`, apiPayload)
}
