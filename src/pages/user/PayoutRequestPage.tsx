import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext.tsx'
import { accountApi, paymentApi } from '../../utils/api.ts'
import { useTranslation } from 'react-i18next'
import Layout from '../../components/Layout.tsx'
import { useToast } from '../../contexts/ToastContext.tsx'
import type { Account, Payout } from '../../../shared/types'
import { th, td } from '../../utils/cssConstants.ts'

export default function PayoutRequestPage() {
  const { t } = useTranslation('common')
  const { user, loading: authLoading } = useAuth()
  const { addToast } = useToast()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [selectedAccount, setSelectedAccount] = useState<string>('')
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('crypto')
  const [walletAddress, setWalletAddress] = useState('')
  const [maxPayout, setMaxPayout] = useState(0)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [payouts, setPayouts] = useState<Payout[]>([])

  useEffect(() => {
    if (user) {
      accountApi
        .getAll()
        .then((data) => {
          const fundedAccounts = (data.accounts || []).filter((a: Account) => a.status === 'funded')
          setAccounts(fundedAccounts)
          if (fundedAccounts.length > 0) {
            setSelectedAccount(fundedAccounts[0].id)
            loadMaxPayout(fundedAccounts[0].id)
          }
        })
        .catch(() => {})
        .finally(() => setLoading(false))
      paymentApi.getPayouts().then((history: unknown) => setPayouts((history as unknown[]) || [])).catch(() => {})
    }
  }, [user])

  const loadMaxPayout = async (accountId: string) => {
    try {
      const data = await paymentApi.getMaxPayout(accountId)
      setMaxPayout(data.maxPayout)
    } catch {}
  }

  const handleSubmit = async () => {
    if (!selectedAccount || !amount) return
    const amt = Number(amount)
    if (amt <= 0) { addToast('Enter a valid amount', 'error'); return }
    if (amt > maxPayout) { addToast(t('payout.available', { amount: maxPayout.toFixed(2) }), 'error'); return }
    if (!walletAddress.trim()) { addToast('Enter your wallet address or bank details', 'error'); return }

    setSubmitting(true)
    try {
      await paymentApi.requestPayout(selectedAccount, amt, method, walletAddress.trim())
      addToast('Payout request submitted successfully', 'success')
      setAmount(''); setWalletAddress('')
      loadMaxPayout(selectedAccount)
      paymentApi.getPayouts().then((history: unknown) => setPayouts((history as unknown[]) || [])).catch(() => {})
    } catch (err: unknown) {
      addToast(err instanceof Error ? err.message : 'Failed to submit', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  if (authLoading || loading) return (
    <Layout><div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>{t('actions.loading')}</div></Layout>
  )

  return (
    <Layout>
      <div style={{ maxWidth: 700 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#e0e0e0', marginBottom: 24 }}>{t('payout.title')}</h1>

        {accounts.length === 0 ? (
          <div style={{ background: '#111827', borderRadius: 12, padding: 40, border: '1px solid #1f2937', textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>💰</div>
            <h2 style={{ color: '#e0e0e0', fontSize: 18, marginBottom: 8 }}>{t('payout.noFundedTitle')}</h2>
            <p style={{ color: '#6b7280', marginBottom: 24 }}>{t('payout.noFundedDesc')}</p>
            <a href="/pricing" style={{ display: 'inline-block', padding: '12px 28px', background: '#2563eb', color: '#fff', borderRadius: 8, textDecoration: 'none', fontSize: 15, fontWeight: 600 }}>
              {t('payout.getFunded')}
            </a>
          </div>
        ) : (
          <>
            <div style={{ background: '#111827', borderRadius: 12, padding: 24, border: '1px solid #1f2937', marginBottom: 24 }}>
              <h3 style={{ color: '#e0e0e0', fontSize: 16, marginBottom: 20 }}>{t('payout.request')}</h3>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', color: '#9ca3af', fontSize: 13, marginBottom: 6 }}>{t('payout.account')}</label>
                <select value={selectedAccount} onChange={(e) => { setSelectedAccount(e.target.value); loadMaxPayout(e.target.value) }}
                  style={{ width: '100%', padding: '10px 12px', background: '#1f2937', border: '1px solid #374151', borderRadius: 6, color: '#e0e0e0', fontSize: 14 }}>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>${a.accountSize.toLocaleString()} - {a.phase || a.status}</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', color: '#9ca3af', fontSize: 13, marginBottom: 6 }}>{t('payout.amount')}</label>
                <input type="number" step="0.01" min="1" value={amount} onChange={(e) => setAmount(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', background: '#1f2937', border: '1px solid #374151', borderRadius: 6, color: '#e0e0e0', fontSize: 14, boxSizing: 'border-box' }} placeholder="0.00" />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 12 }}>
                  <span style={{ color: '#6b7280' }}>{t('payout.available', { amount: maxPayout.toFixed(2) })}</span>
                  <span style={{ color: '#6b7280' }}>{t('payout.profitSplit', { percent: 80 })}</span>
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', color: '#9ca3af', fontSize: 13, marginBottom: 6 }}>{t('payout.method')}</label>
                <select value={method} onChange={(e) => setMethod(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', background: '#1f2937', border: '1px solid #374151', borderRadius: 6, color: '#e0e0e0', fontSize: 14 }}>
                  <option value="crypto">{t('payout.crypto')}</option>
                  <option value="bank">{t('payout.bankTransfer')}</option>
                </select>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', color: '#9ca3af', fontSize: 13, marginBottom: 6 }}>
                  {method === 'crypto' ? t('payout.walletAddress') : t('payout.bankDetails')}
                </label>
                <input type="text" value={walletAddress} onChange={(e) => setWalletAddress(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', background: '#1f2937', border: '1px solid #374151', borderRadius: 6, color: '#e0e0e0', fontSize: 14, boxSizing: 'border-box' }}
                  placeholder={method === 'crypto' ? t('payout.walletPlaceholder') : t('payout.bankPlaceholder')} />
              </div>

              <button onClick={handleSubmit} disabled={submitting || !selectedAccount || !amount || Number(amount) > maxPayout || !walletAddress.trim()}
                style={{ width: '100%', padding: '12px 0', background: submitting ? '#2563eb99' : '#22c55e', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: submitting ? 'not-allowed' : 'pointer' }}>
                {submitting ? t('payout.submitting') : t('payout.submit')}
              </button>
            </div>

            <div style={{ background: '#111827', borderRadius: 12, padding: 24, border: '1px solid #1f2937' }}>
              <h3 style={{ color: '#e0e0e0', fontSize: 16, marginBottom: 20 }}>{t('payout.history')}</h3>
              {payouts.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#6b7280', padding: 20 }}>{t('payout.noHistory')}</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#0a0e17' }}>
                      <th style={th}>{t('payout.date')}</th>
                      <th style={th}>{t('payout.amountCol')}</th>
                      <th style={th}>{t('payout.methodCol')}</th>
                      <th style={th}>{t('payout.statusCol')}</th>
                      <th style={th}>{t('payout.processed')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payouts.map((p) => (
                      <tr key={p.id} style={{ borderTop: '1px solid #1f2937' }}>
                        <td style={td}>{new Date(p.createdAt).toLocaleDateString()}</td>
                        <td style={{ ...td, fontWeight: 600, color: '#22c55e' }}>${Number(p.amount).toFixed(2)}</td>
                        <td style={{ ...td, color: '#9ca3af', fontSize: 11 }}>{p.method || '—'}</td>
                        <td style={td}>
                          <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11,
                            background: p.status === 'completed' ? '#22c55e20' : p.status === 'rejected' ? '#ef444420' : '#f59e0b20',
                            color: p.status === 'completed' ? '#22c55e' : p.status === 'rejected' ? '#ef4444' : '#f59e0b',
                            textTransform: 'uppercase' }}>{p.status}</span>
                        </td>
                        <td style={{ ...td, color: '#6b7280' }}>{p.processedAt ? new Date(p.processedAt).toLocaleDateString() : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>
    </Layout>
  )
}