import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { ALL_SYMBOLS } from '../utils/marketData.ts'
import { alertApi } from '../utils/api.ts'
import { useToast } from '../contexts/ToastContext.tsx'
import type { Alert } from '../../shared/types'

export default function AlertsPage() {
  const { t } = useTranslation('common')
  const { addToast } = useToast()
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [symbol, setSymbol] = useState('EURUSD')
  const [condition, setCondition] = useState<'above' | 'below'>('above')
  const [price, setPrice] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const load = () => {
    setLoading(true)
    alertApi.list().then(setAlerts).catch(() => {}).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!price) return
    setSubmitting(true)
    try {
      await alertApi.create({ symbol, condition, price: Number(price), message: message || undefined })
      addToast('Alert created', 'success')
      setPrice('')
      setMessage('')
      load()
    } catch (err: unknown) {
      addToast(err instanceof Error ? err.message : 'Failed', 'error')
    } finally { setSubmitting(false) }
  }

  const handleDelete = async (id: string) => {
    try {
      await alertApi.delete(id)
      setAlerts((prev) => prev.filter((a) => a.id !== id))
      addToast('Alert deleted', 'success')
    } catch { addToast('Failed to delete', 'error') }
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 16px' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: '#e0e0e0', marginBottom: 24 }}>{t('alerts.title')}</h1>

      <div style={{ background: '#111827', borderRadius: 12, padding: 24, border: '1px solid #1f2937', marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: '#d1d4dc', marginBottom: 16 }}>{t('alerts.newAlert')}</h2>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', gap: 12 }}>
            <select value={symbol} onChange={(e) => setSymbol(e.target.value)}
              style={{ flex: 1, padding: '8px 12px', background: '#1f2937', border: '1px solid #374151', borderRadius: 6, color: '#e0e0e0' }}>
              {ALL_SYMBOLS.map((s) => (
                <option key={s.symbol} value={s.symbol}>{s.symbol} — {s.name}</option>
              ))}
            </select>
            <select value={condition} onChange={(e) => setCondition(e.target.value as 'above' | 'below')}
              style={{ padding: '8px 12px', background: '#1f2937', border: '1px solid #374151', borderRadius: 6, color: '#e0e0e0' }}>
              <option value="above">{t('alerts.priceAbove')}</option>
              <option value="below">{t('alerts.priceBelow')}</option>
            </select>
            <input type="number" step="any" value={price} onChange={(e) => setPrice(e.target.value)} placeholder={t('alerts.price')}
              style={{ width: 140, padding: '8px 12px', background: '#1f2937', border: '1px solid #374151', borderRadius: 6, color: '#e0e0e0' }} />
          </div>
          <input value={message} onChange={(e) => setMessage(e.target.value)} placeholder={t('alerts.optionalMessage')}
            style={{ padding: '8px 12px', background: '#1f2937', border: '1px solid #374151', borderRadius: 6, color: '#e0e0e0' }} />
          <button type="submit" disabled={submitting || !price}
            style={{ padding: '10px 20px', background: '#2962ff', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer', opacity: submitting || !price ? 0.6 : 1 }}>
            {submitting ? t('alerts.creating') : t('alerts.createAlert')}
          </button>
        </form>
      </div>

      <div style={{ background: '#111827', borderRadius: 12, border: '1px solid #1f2937' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>{t('actions.loading')}</div>
        ) : alerts.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>{t('alerts.noAlerts')}</div>
        ) : (
          <div>
            {alerts.map((a) => (
              <div key={a.id} style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid #1f2937', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ color: '#e0e0e0', fontWeight: 600, fontSize: 14 }}>{a.symbol}</div>
                  <div style={{ color: '#9ca3af', fontSize: 12, marginTop: 2 }}>
                    {a.condition === 'above' ? `↑ ${t('alerts.priceAbove')}` : `↓ ${t('alerts.priceBelow')}`} {a.price}
                    {a.message && <> — {a.message}</>}
                  </div>
                </div>
                <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11,
                  background: a.status === 'active' ? '#22c55e20' : '#f59e0b20',
                  color: a.status === 'active' ? '#22c55e' : '#f59e0b' }}>
                  {a.status === 'active' ? t('alerts.active') : t('alerts.triggered')}
                </span>
                <span style={{ color: '#6b7280', fontSize: 11 }}>{new Date(a.createdAt).toLocaleDateString()}</span>
                <button onClick={() => handleDelete(a.id)}
                  style={{ padding: '4px 10px', background: '#ef444420', color: '#ef4444', border: '1px solid #ef444440', borderRadius: 4, cursor: 'pointer', fontSize: 11 }}>
                  {t('alerts.delete')}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
