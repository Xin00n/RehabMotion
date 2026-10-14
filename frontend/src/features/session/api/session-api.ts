import { api } from "@/lib/api-client"
import type { Session } from "@/types/patient"

export interface CreateSessionRequest {
  prescription_id: string
  affected_side: string
}

export interface RomMeasurement {
  timestamp_ms: number
  repetition_index: number
  current_angle: number
  target_angle: number
  is_target_reached: boolean
  is_compensated: boolean
}

export interface BatchRomMeasurementRequest {
  measurements: RomMeasurement[]
}

export interface FinishSessionRequest {
  repetitions_completed: number
  duration_seconds: number
  notes?: string
}

export async function createSession(payload: CreateSessionRequest): Promise<Session> {
  return api.post<Session>("/sessions", payload)
}

export async function submitBatchRomMeasurements(
  sessionId: string,
  payload: BatchRomMeasurementRequest
): Promise<void> {
  return api.post<void>(`/sessions/${sessionId}/rom-measurements`, payload)
}

export async function finishSession(
  sessionId: string,
  payload: FinishSessionRequest
): Promise<Session> {
  return api.post<Session>(`/sessions/${sessionId}/finish`, payload)
}
