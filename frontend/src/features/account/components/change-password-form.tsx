import { useState } from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Check, CheckCircle2, AlertCircle, Loader2 } from "lucide-react"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { ApiError } from "@/lib/api-client"
import { changePassword } from "@/features/account/api/account-api"
import {
  changePasswordSchema,
  toChangePasswordPayload,
  type ChangePasswordFormData,
} from "@/features/account/schemas/account-schemas"

export function ChangePasswordForm() {
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      old_password: "",
      new_password: "",
      confirm_new_password: "",
    },
    mode: "onChange",
  })

  const watchedNewPassword = useWatch({ control, name: "new_password" }) ?? ""
  const isNewPasswordLengthValid = watchedNewPassword.length >= 10

  const onSubmit = async (data: ChangePasswordFormData) => {
    setSuccessMessage(null)
    setErrorMessage(null)
    try {
      const payload = toChangePasswordPayload(data)
      await changePassword(payload)
      setSuccessMessage("Kata sandi berhasil diubah!")
      reset()
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 400 || err.status === 401) {
          setErrorMessage("Kata sandi lama yang Anda masukkan tidak sesuai.")
        } else {
          setErrorMessage(err.message || "Gagal mengubah kata sandi.")
        }
      } else {
        setErrorMessage("Terjadi kendala jaringan saat mengubah kata sandi.")
      }
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      {successMessage && (
        <div
          role="status"
          className="rounded-lg border-2 border-foreground/20 bg-muted p-4 text-foreground flex items-start gap-3"
        >
          <CheckCircle2 className="size-5 shrink-0 mt-0.5 text-foreground" />
          <div className="text-sm font-semibold">{successMessage}</div>
        </div>
      )}

      {errorMessage && (
        <div
          role="alert"
          className="rounded-lg border-2 border-destructive bg-destructive/10 p-4 text-destructive flex items-start gap-3"
        >
          <AlertCircle className="size-5 shrink-0 mt-0.5 text-destructive" />
          <div className="text-sm font-medium">{errorMessage}</div>
        </div>
      )}

      {/* Kata Sandi Lama */}
      <div className="space-y-2">
        <Label htmlFor="old_password" className="text-base font-semibold text-foreground">
          Kata Sandi Saat Ini
        </Label>
        <Input
          id="old_password"
          type="password"
          placeholder="Masukkan kata sandi lama"
          className="h-12 text-base px-3.5 bg-background border-2 border-input focus-visible:border-primary"
          aria-invalid={Boolean(errors.old_password)}
          {...register("old_password")}
        />
        {errors.old_password && (
          <p className="text-sm font-medium text-destructive">{errors.old_password.message}</p>
        )}
      </div>

      {/* Kata Sandi Baru */}
      <div className="space-y-2">
        <Label htmlFor="new_password" className="text-base font-semibold text-foreground">
          Kata Sandi Baru
        </Label>
        <Input
          id="new_password"
          type="password"
          placeholder="Minimal 10 karakter"
          className="h-12 text-base px-3.5 bg-background border-2 border-input focus-visible:border-primary"
          aria-invalid={Boolean(errors.new_password)}
          {...register("new_password")}
        />
        {/* Real-time Validation Indicator */}
        <div className="flex items-center gap-2 pt-1 text-sm">
          <div
            className={`size-4 rounded-full flex items-center justify-center transition-colors ${
              isNewPasswordLengthValid
                ? "bg-foreground text-background"
                : "border-2 border-muted-foreground text-transparent"
            }`}
          >
            <Check className="size-3 stroke-[3]" />
          </div>
          <span
            className={
              isNewPasswordLengthValid
                ? "text-foreground font-medium"
                : "text-muted-foreground"
            }
          >
            Minimal 10 karakter
          </span>
        </div>
        {errors.new_password && (
          <p className="text-sm font-medium text-destructive">{errors.new_password.message}</p>
        )}
      </div>

      {/* Konfirmasi Kata Sandi Baru */}
      <div className="space-y-2">
        <Label htmlFor="confirm_new_password" className="text-base font-semibold text-foreground">
          Konfirmasi Kata Sandi Baru
        </Label>
        <Input
          id="confirm_new_password"
          type="password"
          placeholder="Ulangi kata sandi baru"
          className="h-12 text-base px-3.5 bg-background border-2 border-input focus-visible:border-primary"
          aria-invalid={Boolean(errors.confirm_new_password)}
          {...register("confirm_new_password")}
        />
        {errors.confirm_new_password && (
          <p className="text-sm font-medium text-destructive">
            {errors.confirm_new_password.message}
          </p>
        )}
      </div>

      <Button
        type="submit"
        disabled={isSubmitting}
        size="lg"
        className="h-12 px-6 text-base font-semibold cursor-pointer"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="size-4 animate-spin mr-2" />
            Memperbarui Kata Sandi...
          </>
        ) : (
          "Perbarui Kata Sandi"
        )}
      </Button>
    </form>
  )
}
