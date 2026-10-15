import { useParams, useSearchParams } from "react-router-dom"
import { SessionPlayer } from "@/features/session-player/components/session-player"
import { usePatientPrescriptions } from "@/features/patient/hooks/use-patient-data"
import type { Prescription } from "@/types/patient"
import type { Side } from "@/features/session-player/angle-engine"

export default function SessionPlayPage() {
  const { sessionId = "demo" } = useParams<{ sessionId: string }>()
  const [searchParams] = useSearchParams()

  const rawPrescriptionId = searchParams.get("prescription_id")
  const parsedPrescriptionId = rawPrescriptionId ? Number(rawPrescriptionId) : undefined
  const paramSide = (searchParams.get("side") as Side) || "right"

  const { data: prescriptions = [] } = usePatientPrescriptions(false)
  const prescription = prescriptions.find((p: Prescription) => p.id === parsedPrescriptionId)

  const side: Side =
    prescription?.affected_side === "left" || prescription?.affected_side === "right"
      ? (prescription.affected_side as Side)
      : paramSide

  const targetRom = (prescription?.target_rom_deg ?? prescription?.target_rom)
    ? Number(prescription.target_rom_deg ?? prescription.target_rom)
    : 90

  const targetReps = prescription?.target_repetitions || 10
  const isMutedParam = searchParams.get("muted") === "true"

  return (
    <SessionPlayer
      sessionId={sessionId}
      prescription={prescription}
      affectedSide={side}
      targetReps={targetReps}
      targetRom={targetRom}
      exerciseName={prescription?.exercise?.name || prescription?.exercise_name || "Elbow Flexion"}
      initialMuted={isMutedParam}
    />
  )
}
