import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useNavigate, Link } from "react-router-dom"
import { AlertCircle, Loader2 } from "lucide-react"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { ApiError } from "@/lib/api-client"
import { authStore } from "@/features/auth/stores/auth-store"
import { loginUser } from "@/features/auth/api/auth-api"
import {
  loginSchema,
  toLoginPayload,
  type LoginFormData,
} from "@/features/auth/schemas/login-schema"

export function LoginForm() {
  const navigate = useNavigate()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
    mode: "onBlur",
  })

  const onSubmit = async (data: LoginFormData) => {
    setServerError(null)
    try {
      const payload = toLoginPayload(data)
      const response = await loginUser(payload)
      authStore.setAuth(response.access_token, response.user)
      navigate("/dashboard")
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          setServerError("Email atau kata sandi tidak sesuai. Silakan periksa kembali.")
        } else if (err.status === 403) {
          setServerError("Akun Anda sedang dinonaktifkan. Silakan hubungi tim dukungan kami.")
        } else {
          setServerError(err.message || "Gagal masuk. Silakan coba beberapa saat lagi.")
        }
      } else {
        setServerError("Terjadi kendala jaringan. Pastikan koneksi internet Anda aktif.")
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

      {/* Demo Account Picker for Testing */}
      <div className="rounded-xl border-2 border-border bg-card p-4 space-y-2.5 shadow-2xs">
        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
          Pilih Cepat Akun Demo (Uji Coba Pengujian)
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => {
              setValue("email", "pasien@rehabmotion.id", { shouldValidate: true })
              setValue("password", "password123", { shouldValidate: true })
            }}
            className="p-2.5 rounded-lg border border-border bg-muted/40 hover:bg-muted text-foreground text-left cursor-pointer transition-colors"
          >
            <span className="font-bold text-xs text-primary block">👨‍🦳 Pasien</span>
            <span className="text-[11px] text-muted-foreground truncate block">pasien@rehabmotion.id</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setValue("email", "dokter@rehabmotion.id", { shouldValidate: true })
              setValue("password", "password123", { shouldValidate: true })
            }}
            className="p-2.5 rounded-lg border border-border bg-muted/40 hover:bg-muted text-foreground text-left cursor-pointer transition-colors"
          >
            <span className="font-bold text-xs text-primary block">🩺 Fisioterapis</span>
            <span className="text-[11px] text-muted-foreground truncate block">dokter@rehabmotion.id</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setValue("email", "jarjit@gmail.com", { shouldValidate: true })
              setValue("password", "password123", { shouldValidate: true })
            }}
            className="p-2.5 rounded-lg border border-border bg-muted/40 hover:bg-muted text-foreground text-left cursor-pointer transition-colors"
          >
            <span className="font-bold text-xs text-primary block">👤 Pasien (Jarjit)</span>
            <span className="text-[11px] text-muted-foreground truncate block">jarjit@gmail.com</span>
          </button>
        </div>
      </div>

      {/* Alamat Email */}
      <div className="space-y-2">
        <Label htmlFor="email" className="text-base font-semibold text-foreground">
          Alamat Email
        </Label>
        <Input
          id="email"
          type="email"
          placeholder="nama@email.com"
          autoComplete="email"
          className="h-12 text-base px-3.5 bg-background border-2 border-input focus-visible:border-primary"
          aria-invalid={Boolean(errors.email)}
          {...register("email")}
        />
        {errors.email && (
          <p className="text-sm font-medium text-destructive">{errors.email.message}</p>
        )}
      </div>

      {/* Kata Sandi */}
      <div className="space-y-2">
        <Label htmlFor="password" className="text-base font-semibold text-foreground">
          Kata Sandi (Password)
        </Label>
        <Input
          id="password"
          type="password"
          placeholder="Masukkan kata sandi Anda"
          autoComplete="current-password"
          className="h-12 text-base px-3.5 bg-background border-2 border-input focus-visible:border-primary"
          aria-invalid={Boolean(errors.password)}
          {...register("password")}
        />
        {errors.password && (
          <p className="text-sm font-medium text-destructive">{errors.password.message}</p>
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
            Sedang Masuk...
          </>
        ) : (
          "Masuk ke Akun"
        )}
      </Button>

      {/* Link ke Register */}
      <div className="text-center pt-2">
        <p className="text-base text-muted-foreground">
          Belum punya akun?{" "}
          <Link
            to="/register"
            className="font-semibold text-foreground underline underline-offset-4 hover:text-foreground/80"
          >
            Daftar di sini
          </Link>
        </p>
      </div>
    </form>
  )
}
