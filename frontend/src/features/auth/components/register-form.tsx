import { useState } from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useNavigate, Link } from "react-router-dom"
import { Check, AlertCircle, Loader2 } from "lucide-react"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { ApiError } from "@/lib/api-client"
import { authStore } from "@/features/auth/stores/auth-store"
import { registerUser } from "@/features/auth/api/auth-api"
import {
  registerSchema,
  toRegisterPayload,
  type RegisterFormData,
} from "@/features/auth/schemas/register-schema"

export function RegisterForm() {
  const navigate = useNavigate()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      full_name: "",
      email: "",
      password: "",
      confirmPassword: "",
      role: "patient",
    },
    mode: "onChange",
  })

  const watchedPassword = useWatch({ control, name: "password" }) ?? ""
  const isPasswordLengthValid = watchedPassword.length >= 10

  const onSubmit = async (data: RegisterFormData) => {
    setServerError(null)
    try {
      const payload = toRegisterPayload(data)
      const response = await registerUser(payload)
      authStore.setAuth(response.access_token, response.user)
      navigate("/dashboard")
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setServerError(
          "Email ini sudah terdaftar. Silakan gunakan email lain atau masuk ke akun Anda."
        )
      } else if (err instanceof ApiError) {
        setServerError(err.message || "Gagal melakukan pendaftaran. Silakan coba lagi.")
      } else {
        setServerError("Terjadi kendala koneksi. Pastikan server aktif dan coba lagi.")
      }
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      {serverError && (
        <div
          role="alert"
          className="rounded-lg border-2 border-destructive bg-destructive/10 p-4 text-destructive flex items-start gap-3"
        >
          <AlertCircle className="size-5 shrink-0 mt-0.5 text-destructive" />
          <div className="text-sm font-medium leading-relaxed">{serverError}</div>
        </div>
      )}

      {/* Informasi Peran Pendaftaran */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex items-center justify-between">
        <div>
          <span className="text-xs font-bold text-primary uppercase tracking-wider block">
            Pendaftaran Akun
          </span>
          <p className="text-sm font-semibold text-foreground">
            Akun Pasien Mandiri (Rehabilitasi & Pemulihan)
          </p>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
          Pasien
        </span>
      </div>

      {/* Nama Lengkap */}
      <div className="space-y-2">
        <Label htmlFor="full_name" className="text-base font-semibold text-foreground">
          Nama Lengkap
        </Label>
        <Input
          id="full_name"
          type="text"
          placeholder="Contoh: Budi Santoso"
          className="h-12 text-base px-3.5 bg-background border-2 border-input focus-visible:border-primary"
          aria-invalid={Boolean(errors.full_name)}
          {...register("full_name")}
        />
        {errors.full_name && (
          <p className="text-sm font-medium text-destructive">{errors.full_name.message}</p>
        )}
      </div>

      {/* Email */}
      <div className="space-y-2">
        <Label htmlFor="email" className="text-base font-semibold text-foreground">
          Alamat Email
        </Label>
        <Input
          id="email"
          type="email"
          placeholder="nama@email.com"
          className="h-12 text-base px-3.5 bg-background border-2 border-input focus-visible:border-primary"
          aria-invalid={Boolean(errors.email)}
          {...register("email")}
        />
        {errors.email && (
          <p className="text-sm font-medium text-destructive">{errors.email.message}</p>
        )}
      </div>

      {/* Password */}
      <div className="space-y-2">
        <Label htmlFor="password" className="text-base font-semibold text-foreground">
          Kata Sandi (Password)
        </Label>
        <Input
          id="password"
          type="password"
          placeholder="Minimal 10 karakter"
          className="h-12 text-base px-3.5 bg-background border-2 border-input focus-visible:border-primary"
          aria-invalid={Boolean(errors.password)}
          {...register("password")}
        />
        {/* Real-time Validation Indicator */}
        <div className="flex items-center gap-2 pt-1 text-sm">
          <div
            className={`size-4 rounded-full flex items-center justify-center transition-colors ${
              isPasswordLengthValid
                ? "bg-foreground text-background"
                : "border-2 border-muted-foreground text-transparent"
            }`}
          >
            <Check className="size-3 stroke-[3]" />
          </div>
          <span
            className={
              isPasswordLengthValid
                ? "text-foreground font-medium"
                : "text-muted-foreground"
            }
          >
            Minimal 10 karakter
          </span>
        </div>
        {errors.password && (
          <p className="text-sm font-medium text-destructive">{errors.password.message}</p>
        )}
      </div>

      {/* Konfirmasi Password */}
      <div className="space-y-2">
        <Label htmlFor="confirmPassword" className="text-base font-semibold text-foreground">
          Konfirmasi Kata Sandi
        </Label>
        <Input
          id="confirmPassword"
          type="password"
          placeholder="Ulangi kata sandi"
          className="h-12 text-base px-3.5 bg-background border-2 border-input focus-visible:border-primary"
          aria-invalid={Boolean(errors.confirmPassword)}
          {...register("confirmPassword")}
        />
        {errors.confirmPassword && (
          <p className="text-sm font-medium text-destructive">
            {errors.confirmPassword.message}
          </p>
        )}
      </div>

      {/* Tombol Submit */}
      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full h-13 text-base font-semibold cursor-pointer"
        size="lg"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="size-5 animate-spin mr-2" />
            Mendaftarkan Akun...
          </>
        ) : (
          "Daftar Sekarang"
        )}
      </Button>

      {/* Link ke Login */}
      <div className="text-center pt-2">
        <p className="text-base text-muted-foreground">
          Sudah memiliki akun?{" "}
          <Link
            to="/login"
            className="font-semibold text-foreground underline underline-offset-4 hover:text-foreground/80"
          >
            Masuk di sini
          </Link>
        </p>
      </div>
    </form>
  )
}
