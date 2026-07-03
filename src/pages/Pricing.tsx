import { useState } from 'react'
import { paymentApi } from '../utils/api.ts'
import { useToast } from '../contexts/ToastContext.tsx'
import Layout from '../components/Layout.tsx'

const accountSizes = [5000, 10000, 25000, 50000, 100000, 200000]

const plans: Record<number, { evalPrice: number; instantPrice: number; dailyLoss: number; profitTarget: number }> = {
  5000:   { evalPrice: 49,   instantPrice: 99,   dailyLoss: 6, profitTarget: 8 },
  10000:  { evalPrice: 89,   instantPrice: 189,  dailyLoss: 6, profitTarget: 8 },
  25000:  { evalPrice: 189,  instantPrice: 389,  dailyLoss: 6, profitTarget: 8 },
  50000:  { evalPrice: 289,  instantPrice: 589,  dailyLoss: 6, profitTarget: 8 },
  100000: { evalPrice: 489,  instantPrice: 989,  dailyLoss: 6, profitTarget: 8 },
  200000: { evalPrice: 989,  instantPrice: 1989, dailyLoss: 6, profitTarget: 8 },
}

interface CryptoPaymentData {
  txId: string
  amount: number
  walletAddress: string
  network: string
  networks: Array<{ name: string; address: string; label: string }>
}

export default function PricingPage() {
  const [selectedType, setSelectedType] = useState<'evaluation' | 'funded'>('evaluation')
  const [loading, setLoading] = useState<number | null>(null)
  const [cryptoPayment, setCryptoPayment] = useState<CryptoPaymentData | null>(null)
  const [selectedNetwork, setSelectedNetwork] = useState('BTC')
  const [txHash, setTxHash] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { addToast } = useToast()

  const handlePurchase = async (accountSize: number) => {
    setLoading(accountSize)
    try {
      const result = await paymentApi.checkout(accountSize, selectedType)
      if (result.txId) {
        setCryptoPayment(result)
        setSelectedNetwork(result.network || 'BTC')
      } else if (result.url) {
        window.location.href = result.url
      }
    } catch (err: any) {
      addToast(err.message || 'Payment failed', 'error')
    } finally {
      setLoading(null)
    }
  }

  const handleSubmitTx = async () => {
    if (!cryptoPayment || !txHash.trim()) return
    setSubmitting(true)
    try {
      await paymentApi.submitTx(cryptoPayment.txId, txHash.trim())
      addToast('Transaction submitted! We will verify and activate your account shortly.', 'success')
      setCryptoPayment(null)
      setTxHash('')
    } catch (err: any) {
      addToast(err.message || 'Submission failed', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const copyAddress = (addr: string) => {
    navigator.clipboard.writeText(addr)
    addToast('Address copied', 'success')
  }

  return (
    <Layout>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <h1 style={{ fontSize: 32, fontWeight: 700, color: '#e0e0e0', marginBottom: 8 }}>Choose Your Account</h1>
          <p style={{ color: '#6b7280', fontSize: 16 }}>Pay with crypto (BTC, ETH, USDT). 30-50% cheaper than competitors.</p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 40 }}>
          {(['evaluation', 'funded'] as const).map(type => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              style={{
                padding: '10px 24px', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', border: 'none',
                background: selectedType === type ? '#2563eb' : '#1f2937',
                color: selectedType === type ? '#fff' : '#9ca3af',
                transition: 'all 0.15s',
              }}
            >
              {type === 'evaluation' ? 'Evaluation (2-Phase)' : 'Instant Funding'}
            </button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
          {accountSizes.map(size => {
            const plan = plans[size]
            const price = selectedType === 'evaluation' ? plan.evalPrice : plan.instantPrice
            return (
              <div key={size} style={{
                background: '#111827', borderRadius: 12, border: '1px solid #1f2937',
                padding: 28, display: 'flex', flexDirection: 'column',
              }}>
                <div style={{ fontSize: 13, color: '#3b82f6', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase' }}>
                  {selectedType === 'evaluation' ? 'Evaluation' : 'Instant Funding'}
                </div>
                <div style={{ fontSize: 32, fontWeight: 700, color: '#e0e0e0', marginBottom: 4 }}>
                  ${(size / 1000).toFixed(0)}K
                </div>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#22c55e', marginBottom: 20 }}>
                  ${price}
                </div>

                <div style={{ flex: 1 }}>
                  <FeatureItem label="Trading Balance" value={`$${size.toLocaleString()}`} />
                  <FeatureItem label="Profit Target" value={`${plan.profitTarget}%`} />
                  <FeatureItem label="Max Daily Loss" value={`${plan.dailyLoss}%`} />
                  <FeatureItem label="Max Overall Loss" value="10%" />
                  <FeatureItem label="Profit Split" value="80%" />
                  <FeatureItem label="Min Trading Days" value={selectedType === 'evaluation' ? '5 days' : 'None'} />
                  <FeatureItem label="Leverage" value="1:100" />
                  {selectedType === 'funded' && <FeatureItem label="Direct Funding" value="Yes" />}
                </div>

                <button
                  onClick={() => handlePurchase(size)}
                  disabled={loading === size}
                  style={{
                    width: '100%', padding: '12px 0', marginTop: 20,
                    background: loading === size ? '#2563eb99' : '#2563eb',
                    color: '#fff', border: 'none', borderRadius: 8,
                    fontSize: 15, fontWeight: 600, cursor: loading === size ? 'not-allowed' : 'pointer',
                  }}
                >
                  {loading === size ? 'Processing...' : 'Pay with Crypto'}
                </button>
              </div>
            )
          })}
        </div>

        <div style={{ marginTop: 60, padding: 32, background: '#111827', borderRadius: 12, border: '1px solid #1f2937' }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#e0e0e0', marginBottom: 16 }}>Why FundedPro?</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 20 }}>
            <ComparisonItem label="Daily Loss Limit" value="6%" competitor="5% (FTMO)" better />
            <ComparisonItem label="Instant Funding" value="Available" competitor="Limited" better />
            <ComparisonItem label="Evaluation Price" value="From $49" competitor="From $150+" better />
            <ComparisonItem label="Profit Split" value="80%" competitor="80%" />
            <ComparisonItem label="Max Leverage" value="1:100" competitor="1:100" />
            <ComparisonItem label="Payment" value="Crypto (BTC/ETH/USDT)" competitor="Card only" better />
          </div>
        </div>
      </div>

      {cryptoPayment && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#111827', borderRadius: 16, border: '1px solid #1f2937', padding: 32, width: 480, maxWidth: '95vw' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: '#e0e0e0' }}>Crypto Payment</h2>
              <button onClick={() => { setCryptoPayment(null); setTxHash('') }} style={{ background: 'none', border: 'none', color: '#6b7280', fontSize: 20, cursor: 'pointer' }}>x</button>
            </div>

            <div style={{ textAlign: 'center', padding: 16, background: '#0a0e17', borderRadius: 10, marginBottom: 20 }}>
              <div style={{ color: '#6b7280', fontSize: 13, marginBottom: 4 }}>Amount to Pay</div>
              <div style={{ fontSize: 32, fontWeight: 700, color: '#22c55e' }}>${cryptoPayment.amount}</div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ color: '#9ca3af', fontSize: 13, marginBottom: 8 }}>Select Network</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {cryptoPayment.networks.map(net => (
                  <button key={net.name} onClick={() => setSelectedNetwork(net.name)}
                    style={{
                      padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none',
                      background: selectedNetwork === net.name ? '#2563eb' : '#1f2937',
                      color: selectedNetwork === net.name ? '#fff' : '#9ca3af',
                    }}>
                    {net.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ color: '#9ca3af', fontSize: 13, marginBottom: 6 }}>Send exactly this amount to the address below</div>
              <div style={{ padding: 12, background: '#0a0e17', borderRadius: 8, border: '1px solid #374151', wordBreak: 'break-all' }}>
                <div style={{ color: '#e0e0e0', fontSize: 14, fontFamily: 'monospace' }}>
                  {cryptoPayment.networks.find(n => n.name === selectedNetwork)?.address}
                </div>
              </div>
              <button onClick={() => copyAddress(cryptoPayment.networks.find(n => n.name === selectedNetwork)?.address || '')}
                style={{ marginTop: 8, padding: '6px 16px', background: '#1f2937', border: '1px solid #374151', borderRadius: 6, color: '#e0e0e0', fontSize: 13, cursor: 'pointer', width: '100%' }}>
                Copy Address
              </button>
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ color: '#9ca3af', fontSize: 13, marginBottom: 6 }}>Transaction Hash (TXID)</div>
              <input value={txHash} onChange={e => setTxHash(e.target.value)} placeholder="Paste your transaction hash here"
                style={{ width: '100%', padding: '10px 12px', background: '#0a0e17', border: '1px solid #374151', borderRadius: 8, color: '#e0e0e0', fontSize: 13, fontFamily: 'monospace', boxSizing: 'border-box' }} />
            </div>

            <button onClick={handleSubmitTx} disabled={!txHash.trim() || submitting}
              style={{
                width: '100%', padding: '12px 0', background: !txHash.trim() || submitting ? '#22c55e66' : '#22c55e',
                color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600,
                cursor: !txHash.trim() || submitting ? 'not-allowed' : 'pointer',
              }}>
              {submitting ? 'Submitting...' : 'Submit Transaction'}
            </button>

            <div style={{ marginTop: 16, padding: 12, background: '#f59e0b10', borderRadius: 8, border: '1px solid #f59e0b30', color: '#f59e0b', fontSize: 12, lineHeight: 1.6 }}>
              After sending crypto, paste your transaction hash above. Your account will be activated within 1-24 hours after blockchain confirmation.
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}

function FeatureItem({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #1f293720' }}>
      <span style={{ color: '#6b7280', fontSize: 13 }}>{label}</span>
      <span style={{ color: '#e0e0e0', fontSize: 13, fontWeight: 500 }}>{value}</span>
    </div>
  )
}

function ComparisonItem({ label, value, competitor, better }: { label: string; value: string; competitor: string; better?: boolean }) {
  return (
    <div style={{ padding: 16, background: '#0a0e17', borderRadius: 8 }}>
      <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>{label}</div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 15, fontWeight: 600, color: better ? '#22c55e' : '#e0e0e0' }}>{value}</span>
        <span style={{ fontSize: 12, color: '#6b7280' }}>Competitors: {competitor}</span>
      </div>
    </div>
  )
}
