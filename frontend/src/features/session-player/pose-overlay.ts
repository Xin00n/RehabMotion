import type { LandmarkPoint } from "./angle-engine"
import type { RepCounterState } from "./rep-counter"

export const POSE_CONNECTIONS: [number, number][] = [
  // Bahu & Dada
  [11, 12],
  [11, 23],
  [12, 24],
  [23, 24],
  // Lengan Kiri
  [11, 13],
  [13, 15],
  // Lengan Kanan
  [12, 14],
  [14, 16],
  // Kaki Kiri
  [23, 25],
  [25, 27],
  [27, 29],
  [29, 31],
  [27, 31],
  // Kaki Kanan
  [24, 26],
  [26, 28],
  [28, 30],
  [30, 32],
  [28, 32],
]

// Helper to read CSS design tokens with project token fallbacks
const getCssToken = (tokenName: string, fallback: string): string => {
  if (typeof window !== "undefined") {
    const val = getComputedStyle(document.documentElement).getPropertyValue(tokenName).trim()
    if (val) return val
  }
  return fallback
}

export function getSkeletonColor(state: RepCounterState, isCompensated: boolean): string {
  if (isCompensated) {
    return getCssToken("--danger", "#A8483A") // Terracotta: Kompensasi gerak
  }
  switch (state) {
    case "PEAK_CHECK":
    case "HOLD":
      return getCssToken("--success", "#4C7A5D") // Hijau lembut: Target ROM tercapai / Sedang ditahan
    case "MOVING":
      return getCssToken("--warning", "#B98B3E") // Mustard pudar: Bergerak menuju target
    case "RETURN":
      return getCssToken("--primary", "#2F4A3C") // Hijau hutan gelap: Bergerak kembali
    case "STATE_START":
    default:
      return getCssToken("--text-muted", "#6B6558") // Netral / Abu-abu hangat: Posisi awal
  }
}

export function drawPoseSkeleton(
  ctx: CanvasRenderingContext2D,
  landmarks: LandmarkPoint[],
  canvasWidth: number,
  canvasHeight: number,
  state: RepCounterState,
  isCompensated: boolean,
  activeIndices?: [number, number, number]
) {
  ctx.clearRect(0, 0, canvasWidth, canvasHeight)

  if (!landmarks || landmarks.length < 33) return

  const mainColor = getSkeletonColor(state, isCompensated)

  // 1. Gambar garis koneksi skeleton
  ctx.lineWidth = 4
  ctx.lineCap = "round"

  for (const [startIdx, endIdx] of POSE_CONNECTIONS) {
    const p1 = landmarks[startIdx]
    const p2 = landmarks[endIdx]

    if (!p1 || !p2) continue
    if ((p1.visibility ?? 1) < 0.3 || (p2.visibility ?? 1) < 0.3) continue

    const x1 = p1.x * canvasWidth
    const y1 = p1.y * canvasHeight
    const x2 = p2.x * canvasWidth
    const y2 = p2.y * canvasHeight

    // Beri highlight warna utama jika koneksi termasuk sendi yang sedang dilatih
    const isActiveConnection =
      activeIndices &&
      ((activeIndices[0] === startIdx && activeIndices[1] === endIdx) ||
        (activeIndices[1] === startIdx && activeIndices[2] === endIdx) ||
        (activeIndices[1] === startIdx && activeIndices[0] === endIdx) ||
        (activeIndices[2] === startIdx && activeIndices[1] === endIdx))

    ctx.strokeStyle = isActiveConnection ? mainColor : "rgba(220, 213, 196, 0.6)"
    ctx.lineWidth = isActiveConnection ? 6 : 3

    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2, y2)
    ctx.stroke()
  }

  // 2. Gambar 33 titik landmark
  for (let i = 0; i < landmarks.length; i++) {
    const point = landmarks[i]
    if (!point || (point.visibility ?? 1) < 0.3) continue

    const px = point.x * canvasWidth
    const py = point.y * canvasHeight

    const isActiveJoint = activeIndices && activeIndices.includes(i)

    ctx.beginPath()
    ctx.arc(px, py, isActiveJoint ? 8 : 4, 0, 2 * Math.PI)

    ctx.fillStyle = isActiveJoint ? mainColor : getCssToken("--bg", "#FAF8F2")
    ctx.fill()
    ctx.strokeStyle = getCssToken("--surface-dark", "#1F3326")
    ctx.lineWidth = 2
    ctx.stroke()
  }
}
