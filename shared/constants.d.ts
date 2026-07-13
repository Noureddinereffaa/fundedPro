export interface IntervalDef {
  id: string
  sec: number
}

export const ALL_INTERVALS: IntervalDef[]
export const COMMON_INTERVALS: string[]

export function cacheTTL(intervalId: string): number
export function intervalsToSeconds(intervalId: string): number
