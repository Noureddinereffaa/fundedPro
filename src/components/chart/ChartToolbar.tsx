import { useTranslation } from 'react-i18next'

interface ChartToolbarProps {
  drawingMode: string
  onModeChange: (mode: 'none' | 'hline' | 'trend') => void
  onClear: () => void
}

export function ChartToolbar({ drawingMode, onModeChange, onClear }: ChartToolbarProps) {
  const { t, i18n } = useTranslation('trading')
  const isRtl = i18n.language === 'ar'

  return (
    <div className="chart-toolbar" style={{ direction: isRtl ? 'rtl' : 'ltr' }}>
      <button
        className={`chart-indicator-btn ${drawingMode === 'hline' ? 'active' : ''}`}
        onClick={() => onModeChange(drawingMode === 'hline' ? 'none' : 'hline')}
        title={t('chartToolbar.hLine')}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        <span>{t('chartToolbar.hLine')}</span>
      </button>
      <button
        className={`chart-indicator-btn ${drawingMode === 'trend' ? 'active' : ''}`}
        onClick={() => onModeChange(drawingMode === 'trend' ? 'none' : 'trend')}
        title={t('chartToolbar.trend')}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="5" y1="19" x2="19" y2="5" />
        </svg>
        <span>{t('chartToolbar.trend')}</span>
      </button>
      <button className="chart-indicator-btn" onClick={onClear} title={t('chartToolbar.clear')}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
        <span>{t('chartToolbar.clear')}</span>
      </button>
    </div>
  )
}
