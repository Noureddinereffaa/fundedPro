export interface PulseState {
  direction: 'up' | 'down' | 'flat'
  intensity: number
}

export interface PulseVisualStyle {
  color: string
  lineWidth: number
  opacity: number
}

export function buildPulseState(previous: number, current: number): PulseState {
  if (!Number.isFinite(previous) || !Number.isFinite(current)) return { direction: 'flat', intensity: 0 }
  const delta = current - previous
  if (Math.abs(delta) < 0.000001) return { direction: 'flat', intensity: 0 }
  return {
    direction: delta > 0 ? 'up' : 'down',
    intensity: Math.abs(delta) >= 1 ? 1 : 0.8,
  }
}

export function getAnimationIntensity(changePercent: number): number {
  if (!Number.isFinite(changePercent)) return 0
  return Math.min(3, Math.max(0.4, changePercent / 4))
}

export function getPulseVisualStyle(direction: PulseState['direction'], intensity: number): PulseVisualStyle {
  if (direction === 'up') {
    return {
      color: '#fbbf24',
      lineWidth: 2 + Math.round(Math.min(2, intensity)),
      opacity: 0.8 + Math.min(0.15, intensity * 0.08),
    }
  }

  if (direction === 'down') {
    return {
      color: '#fb923c',
      lineWidth: 2 + Math.round(Math.min(2, intensity)),
      opacity: 0.8 + Math.min(0.15, intensity * 0.08),
    }
  }

  return {
    color: '#f59e0b',
    lineWidth: 2,
    opacity: 0.75,
  }
}
