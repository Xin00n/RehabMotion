import { z } from "zod"
import type { RegisterRequest } from "@/types/auth"

export const registerSchema = z
  .object({
    full_name: z
      .string()
      .trim()
      .min(2, "Nama lengkap harus diisi (minimal 2 karakter)"),
    email: z
      .string()
      .trim()
      .email("Format email tidak valid"),
    password: z
      .string()
      .min(10, "Password minimal 10 karakter"),
    confirmPassword: z
      .string()
      .min(1, "Konfirmasi password harus diisi"),
    role: z.literal("patient"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Konfirmasi password tidak cocok",
    path: ["confirmPassword"],
  })

export type RegisterFormData = z.infer<typeof registerSchema>

export function toRegisterPayload(data: RegisterFormData): RegisterRequest {
  return {
    email: data.email,
    full_name: data.full_name,
    password: data.password,
    role: data.role,
  }
}
