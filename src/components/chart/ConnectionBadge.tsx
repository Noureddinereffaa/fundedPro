import { useTranslation } from 'react-i18next'
import type { ConnectionStatus } from '../../../shared/types'

interface ConnectionBadgeProps {
  connectionStatus?: ConnectionStatus
  bg: string
}

export function ConnectionBadge({ connectionStatus, bg }: ConnectionBadgeProps) {
  const { t } = useTranslation('trading')
  if (!connectionStatus) return null

  const statusColor =
    connectionStatus === 'connected' ? '#26a69a' : connectionStatus === 'connecting' ? '#ffb74d' : '#ef5350'
  const statusKey =
    connectionStatus === 'connected'
      ? 'connection.live'
      : connectionStatus === 'connecting'
        ? 'connection.connecting'
        : 'connection.offline'

  return (
    <div
      style={{
        position: 'absolute',
        top: 8,
        right: 8,
        zIndex: 20,
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        padding: '3px 8px',
        borderRadius: 4,
        background: `${bg}cc`,
        fontSize: 10,
        fontWeight: 600,
        color: statusColor,
        pointerEvents: 'none',
        backdropFilter: 'blur(4px)',
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: statusColor,
          display: 'inline-block',
        }}
      />
      <span>{t(statusKey)}</span>
    </div>
  )
}
