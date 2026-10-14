import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { ApiError } from "@/lib/api-client"
import { useAuth, authStore } from "@/features/auth/stores/auth-store"
import { updateProfile } from "@/features/account/api/account-api"
import {
  updateProfileSchema,
  toUpdateProfilePayload,
  type UpdateProfileFormData,
} from "@/features/account/schemas/account-schemas"

export function UpdateProfileForm() {
  const { user } = useAuth()
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UpdateProfileFormData>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      full_name: user?.full_name || "",
    },
  })

  useEffect(() => {
    if (user?.full_name) {
      reset({ full_name: user.full_name })
    }
  }, [user?.full_name, reset])

  const onSubmit = async (data: UpdateProfileFormData) => {
    setSuccessMessage(null)
    setErrorMessage(null)
    try {
      const payload = toUpdateProfilePayload(data)
      const updatedUser = await updateProfile(payload)
      authStore.updateUser({ full_name: updatedUser.full_name || data.full_name })
      setSuccessMessage("Nama lengkap berhasil diperbarui.")
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorMessage(err.message || "Gagal memperbarui profil.")
      } else {
        setErrorMessage("Terjadi kendala jaringan saat memperbarui profil.")
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

      <div className="space-y-2">
        <Label htmlFor="full_name" className="text-base font-semibold text-foreground">
          Nama Lengkap
        </Label>
        <Input
          id="full_name"
          type="text"
          placeholder="Nama lengkap Anda"
          className="h-12 text-base px-3.5 bg-background border-2 border-input focus-visible:border-primary"
          aria-invalid={Boolean(errors.full_name)}
          {...register("full_name")}
        />
        {errors.full_name && (
          <p className="text-sm font-medium text-destructive">{errors.full_name.message}</p>
        )}
      </div>

      <div className="space-y-1">
        <Label className="text-sm font-medium text-muted-foreground">Alamat Email (Tetap)</Label>
        <p className="text-base font-semibold text-foreground bg-muted/40 p-3 rounded-lg border border-border">
          {user?.email || "-"}
        </p>
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
            Menyimpan...
          </>
        ) : (
          "Simpan Perubahan Nama"
        )}
      </Button>
    </form>
  )
}
