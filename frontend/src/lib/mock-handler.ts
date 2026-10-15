import type { User } from "@/types/auth"
import type {
  Patient,
  PatientProfile,
  Prescription,
  Session,
  CaregiverAccess,
} from "@/types/patient"
import type { RomTrendPoint } from "@/types/analytics"

// In-Memory Mock Store for Testing
export const MOCK_USERS: Record<string, User> = {
  "pasien@rehabmotion.id": {
    id: 1,
    email: "pasien@rehabmotion.id",
    full_name: "Bpk. Budi Santoso",
    role: "patient",
    is_active: true,
    created_at: "2026-09-01T08:00:00Z",
  },
  "dokter@rehabmotion.id": {
    id: 3,
    email: "dokter@rehabmotion.id",
    full_name: "dr. Hendra Sp.KFR",
    role: "clinician",
    is_active: true,
    created_at: "2026-08-15T07:00:00Z",
  },
}

let mockPatients: Patient[] = [
  {
    id: 1,
    full_name: "Bpk. Budi Santoso",
    email: "pasien@rehabmotion.id",
    phone: "081234567890",
    default_affected_side: "right",
    active_prescriptions_count: 3,
    last_session_at: "2026-10-13T10:30:00Z",
    compliance_rate: 85,
    compliance_status: "good",
    notes: "Pasien pasca-stroke iskemik 3 bulan lalu. Hemiparesis dekstra.",
  },
  {
    id: 2,
    full_name: "Ibu Ratna Wati",
    email: "ratna@gmail.com",
    phone: "081398765432",
    default_affected_side: "left",
    active_prescriptions_count: 2,
    last_session_at: "2026-10-12T14:15:00Z",
    compliance_rate: 65,
    compliance_status: "moderate",
    notes: "Kelemahan motorik ekstremitas kiri atas.",
  },
  {
    id: 3,
    full_name: "Bpk. Joko Widodo",
    email: "joko.w@yahoo.com",
    phone: "081511223344",
    default_affected_side: "both",
    active_prescriptions_count: 1,
    last_session_at: "2026-10-08T09:00:00Z",
    compliance_rate: 35,
    compliance_status: "poor",
    notes: "Perlu pendampingan fisioterapi intensif.",
  },
]

let mockPrescriptions: Prescription[] = [
  {
    id: 1,
    patient_id: 1,
    exercise_id: 1,
    exercise_name: "Fleksi Siku (Elbow Flexion)",
    exercise: { id: 1, name: "Fleksi Siku (Elbow Flexion)", target_rom: 90 },
    affected_side: "right",
    target_rom: 90,
    target_repetitions: 10,
    target_sets: 3,
    is_active: true,
    created_at: "2026-10-01T08:00:00Z",
  },
  {
    id: 2,
    patient_id: 1,
    exercise_id: 2,
    exercise_name: "Abduksi Bahu (Shoulder Abduction)",
    exercise: { id: 2, name: "Abduksi Bahu (Shoulder Abduction)", target_rom: 120 },
    affected_side: "right",
    target_rom: 120,
    target_repetitions: 10,
    target_sets: 3,
    is_active: true,
    created_at: "2026-10-03T09:00:00Z",
  },
  {
    id: 3,
    patient_id: 1,
    exercise_id: 3,
    exercise_name: "Ekstensi Lutut (Seated Knee Extension)",
    exercise: { id: 3, name: "Ekstensi Lutut (Seated Knee Extension)", target_rom: 110 },
    affected_side: "right",
    target_rom: 110,
    target_repetitions: 8,
    target_sets: 2,
    is_active: true,
    created_at: "2026-10-05T10:00:00Z",
  },
]

const mockSessions: Session[] = [
  {
    id: 1,
    patient_id: 1,
    prescription_id: 1,
    exercise_id: 1,
    exercise_name: "Fleksi Siku (Elbow Flexion)",
    repetitions_completed: 10,
    total_repetitions: 10,
    successful_repetitions: 10,
    target_repetitions: 10,
    avg_rom: 88,
    average_peak_rom_deg: 88,
    maximum_peak_rom_deg: 92,
    created_at: "2026-10-13T10:00:00Z",
    completed_at: "2026-10-13T10:15:00Z",
  },
  {
    id: 2,
    patient_id: 1,
    prescription_id: 2,
    exercise_id: 2,
    exercise_name: "Abduksi Bahu (Shoulder Abduction)",
    repetitions_completed: 10,
    total_repetitions: 10,
    successful_repetitions: 9,
    target_repetitions: 10,
    avg_rom: 115,
    average_peak_rom_deg: 115,
    maximum_peak_rom_deg: 122,
    created_at: "2026-10-12T14:00:00Z",
    completed_at: "2026-10-12T14:15:00Z",
  },
  {
    id: 3,
    patient_id: 1,
    prescription_id: 1,
    exercise_id: 1,
    exercise_name: "Fleksi Siku (Elbow Flexion)",
    repetitions_completed: 8,
    total_repetitions: 10,
    successful_repetitions: 8,
    target_repetitions: 10,
    avg_rom: 82,
    average_peak_rom_deg: 82,
    maximum_peak_rom_deg: 86,
    created_at: "2026-10-10T09:00:00Z",
    completed_at: "2026-10-10T09:15:00Z",
  },
]

const mockRomTrend: RomTrendPoint[] = [
  { date: "2026-10-08", avg_rom: 68, target_rom: 90 },
  { date: "2026-10-09", avg_rom: 72, target_rom: 90 },
  { date: "2026-10-10", avg_rom: 75, target_rom: 90 },
  { date: "2026-10-11", avg_rom: 80, target_rom: 90 },
  { date: "2026-10-12", avg_rom: 83, target_rom: 90 },
  { date: "2026-10-13", avg_rom: 88, target_rom: 90 },
]

let mockAccessList: CaregiverAccess[] = [
  {
    id: 1,
    patient_id: 1,
    accessor_id: 3,
    caregiver_name: "dr. Hendra Sp.KFR",
    full_name: "dr. Hendra Sp.KFR",
    email: "dokter@rehabmotion.id",
    caregiver_email: "dokter@rehabmotion.id",
    access_role: "clinician",
    status: "active",
    notes: "Fisioterapis penanggung jawab",
    granted_at: "2026-10-01T08:00:00Z",
  },
]

export function handleMockRequest<T>(
  endpoint: string,
  method = "GET",
  body?: unknown
): T | undefined {
  const cleanEndpoint = endpoint.split("?")[0]

  // 1. POST /auth/login
  if (cleanEndpoint === "/auth/login" && method === "POST") {
    const data = body as { email: string; password: string }
    const email = data?.email?.toLowerCase().trim() || ""

    let matchedUser = MOCK_USERS[email]
    if (!matchedUser) {
      // Buat session dinamis sesuai domain/nama jika email lain
      const isClinician = email.includes("dokter") || email.includes("fisioterapis")
      const role = isClinician ? "clinician" : "patient"
      matchedUser = {
        id: Date.now(),
        email: data.email,
        full_name: email.split("@")[0].toUpperCase(),
        role,
        is_active: true,
        created_at: new Date().toISOString(),
      }
    }

    return {
      access_token: "mock-jwt-token-" + matchedUser.role,
      token_type: "bearer",
      user: matchedUser,
    } as T
  }

  // 2. POST /auth/register
  if (cleanEndpoint === "/auth/register" && method === "POST") {
    const data = body as { email: string; full_name: string; role?: "patient" }
    const newUser: User = {
      id: Date.now(),
      email: data.email,
      full_name: data.full_name,
      role: "patient",
      is_active: true,
      created_at: new Date().toISOString(),
    }
    MOCK_USERS[data.email.toLowerCase()] = newUser
    return {
      access_token: "mock-jwt-token-" + newUser.role,
      token_type: "bearer",
      user: newUser,
    } as T
  }

  // 3. GET /auth/me
  if (cleanEndpoint === "/auth/me" && method === "GET") {
    return MOCK_USERS["pasien@rehabmotion.id"] as T
  }

  // 4. PATCH /users/me
  if (cleanEndpoint === "/users/me" && method === "PATCH") {
    const data = body as Partial<User>
    return { ...MOCK_USERS["pasien@rehabmotion.id"], ...data } as T
  }

  // 5. POST /users/me/password
  if (cleanEndpoint === "/users/me/password" && method === "POST") {
    return undefined as T
  }

  // 6. GET /patients
  if (cleanEndpoint === "/patients" && method === "GET") {
    return [...mockPatients] as T
  }

  // 7. GET /patients/:id/profile
  if (cleanEndpoint.startsWith("/patients/") && cleanEndpoint.endsWith("/profile") && method === "GET") {
    const patientId = Number(cleanEndpoint.split("/")[2])
    const p = mockPatients.find((item) => item.id === patientId) || mockPatients[0]
    const profile: PatientProfile = {
      id: p.id,
      full_name: p.full_name,
      email: p.email,
      phone: p.phone,
      default_affected_side: p.default_affected_side,
      notes: p.notes,
      created_at: p.created_at,
    }
    return profile as T
  }

  // 8. PATCH /patients/:id/profile
  if (cleanEndpoint.startsWith("/patients/") && cleanEndpoint.endsWith("/profile") && method === "PATCH") {
    const patientId = Number(cleanEndpoint.split("/")[2])
    const updates = body as Partial<PatientProfile>
    mockPatients = mockPatients.map((p) =>
      p.id === patientId ? { ...p, ...updates } : p
    )
    const p = mockPatients.find((item) => item.id === patientId) || mockPatients[0]
    return { ...p, ...updates } as T
  }

  // 9. GET /patients/:id/prescriptions
  if (cleanEndpoint.startsWith("/patients/") && cleanEndpoint.endsWith("/prescriptions") && method === "GET") {
    return [...mockPrescriptions] as T
  }

  // 10. POST /patients/:id/prescriptions
  if (cleanEndpoint.startsWith("/patients/") && cleanEndpoint.endsWith("/prescriptions") && method === "POST") {
    const patientId = Number(cleanEndpoint.split("/")[2])
    const data = body as Partial<Prescription>
    const newRx: Prescription = {
      id: Date.now(),
      patient_id: patientId,
      exercise_id: 1,
      exercise_name: data.exercise_name || "Latihan Baru",
      affected_side: data.affected_side || "right",
      target_rom: data.target_rom || 90,
      target_repetitions: data.target_repetitions || 10,
      target_sets: data.target_sets || 3,
      is_active: true,
      created_at: new Date().toISOString(),
    }
    mockPrescriptions = [newRx, ...mockPrescriptions]
    return newRx as T
  }

  // 11. GET /patients/:id/sessions
  if (cleanEndpoint.startsWith("/patients/") && cleanEndpoint.endsWith("/sessions") && method === "GET") {
    return [...mockSessions] as T
  }

  // 12. GET /patients/:id/analytics/rom-trend
  if (cleanEndpoint.includes("/analytics/rom-trend") && method === "GET") {
    return [...mockRomTrend] as T
  }

  // 13. POST /sessions
  if (cleanEndpoint === "/sessions" && method === "POST") {
    return {
      id: Date.now(),
      created_at: new Date().toISOString(),
    } as T
  }

  // 14. POST /sessions/:id/rom-measurements
  if (cleanEndpoint.includes("/rom-measurements") && method === "POST") {
    return { success: true } as T
  }

  // 15. POST /sessions/:id/finish
  if (cleanEndpoint.includes("/finish") && method === "POST") {
    return { success: true, completed_at: new Date().toISOString() } as T
  }

  // 16. GET /patients/:id/access
  if (cleanEndpoint.startsWith("/patients/") && cleanEndpoint.endsWith("/access") && method === "GET") {
    return [...mockAccessList] as T
  }

  // 17. POST /patients/:id/access
  if (cleanEndpoint.startsWith("/patients/") && cleanEndpoint.endsWith("/access") && method === "POST") {
    const patientId = Number(cleanEndpoint.split("/")[2])
    const data = body as { email?: string; access_role?: string; caregiver_email?: string; notes?: string }
    const email = data.email || data.caregiver_email || "dokter@example.com"
    const newAccess: CaregiverAccess = {
      id: Date.now(),
      patient_id: patientId,
      accessor_id: Date.now() + 1,
      email,
      caregiver_email: email,
      caregiver_name: email.split("@")[0],
      full_name: email.split("@")[0],
      access_role: data.access_role || "clinician",
      status: "active",
      notes: data.notes || "Ditambahkan oleh pasien",
      granted_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    }
    mockAccessList = [newAccess, ...mockAccessList]
    return newAccess as T
  }

  // 18. DELETE /patients/:id/access/:access_id
  if (cleanEndpoint.startsWith("/patients/") && cleanEndpoint.includes("/access/") && method === "DELETE") {
    const parts = cleanEndpoint.split("/")
    const accessId = Number(parts[4])
    mockAccessList = mockAccessList.filter((a) => a.id !== accessId)
    return undefined as T
  }

  return undefined
}
