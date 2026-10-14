export interface RomTrendPoint {
  date: string
  avg_rom: number
  target_rom?: number
  max_rom?: number
  exercise_name?: string
}

export type RomTrendResponse = RomTrendPoint[]
