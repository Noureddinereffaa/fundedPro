import { describe, expect, it } from 'vitest'
import { buildTradeLayoutClassNames, buildTradePanelClassName } from '../utils/tradeLayout'

describe('trade layout helpers', () => {
  it('builds the expected class names for a focused chart experience', () => {
    const classes = buildTradeLayoutClassNames({
      isFullscreen: true,
      showMarketWatch: true,
      showRightPanel: true,
    })

    expect(classes).toContain('fullscreen-mode')
    expect(classes).toContain('with-market-watch')
    expect(classes).toContain('with-right-panel')
  })

  it('keeps the base layout class when panels are hidden', () => {
    const classes = buildTradeLayoutClassNames({
      isFullscreen: false,
      showMarketWatch: false,
      showRightPanel: false,
    })

    expect(classes).toContain('trade-layout')
    expect(classes).not.toContain('fullscreen-mode')
  })

  it('adds the collapsed modifier when a panel is hidden', () => {
    const classes = buildTradePanelClassName({
      isVisible: false,
      baseClass: 'trade-right-panel',
      collapsedClass: 'trade-right-panel-collapsed',
    })

    expect(classes).toContain('trade-right-panel')
    expect(classes).toContain('trade-right-panel-collapsed')
  })
})
