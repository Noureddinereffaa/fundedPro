export interface TradeLayoutOptions {
  isFullscreen: boolean
  showMarketWatch: boolean
  showRightPanel: boolean
  styles?: Record<string, string>
}

export interface TradePanelClassOptions {
  isVisible: boolean
  baseClass: string
  collapsedClass: string
  styles?: Record<string, string>
}

export function buildTradeLayoutClassNames({ isFullscreen, showMarketWatch, showRightPanel, styles }: TradeLayoutOptions): string {
  const classes = [styles?.['trade-layout'] ?? 'trade-layout']

  if (isFullscreen) classes.push(styles?.['fullscreen-mode'] ?? 'fullscreen-mode')
  if (showMarketWatch) classes.push(styles?.['with-market-watch'] ?? 'with-market-watch')
  if (showRightPanel) classes.push(styles?.['with-right-panel'] ?? 'with-right-panel')

  return classes.join(' ')
}

export function buildTradePanelClassName({ isVisible, baseClass, collapsedClass, styles }: TradePanelClassOptions): string {
  const base = styles?.[baseClass] ?? baseClass
  const collapsed = styles?.[collapsedClass] ?? collapsedClass
  return [base, isVisible ? '' : collapsed].filter(Boolean).join(' ')
}
