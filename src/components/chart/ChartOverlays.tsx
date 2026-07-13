import { useTranslation } from 'react-i18next'

interface MarketStatusInfo {
  open: boolean
  text?: string
  nextOpen?: number | null
}

interface ChartOverlaysProps {
  isOpen: boolean
  hasData: boolean
  isLoading: boolean
  marketStatus: MarketStatusInfo
  bg: string
  showLoading: boolean
  showRefreshing: boolean
}

export function ChartOverlays({
  isOpen,
  hasData,
  isLoading,
  marketStatus,
  bg,
  showLoading,
  showRefreshing,
}: ChartOverlaysProps) {
  const { t } = useTranslation('trading')

  return (
    <>
      {!isOpen && hasData && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: 6,
            zIndex: 5,
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              padding: '6px 16px',
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 600,
              background: '#ef444430',
              color: '#ef4444',
              backdropFilter: 'blur(4px)',
            }}
          >
            {marketStatus.text || t('chartOverlays.marketClosed')}
          </div>
          <div style={{ fontSize: 11, color: '#6b7280' }}>
            {t('chartOverlays.showingLastData')}
          </div>
        </div>
      )}
      {!isOpen && !hasData && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: 8,
            zIndex: 5,
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              padding: '8px 20px',
              borderRadius: 6,
              fontSize: 14,
              fontWeight: 600,
              background: '#6b728030',
              color: '#9ca3af',
              backdropFilter: 'blur(4px)',
            }}
          >
            {t('chartOverlays.marketClosed')}
          </div>
        </div>
      )}
      {isOpen && !isLoading && !hasData && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: 8,
            zIndex: 5,
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              padding: '8px 20px',
              borderRadius: 6,
              fontSize: 14,
              fontWeight: 600,
              background: '#6b728030',
              color: '#9ca3af',
              backdropFilter: 'blur(4px)',
            }}
          >
            {t('chartOverlays.noData')}
          </div>
        </div>
      )}
      {showLoading && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: `${bg}b0`,
            zIndex: 10,
            transition: 'opacity 0.2s',
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              border: '3px solid #1a1e2e',
              borderTopColor: '#3b82f6',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }}
          />
        </div>
      )}
      {showRefreshing && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 2,
            zIndex: 15,
            background: 'linear-gradient(90deg, transparent 25%, #3b82f6 50%, transparent 75%)',
            backgroundSize: '200% 100%',
            animation: 'loadingBar 1.2s ease-in-out infinite',
          }}
        />
      )}
    </>
  )
}
