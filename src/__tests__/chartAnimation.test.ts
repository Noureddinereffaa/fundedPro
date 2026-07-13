import { describe, expect, it } from 'vitest'
import { buildPulseState, getAnimationIntensity, getPulseVisualStyle } from '../utils/chartAnimation'

describe('chart animation helpers', () => {
  it('builds a pulse state for live updates', () => {
    const state = buildPulseState(120, 121)
    expect(state).toMatchObject({ direction: 'up', intensity: 1 })
  })

  it('returns a lower intensity for small changes', () => {
    expect(getAnimationIntensity(0.5)).toBeLessThan(getAnimationIntensity(3))
  })

  it('returns a stronger visual style for large pulses', () => {
    const active = getPulseVisualStyle('up', 1)
    const idle = getPulseVisualStyle('flat', 0)

    expect(active.lineWidth).toBeGreaterThan(idle.lineWidth)
    expect(active.opacity).toBeGreaterThan(idle.opacity)
  })
})
