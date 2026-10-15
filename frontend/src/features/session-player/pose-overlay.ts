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
    return "#ef4444" // Merah terang: Kompensasi gerak
  }
  switch (state) {
    case "PEAK_CHECK":
    case "HOLD":
      return "#10b981" // Hijau cerah: Target ROM tercapai / Sedang ditahan
    case "MOVING":
      return "#f59e0b" // Kuning amber: Bergerak menuju target
    case "RETURN":
      return "#3b82f6" // Biru: Bergerak kembali
    case "STATE_START":
    default:
      return getCssToken("--text-muted", "#888888") // Netral: Posisi awal
  }
}

export function drawPoseSkeleton(
  ctx: CanvasRenderingContext2D,
  landmarks: LandmarkPoint[],
  canvasWidth: number,
  canvasHeight: number,
  state: RepCounterState,
  isCompensated: boolean,
  activeIndices?: [number, number, number],
  currentAngle?: number
) {
  ctx.clearRect(0, 0, canvasWidth, canvasHeight)

  if (!landmarks || landmarks.length < 33) return

  const mainColor = getSkeletonColor(state, isCompensated)

  // 1. Gambar garis koneksi skeleton
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

    ctx.strokeStyle = isActiveConnection ? mainColor : "rgba(255, 255, 255, 0.45)"
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
    const isVertexJoint = activeIndices && activeIndices[1] === i

    ctx.beginPath()
    ctx.arc(px, py, isVertexJoint ? 10 : isActiveJoint ? 7 : 4, 0, 2 * Math.PI)

    ctx.fillStyle = isActiveJoint ? mainColor : "#ffffff"
    ctx.fill()
    ctx.strokeStyle = "#111111"
    ctx.lineWidth = 2
    ctx.stroke()

    // Cincin bercahaya di sekitar vertex joint
    if (isVertexJoint) {
      ctx.beginPath()
      ctx.arc(px, py, 15, 0, 2 * Math.PI)
      ctx.strokeStyle = mainColor
      ctx.lineWidth = 2.5
      ctx.stroke()
    }
  }

  // 3. Gambar badge angka sudut sendi aktif
  if (activeIndices && currentAngle !== undefined && currentAngle !== null && !isNaN(currentAngle)) {
    const vertexPoint = landmarks[activeIndices[1]]
    if (vertexPoint && (vertexPoint.visibility ?? 1) >= 0.35) {
      const vx = vertexPoint.x * canvasWidth
      const vy = vertexPoint.y * canvasHeight

      const text = `${Math.round(currentAngle)}°`
      const boxW = 54
      const boxH = 26

      ctx.save()
      // Pindahkan origin ke posisi badge
      const rawX = vx + 16
      const rawY = vy - 16
      const safeX = Math.min(canvasWidth - boxW - 8, Math.max(8, rawX))
      const safeY = Math.min(canvasHeight - boxH - 8, Math.max(8, rawY))

      // Un-mirror secara horizontal di posisi badge karena canvas memiliki CSS -scale-x-100
      ctx.translate(safeX + boxW / 2, safeY + boxH / 2)
      ctx.scale(-1, 1)

      // Background badge
      ctx.fillStyle = "rgba(15, 23, 42, 0.9)"
      ctx.beginPath()
      ctx.roundRect(-boxW / 2, -boxH / 2, boxW, boxH, 6)
      ctx.fill()
      ctx.strokeStyle = mainColor
      ctx.lineWidth = 2
      ctx.stroke()

      // Teks sudut
      ctx.font = "bold 14px system-ui, sans-serif"
      ctx.fillStyle = "#ffffff"
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      ctx.fillText(text, 0, 1)

      ctx.restore()
    }
  }
}
