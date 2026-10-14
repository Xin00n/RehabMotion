import { Link } from "react-router-dom"
import { ArrowLeft, Play, Dumbbell, Compass, HelpCircle } from "lucide-react"

import { buttonVariants } from "@/components/ui/button"
import { usePatientPrescriptions } from "@/features/patient/hooks/use-patient-data"
import type { Prescription } from "@/types/patient"

function formatAffectedSide(side?: string): string {
  if (!side) return "Sisi Terkena"
  const s = side.toLowerCase()
  if (s === "left") return "Sisi Kiri"
  if (s === "right") return "Sisi Kanan"
  if (s === "both") return "Kedua Sisi"
  return side
}

export default function ExercisesPage() {
  const { data: prescriptions = [], isLoading, isError } = usePatientPrescriptions(true)

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between p-4 sm:p-6 md:p-10">
      {/* Top Header */}
      <header className="max-w-4xl w-full mx-auto flex items-center justify-between pb-6 border-b border-border">
        <Link
          to="/dashboard"
          className={buttonVariants({
            variant: "outline",
            size: "sm",
            className: "cursor-pointer gap-1.5",
          })}
        >
          <ArrowLeft className="size-4" />
          <span>Kembali ke Dashboard</span>
        </Link>
        <span className="text-xl font-bold tracking-tight">RehabMotion</span>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl w-full mx-auto my-8 space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            Daftar Resep Latihan
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Pilih program latihan aktif di bawah ini untuk memulai panduan gerakan mandiri Anda.
          </p>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="space-y-4">
            <div className="border-2 border-border bg-card rounded-2xl p-8 space-y-4 animate-pulse">
              <div className="h-6 bg-muted rounded w-1/3" />
              <div className="h-4 bg-muted rounded w-2/3" />
              <div className="h-12 bg-muted rounded w-1/4 mt-4" />
            </div>
            <div className="border-2 border-border bg-card rounded-2xl p-8 space-y-4 animate-pulse">
              <div className="h-6 bg-muted rounded w-1/3" />
              <div className="h-4 bg-muted rounded w-2/3" />
              <div className="h-12 bg-muted rounded w-1/4 mt-4" />
            </div>
          </div>
        )}

        {/* Error State */}
        {!isLoading && isError && (
          <div className="border-2 border-destructive bg-destructive/10 rounded-2xl p-8 text-center space-y-4">
            <p className="text-lg font-semibold text-destructive">
              Gagal memuat resep latihan. Pastikan koneksi server backend aktif.
            </p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !isError && prescriptions.length === 0 && (
          <div className="border-2 border-dashed border-border bg-card/60 rounded-2xl p-10 sm:p-14 text-center space-y-6">
            <div className="mx-auto size-16 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
              <HelpCircle className="size-8 stroke-[2]" />
            </div>
            <div className="space-y-2 max-w-md mx-auto">
              <h2 className="text-2xl font-bold text-foreground">
                Belum Ada Resep Latihan
              </h2>
              <p className="text-base text-muted-foreground leading-relaxed">
                Belum ada resep latihan, hubungi fisioterapis Anda untuk mendapatkan program latihan yang sesuai dengan kondisi pemulihan Anda.
              </p>
            </div>
            <div>
              <Link
                to="/dashboard"
                className={buttonVariants({
                  variant: "outline",
                  size: "lg",
                  className: "cursor-pointer font-semibold",
                })}
              >
                Kembali ke Dashboard
              </Link>
            </div>
          </div>
        )}

        {/* Daftar Resep Aktif */}
        {!isLoading && !isError && prescriptions.length > 0 && (
          <div className="space-y-6">
            {prescriptions.map((item: Prescription) => {
              const exerciseName =
                item.exercise?.name || item.exercise_name || "Latihan Pemulihan Gerak"
              const targetRom = item.target_rom ? `${item.target_rom}°` : "Sesuai Toleransi"
              const affectedSide = formatAffectedSide(item.affected_side)

              return (
                <div
                  key={item.id}
                  className="border-2 border-border bg-card rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6"
                >
                  <div className="space-y-4 flex-1">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground bg-muted px-2.5 py-1 rounded-md">
                        Program Aktif
                      </span>
                      <h2 className="text-2xl font-bold text-foreground mt-2">
                        {exerciseName}
                      </h2>
                      {item.exercise?.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {item.exercise.description}
                        </p>
                      )}
                    </div>

                    {/* Metadata Resep */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                      <div className="p-3 rounded-lg bg-muted/40 border border-border">
                        <span className="text-muted-foreground text-xs block flex items-center gap-1">
                          <Dumbbell className="size-3.5" /> Sisi Latihan
                        </span>
                        <span className="font-bold text-foreground text-base mt-0.5 block">
                          {affectedSide}
                        </span>
                      </div>

                      <div className="p-3 rounded-lg bg-muted/40 border border-border">
                        <span className="text-muted-foreground text-xs block flex items-center gap-1">
                          <Compass className="size-3.5" /> Target Sudut (ROM)
                        </span>
                        <span className="font-bold text-foreground text-base mt-0.5 block">
                          {targetRom}
                        </span>
                      </div>

                      {item.target_repetitions && (
                        <div className="p-3 rounded-lg bg-muted/40 border border-border col-span-2 sm:col-span-1">
                          <span className="text-muted-foreground text-xs block">
                            Target Repetisi
                          </span>
                          <span className="font-bold text-foreground text-base mt-0.5 block">
                            {item.target_repetitions} rep {item.target_sets ? `× ${item.target_sets} set` : ""}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Tombol Mulai */}
                  <div className="shrink-0 flex items-center">
                    <Link
                      to={`/session-setup/${item.id}`}
                      className={buttonVariants({
                        size: "lg",
                        className:
                          "w-full md:w-auto h-14 px-8 text-lg font-bold gap-2 cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90",
                      })}
                    >
                      <Play className="size-5 fill-current" />
                      <span>Mulai</span>
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="max-w-4xl w-full mx-auto text-center py-6 text-sm text-muted-foreground border-t border-border">
        © {new Date().getFullYear()} RehabMotion — Program Fisioterapi Pasca-Stroke
      </footer>
    </div>
  )
}
