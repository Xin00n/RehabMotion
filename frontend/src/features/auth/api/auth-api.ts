import { api } from "@/lib/api-client"
import type { AuthResponse, RegisterRequest, LoginRequest } from "@/types/auth"

export async function registerUser(payload: RegisterRequest): Promise<AuthResponse> {
  return api.post<AuthResponse>("/auth/register", payload)
}

export async function loginUser(payload: LoginRequest): Promise<AuthResponse> {
  return api.post<AuthResponse>("/auth/login", payload)
}

