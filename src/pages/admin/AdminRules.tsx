import { useState, useEffect, useCallback } from 'react'
import AdminLayout from './AdminLayout.tsx'
import { adminApi } from '../../utils/api.ts'
import { useTranslation } from 'react-i18next'
import { useToast } from '../../contexts/ToastContext.tsx'

const accountSizes = [5000, 10000, 25000, 50000, 100000, 200000]
const phases = ['evaluation_1', 'evaluation_2', 'funded']
const phaseLabels: Record<string, string> = {
  evaluation_1: 'Phase 1', evaluation_2: 'Phase 2', funded: 'Funded',
}

const DEFAULTS: Record<string, any> = {
  profitTarget: 8, maxDailyLoss: 5, maxOverallLoss: 10,
  maxPositionSize: 5, maxLeverage: 100, maxOpenTrades: 10,
  minTradingDays: 5, maxTradingDays: 30,
  commission: 0, spreadMarkup: 0,
  newsRestriction: false,
}

const FIELDS: { key: string; label: string; type: 'number' | 'bool'; min?: number; max?: number; step?: number; suffix?: string }[] = [
  { key: 'profitTarget', label: 'Profit Target', type: 'number', min: 0, max: 100, step: 0.1, suffix: '%' },
  { key: 'maxDailyLoss', label: 'Max Daily Loss', type: 'number', min: 0, max: 50, step: 0.1, suffix: '%' },
  { key: 'maxOverallLoss', label: 'Max Overall Loss', type: 'number', min: 0, max: 50, step: 0.1, suffix: '%' },
  { key: 'maxPositionSize', label: 'Max Position Size', type: 'number', min: 0, max: 100, step: 0.1, suffix: ' lots' },
  { key: 'maxLeverage', label: 'Max Leverage', type: 'number', min: 1, max: 500, step: 1, suffix: 'x' },
  { key: 'maxOpenTrades', label: 'Max Open Trades', type: 'number', min: 1, max: 100, step: 1 },
  { key: 'minTradingDays', label: 'Min Trading Days', type: 'number', min: 0, max: 180, step: 1 },
  { key: 'maxTradingDays', label: 'Max Trading Days', type: 'number', min: 0, max: 365, step: 1 },
  { key: 'commission', label: 'Commission', type: 'number', min: 0, max: 50, step: 0.5, suffix: '$' },
  { key: 'spreadMarkup', label: 'Spread Markup', type: 'number', min: 0, max: 10, step: 0.1, suffix: ' pips' },
  { key: 'newsRestriction', label: 'News Restriction', type: 'bool' },
]

export default function AdminRulesPage() {
  const { t } = useTranslation('admin')
  const { addToast } = useToast()
  const [selectedSize, setSelectedSize] = useState(10000)
  const [selectedPhase, setSelectedPhase] = useState('evaluation_1')
  const [form, setForm] = useState<Record<string, any>>({ ...DEFAULTS })
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [activeView, setActiveView] = useState<'edit' | 'matrix'>('edit')
  const [applyToExisting, setApplyToExisting] = useState(false)

  const loadConfig = useCallback(async () => {
    setLoading(true)
    try {
      const config = await adminApi.getRules(selectedSize, selectedPhase)
      if (config) {
        const mapped: Record<string, any> = {}
        for (const f of FIELDS) {
          mapped[f.key] = config[f.key] !== null && config[f.key] !== undefined ? Number(config[f.key]) : DEFAULTS[f.key]
        }
        setForm(mapped)
      } else {
        setForm({ ...DEFAULTS })
      }
    } catch {
      setForm({ ...DEFAULTS })
    } finally { setLoading(false) }
  }, [selectedSize, selectedPhase])

  useEffect(() => { loadConfig() }, [loadConfig])

  const handleSave = async () => {
    setSaving(true)
    setSuccess(false)
    try {
      const payload: Record<string, any> = { applyToExisting }
      for (const f of FIELDS) {
        payload[f.key] = form[f.key]
      }
      await adminApi.updateRules(selectedSize, selectedPhase, payload)
      setSuccess(true)
      setApplyToExisting(false)
      addToast(t('rules.savedSuccess'), 'success')
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: unknown) {
      addToast(err instanceof Error ? err.message : t('rules.saveFailed'), 'error')
    } finally { setSaving(false) }
  }

  const resetDefaults = () => setForm({ ...DEFAULTS })

  const update = (key: string, value: number | boolean) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const isDirty = FIELDS.some((f) => String(form[f.key]) !== String(DEFAULTS[f.key]))

  return (
    <AdminLayout active="rules">
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#e0e0e0', margin: 0 }}>{t('rules.title')}</h1>
          <span style={{ color: '#6b7280', fontSize: 13 }}>{t('rules.subtitle')}</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setActiveView('edit')}
            style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid #374151', background: activeView === 'edit' ? '#2563eb' : '#1f2937', color: '#e0e0e0', fontSize: 12, cursor: 'pointer' }}>
            {t('rules.editMode')}
          </button>
          <button onClick={() => setActiveView('matrix')}
            style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid #374151', background: activeView === 'matrix' ? '#2563eb' : '#1f2937', color: '#e0e0e0', fontSize: 12, cursor: 'pointer' }}>
            {t('rules.matrixView')}
          </button>
        </div>
      </div>

      {activeView === 'matrix' ? <MatrixView /> : (
        <>
          <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
            <div>
              <label style={s.label}>{t('rules.accountSizeLabel')}</label>
              <select value={selectedSize} onChange={(e) => setSelectedSize(Number(e.target.value))} style={s.select}>
                {accountSizes.map((sz) => <option key={sz} value={sz}>${sz.toLocaleString()}</option>)}
              </select>
            </div>
            <div>
              <label style={s.label}>{t('rules.phaseLabel')}</label>
              <select value={selectedPhase} onChange={(e) => setSelectedPhase(e.target.value)} style={s.select}>
                {phases.map((p) => <option key={p} value={p}>{phaseLabels[p]}</option>)}
              </select>
            </div>
          </div>

          <div style={{ background: '#111827', borderRadius: 12, border: '1px solid #1f2937', padding: 24, maxWidth: 800 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ color: '#e0e0e0', fontSize: 16, margin: 0 }}>
                {t('rules.rulesFor', { size: (selectedSize / 1000).toFixed(0), phase: phaseLabels[selectedPhase] })}
              </h3>
              {isDirty && (
                <button onClick={resetDefaults}
                  style={{ padding: '4px 12px', background: '#374151', border: '1px solid #4b5563', borderRadius: 6, color: '#9ca3af', fontSize: 11, cursor: 'pointer' }}>
                  {t('rules.resetDefaults')}
                </button>
              )}
            </div>

            {loading ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>{t('rules.loading')}</div>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16, marginBottom: 20 }}>
                  {FIELDS.map((f) => (
                    <div key={f.key}>
                      <label style={s.label}>{t(`rules.fields.${f.key}`)}</label>
                      {f.type === 'bool' ? (
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#9ca3af', fontSize: 13, cursor: 'pointer', paddingTop: 4 }}>
                          <input type="checkbox" checked={!!form[f.key]}
                            onChange={(e) => update(f.key, e.target.checked)} />
                          {form[f.key] ? t('rules.enabled') : t('rules.disabled')}
                        </label>
                      ) : (
                        <div style={{ position: 'relative' }}>
                          <input type="number" value={form[f.key] ?? ''}
                            min={f.min} max={f.max} step={f.step}
                            onChange={(e) => update(f.key, e.target.value === '' ? 0 : Number(e.target.value))}
                            style={s.input} />
                          {f.suffix && <span style={{ position: 'absolute', right: 8, top: 8, color: '#6b7280', fontSize: 11 }}>{f.suffix}</span>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {success && (
                  <div style={{ background: '#064e3b', color: '#6ee7b7', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
                    {t('rules.savedSuccess')}
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#e0e0e0', fontSize: 14, cursor: 'pointer' }}>
                    <input type="checkbox" checked={applyToExisting} onChange={(e) => setApplyToExisting(e.target.checked)} />
                    {t('rules.applyToExisting', 'Apply these changes to all existing active accounts immediately')}
                  </label>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <button onClick={handleSave} disabled={saving}
                      style={{ padding: '10px 24px', background: saving ? '#2563eb99' : '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer' }}>
                      {saving ? t('rules.saving') : t('rules.saveRules')}
                    </button>
                    {isDirty && (
                      <button onClick={resetDefaults}
                        style={{ padding: '10px 24px', background: '#1f2937', border: '1px solid #374151', borderRadius: 8, color: '#9ca3af', fontSize: 14, cursor: 'pointer' }}>
                        {t('rules.cancel')}
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </AdminLayout>
  )
}

// ── Matrix View ────────────────────────────────────────────────

function MatrixView() {
  const { t } = useTranslation('admin')
  const [matrix, setMatrix] = useState<Record<string, Record<string, Record<string, any>>>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    adminApi.getRulesMatrix().then((data) => {
      setMatrix(data.matrix || {})
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const summaryKeys = ['profitTarget', 'maxDailyLoss', 'maxOverallLoss', 'maxPositionSize', 'commission']

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>{t('rules.loadingMatrix')}</div>

  return (
    <div style={{ background: '#111827', borderRadius: 12, border: '1px solid #1f2937', overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr>
            <th style={s.th}>{t('rules.accountSize')}</th>
            <th style={s.th}>{t('rules.phase')}</th>
            {summaryKeys.map((k) => <th key={k} style={s.th}>{FIELDS.find((f) => f.key === k)?.label || k}</th>)}
          </tr>
        </thead>
        <tbody>
          {accountSizes.map((size) =>
            phases.map((phase, pi) => (
              <tr key={`${size}-${phase}`} style={{ borderTop: '1px solid #1f2937' }}>
                {pi === 0 && (
                  <td rowSpan={phases.length} style={{ ...s.td, fontWeight: 600, color: '#e0e0e0', verticalAlign: 'middle' }}>
                    ${size.toLocaleString()}
                  </td>
                )}
                <td style={{ ...s.td, color: '#9ca3af' }}>{phaseLabels[phase]}</td>
                {summaryKeys.map((k) => {
                  const val = matrix[size]?.[phase]?.[k]
                  const isSet = val !== null && val !== undefined
                  return (
                    <td key={k} style={{ ...s.td, color: isSet ? '#d1d4dc' : '#6b7280' }}>
                      {isSet ? (typeof val === 'boolean' ? (val ? t('rules.yes') : t('rules.no')) : val) : '—'}
                    </td>
                  )
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  label: { display: 'block', fontSize: 12, color: '#6b7280', marginBottom: 4 },
  input: {
    width: '100%', padding: '8px 10px', background: '#1f2937',
    border: '1px solid #374151', borderRadius: 6, color: '#e0e0e0',
    fontSize: 13, boxSizing: 'border-box',
    paddingRight: 40,
  },
  select: { padding: '8px 12px', background: '#1f2937', border: '1px solid #374151', borderRadius: 6, color: '#e0e0e0', fontSize: 13 },
  th: { padding: '10px 14px', color: '#787b86', fontSize: 11, fontWeight: 600, textAlign: 'left', borderBottom: '1px solid #1f2937' },
  td: { padding: '10px 14px', fontSize: 12, borderBottom: '1px solid #1f2937' },
}