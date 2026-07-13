import { useState, useEffect } from 'react'
import AdminLayout from './AdminLayout.tsx'
import { adminApi } from '../../utils/api.ts'
import { useTranslation } from 'react-i18next'
import type { Violation } from '../../../shared/types'
import { th, td } from '../../utils/cssConstants.ts'

export default function AdminViolationsPage() {
  const { t } = useTranslation('admin')
  const [violations, setViolations] = useState<Violation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminApi
      .getViolations()
      .then(setViolations)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const ruleTypeColor: Record<string, string> = {
    daily_loss: '#ef4444',
    overall_loss: '#ef4444',
    max_open_trades: '#f59e0b',
    max_lot_size: '#f59e0b',
    news_restriction: '#8b5cf6',
    min_trading_days: '#6b7280',
  }

  return (
    <AdminLayout active="violations">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#e0e0e0', margin: 0 }}>{t('violations.title')}</h1>
        <span style={{ color: '#6b7280', fontSize: 13 }}>{t('violations.totalViolations', { count: violations.length })}</span>
      </div>

      <div
        style={{ background: '#111827', borderRadius: 12, border: '1px solid #1f2937', overflowX: 'auto' }}
      >
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>{t('violations.loading')}</div>
        ) : violations.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>{t('violations.noViolations')}</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#0a0e17' }}>
                <th style={th}>{t('violations.date')}</th>
                <th style={th}>{t('violations.ruleType')}</th>
                <th style={th}>{t('violations.description')}</th>
                <th style={th}>{t('violations.accountSize')}</th>
                <th style={th}>{t('violations.accountStatus')}</th>
                <th style={th}>{t('violations.data')}</th>
              </tr>
            </thead>
            <tbody>
              {violations.map((v) => (
                <tr key={v.id} style={{ borderTop: '1px solid #1f2937' }}>
                  <td style={{ ...td, color: '#6b7280' }}>{new Date(v.createdAt).toLocaleString()}</td>
                  <td style={td}>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: 4,
                        fontSize: 11,
                        background: `${ruleTypeColor[v.ruleType] || '#6b7280'}20`,
                        color: ruleTypeColor[v.ruleType] || '#6b7280',
                        textTransform: 'uppercase',
                      }}
                    >
                      {v.ruleType.replace('_', ' ')}
                    </span>
                  </td>
                  <td style={td}>{v.description || '-'}</td>
                  <td style={td}>${v.account.accountSize.toLocaleString()}</td>
                  <td style={td}>{v.account.status}</td>
                  <td style={td}>
                    {v.violationData ? (
                      <span style={{ color: '#6b7280', fontSize: 11 }}>
                        {JSON.stringify(v.violationData).slice(0, 60)}...
                      </span>
                    ) : (
                      '-'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AdminLayout>
  )
}