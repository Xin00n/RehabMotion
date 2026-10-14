import { z } from "zod"
import type { UpdateProfileRequest, ChangePasswordRequest } from "@/features/account/api/account-api"

export const updateProfileSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(2, "Nama lengkap harus diisi (minimal 2 karakter)"),
})

export type UpdateProfileFormData = z.infer<typeof updateProfileSchema>

export function toUpdateProfilePayload(data: UpdateProfileFormData): UpdateProfileRequest {
  return {
    full_name: data.full_name,
  }
}

export const changePasswordSchema = z
  .object({
    old_password: z.string().min(1, "Kata sandi saat ini harus diisi"),
    new_password: z.string().min(10, "Kata sandi baru minimal 10 karakter"),
    confirm_new_password: z.string().min(1, "Konfirmasi kata sandi baru harus diisi"),
  })
  .refine((data) => data.new_password === data.confirm_new_password, {
    message: "Konfirmasi kata sandi baru tidak cocok",
    path: ["confirm_new_password"],
  })

export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>

export function toChangePasswordPayload(data: ChangePasswordFormData): ChangePasswordRequest {
  return {
    current_password: data.old_password,
    new_password: data.new_password,
    old_password: data.old_password,
  }
}
