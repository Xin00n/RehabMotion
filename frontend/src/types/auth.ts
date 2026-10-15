export type UserRole = "patient" | "clinician" | "admin"

export type RegisterRole = "patient"

export interface User {
  id: number
  email: string
  full_name: string
  role: UserRole
  is_active: boolean
  created_at: string
}

export interface RegisterRequest {
  email: string
  full_name: string
  password: string
  role: RegisterRole
}

export interface LoginRequest {
  email: string
  password: string
}

export interface AuthResponse {
  access_token: string
  token_type: string
  user: User
}
