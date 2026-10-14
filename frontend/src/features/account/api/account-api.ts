import { api } from "@/lib/api-client"
import type { User } from "@/types/auth"

export interface UpdateProfileRequest {
  full_name: string
}

export interface ChangePasswordRequest {
  current_password: string
  new_password: string
  old_password?: string
}

export async function updateProfile(payload: UpdateProfileRequest): Promise<User> {
  return api.patch<User>("/users/me", payload)
}

export async function changePassword(payload: ChangePasswordRequest): Promise<void> {
  return api.post<void>("/users/me/password", payload)
}
