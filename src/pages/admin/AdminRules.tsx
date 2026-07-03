import { useState } from 'react'
import AdminLayout from './AdminLayout.tsx'
import { adminApi } from '../../utils/api.ts'
import { useToast } from '../../contexts/ToastContext.tsx'

const accountSizes = [5000, 10000, 25000, 50000, 100000, 200000]
const phases = ['evaluation_1', 'evaluation_2', 'funded']

export default function AdminRulesPage() {
  const { addToast } = useToast()
  const [selectedSize, setSelectedSize] = useState(10000)
  const [selectedPhase, setSelectedPhase] = useState('evaluation_1')
  const [form, setForm] = useState({
    profitTarget: 8,
    maxDailyLoss: 6,
    maxOverallLoss: 10,
    maxPositionSize: 5,
    maxLeverage: 100,
    maxOpenTrades: 5,
    minTradingDays: 5,
    maxTradingDays: 30,
    commission: 0,
    spreadMarkup: 0,
    newsRestriction: false,
    weekendTrading: false,
  })
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    setSuccess(false)
    try {
      await adminApi.updateRules(selectedSize, selectedPhase, form)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: any) {
      addToast(err.message || 'Failed to save', 'error')
    } finally {
      setSaving(false)
    }
  }

  const update = (field: string, value: any) => setForm(prev => ({ ...prev, [field]: value }))

  return (
    <AdminLayout active="rules">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#e0e0e0', margin: 0 }}>Trading Rules Configuration</h1>
        <span style={{ color: '#6b7280', fontSize: 13 }}>Configure rules per account size and phase</span>
      </div>

      <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
        <div>
          <label style={labelStyle}>Account Size</label>
          <select value={selectedSize} onChange={e => setSelectedSize(Number(e.target.value))} style={select}>
            {accountSizes.map(s => <option key={s} value={s}>${s.toLocaleString()}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Phase</label>
          <select value={selectedPhase} onChange={e => setSelectedPhase(e.target.value)} style={select}>
            {phases.map(p => <option key={p} value={p}>{p.replace('_', ' ')}</option>)}
          </select>
        </div>
      </div>

      <div style={{ background: '#111827', borderRadius: 12, border: '1px solid #1f2937', padding: 24, maxWidth: 700 }}>
        <h3 style={{ color: '#e0e0e0', fontSize: 16, marginBottom: 20 }}>Rules for ${(selectedSize / 1000).toFixed(0)}K - {selectedPhase.replace('_', ' ')}</h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
          <Field label="Profit Target (%)" value={form.profitTarget} onChange={v => update('profitTarget', v)} />
          <Field label="Max Daily Loss (%)" value={form.maxDailyLoss} onChange={v => update('maxDailyLoss', v)} />
          <Field label="Max Overall Loss (%)" value={form.maxOverallLoss} onChange={v => update('maxOverallLoss', v)} />
          <Field label="Max Position Size (lots)" value={form.maxPositionSize} onChange={v => update('maxPositionSize', v)} />
          <Field label="Max Leverage" value={form.maxLeverage} onChange={v => update('maxLeverage', v)} />
          <Field label="Max Open Trades" value={form.maxOpenTrades} onChange={v => update('maxOpenTrades', v)} />
          <Field label="Min Trading Days" value={form.minTradingDays} onChange={v => update('minTradingDays', v)} />
          <Field label="Max Trading Days" value={form.maxTradingDays} onChange={v => update('maxTradingDays', v)} />
          <Field label="Commission ($)" value={form.commission} onChange={v => update('commission', v)} />
          <Field label="Spread Markup" value={form.spreadMarkup} onChange={v => update('spreadMarkup', v)} />
        </div>

        <div style={{ display: 'flex', gap: 20, marginBottom: 24 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#9ca3af', fontSize: 13, cursor: 'pointer' }}>
            <input type="checkbox" checked={form.newsRestriction} onChange={e => update('newsRestriction', e.target.checked)} />
            News Trading Restriction
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#9ca3af', fontSize: 13, cursor: 'pointer' }}>
            <input type="checkbox" checked={form.weekendTrading} onChange={e => update('weekendTrading', e.target.checked)} />
            Allow Weekend Trading
          </label>
        </div>

        {success && (
          <div style={{ background: '#064e3b', color: '#6ee7b7', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
            Rules saved successfully!
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: '10px 24px', background: saving ? '#2563eb99' : '#2563eb',
            color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600,
            cursor: saving ? 'not-allowed' : 'pointer',
          }}
        >
          {saving ? 'Saving...' : 'Save Rules'}
        </button>
      </div>
    </AdminLayout>
  )
}

function Field({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <input
        type="number"
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={input}
      />
    </div>
  )
}

const labelStyle: React.CSSProperties = { display: 'block', fontSize: 12, color: '#6b7280', marginBottom: 4 }
const input: React.CSSProperties = {
  width: '100%', padding: '8px 10px', background: '#1f2937', border: '1px solid #374151',
  borderRadius: 6, color: '#e0e0e0', fontSize: 13, boxSizing: 'border-box',
}
const select: React.CSSProperties = {
  padding: '8px 12px', background: '#1f2937', border: '1px solid #374151',
  borderRadius: 6, color: '#e0e0e0', fontSize: 13,
}
