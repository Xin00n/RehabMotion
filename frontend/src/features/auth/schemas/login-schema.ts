import { z } from "zod"
import type { LoginRequest } from "@/types/auth"

export const loginSchema = z.object({
  email: z.string().trim().email("Format email tidak valid"),
  password: z.string().min(1, "Kata sandi harus diisi"),
})

export type LoginFormData = z.infer<typeof loginSchema>

export function toLoginPayload(data: LoginFormData): LoginRequest {
  return {
    email: data.email.trim().toLowerCase(),
    password: data.password,
  }
}

