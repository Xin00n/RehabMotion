import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts"
import type { RomTrendPoint } from "@/types/analytics"

interface RomTrendChartProps {
  data: RomTrendPoint[]
  targetRom?: number
  height?: number
}

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{ value: number; name: string }>
  label?: string
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover text-popover-foreground border-2 border-border p-3 rounded-lg shadow-md text-sm space-y-1">
        <p className="font-bold text-foreground">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} className="text-sm font-semibold flex items-center gap-2">
            <span className="size-2.5 rounded-full bg-primary inline-block" />
            <span>
              {entry.name}: <strong className="text-foreground">{entry.value}°</strong>
            </span>
          </p>
        ))}
      </div>
    )
  }
  return null
}

export function RomTrendChart({ data, targetRom, height = 340 }: RomTrendChartProps) {
  if (!data || data.length === 0) {
    return (
      <div
        style={{ height }}
        className="w-full flex items-center justify-center border-2 border-dashed border-border rounded-xl bg-card/50 p-6 text-center"
      >
        <p className="text-base text-muted-foreground">
          Belum ada rekaman grafik sudut sendi. Selesaikan beberapa sesi latihan untuk melihat tren pemulihan gerak Anda.
        </p>
      </div>
    )
  }

  // Format tanggal singkat untuk sumbu X
  const formattedData = data.map((item) => {
    let displayDate = item.date
    try {
      const d = new Date(item.date)
      if (!isNaN(d.getTime())) {
        displayDate = d.toLocaleDateString("id-ID", {
          day: "numeric",
          month: "short",
        })
      }
    } catch {
      // Pertahankan string asli jika parsing gagal
    }

    return {
      ...item,
      displayDate,
      avg_rom: Math.round(item.avg_rom * 10) / 10,
    }
  })

  // Target ROM dari props atau dari data point pertama yang memiliki target_rom
  const effectiveTarget =
    targetRom ?? data.find((d) => d.target_rom !== undefined)?.target_rom

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={formattedData} margin={{ top: 20, right: 24, left: -10, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-border" />
          <XAxis
            dataKey="displayDate"
            tick={{ fill: "currentColor" }}
            className="text-xs sm:text-sm text-muted-foreground"
            tickLine={false}
          />
          <YAxis
            domain={[0, 180]}
            tick={{ fill: "currentColor" }}
            className="text-xs sm:text-sm text-muted-foreground"
            unit="°"
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} />

          {effectiveTarget && (
            <ReferenceLine
              y={effectiveTarget}
              stroke="var(--warning)"
              strokeDasharray="5 5"
              strokeWidth={2}
              label={{
                value: `Target: ${effectiveTarget}°`,
                position: "insideTopRight",
                fill: "currentColor",
                className: "text-xs font-bold text-foreground",
              }}
            />
          )}

          <Line
            type="monotone"
            dataKey="avg_rom"
            name="Sudut Gerak Rata-rata"
            stroke="currentColor"
            className="text-primary"
            strokeWidth={3}
            dot={{ r: 5, fill: "currentColor", strokeWidth: 2 }}
            activeDot={{ r: 8, strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
