import { useState, useEffect } from 'react'
import AdminLayout from './AdminLayout.tsx'
import { adminApi } from '../../utils/api.ts'

interface Violation {
  id: string
  ruleType: string
  description?: string
  violationData?: any
  createdAt: string
  account: { accountSize: number; status: string }
}

export default function AdminViolationsPage() {
  const [violations, setViolations] = useState<Violation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminApi.getViolations().then(setViolations).catch(() => {}).finally(() => setLoading(false))
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
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#e0e0e0', margin: 0 }}>Rule Violations</h1>
        <span style={{ color: '#6b7280', fontSize: 13 }}>{violations.length} total violations</span>
      </div>

      <div style={{ background: '#111827', borderRadius: 12, border: '1px solid #1f2937', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Loading...</div>
        ) : violations.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>No violations recorded</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#0a0e17' }}>
                <th style={th}>Date</th>
                <th style={th}>Rule Type</th>
                <th style={th}>Description</th>
                <th style={th}>Account Size</th>
                <th style={th}>Account Status</th>
                <th style={th}>Data</th>
              </tr>
            </thead>
            <tbody>
              {violations.map(v => (
                <tr key={v.id} style={{ borderTop: '1px solid #1f2937' }}>
                  <td style={{ ...td, color: '#6b7280' }}>{new Date(v.createdAt).toLocaleString()}</td>
                  <td style={td}>
                    <span style={{
                      padding: '2px 8px', borderRadius: 4, fontSize: 11,
                      background: `${ruleTypeColor[v.ruleType] || '#6b7280'}20`,
                      color: ruleTypeColor[v.ruleType] || '#6b7280',
                      textTransform: 'uppercase',
                    }}>{v.ruleType.replace('_', ' ')}</span>
                  </td>
                  <td style={td}>{v.description || '-'}</td>
                  <td style={td}>${v.account.accountSize.toLocaleString()}</td>
                  <td style={td}>{v.account.status}</td>
                  <td style={td}>
                    {v.violationData ? (
                      <span style={{ color: '#6b7280', fontSize: 11 }}>{JSON.stringify(v.violationData).slice(0, 60)}...</span>
                    ) : '-'}
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

const th: React.CSSProperties = { padding: '12px 14px', textAlign: 'left', color: '#6b7280', fontWeight: 500, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }
const td: React.CSSProperties = { padding: '10px 14px', color: '#e0e0e0' }
