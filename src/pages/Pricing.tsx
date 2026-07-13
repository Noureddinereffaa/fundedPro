import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { paymentApi } from '../utils/api.ts'
import { useToast } from '../contexts/ToastContext.tsx'
import Layout from '../components/Layout.tsx'

const accountSizes = [5000, 10000, 25000, 50000, 100000, 200000]

interface PriceInfo {
  evaluation: number
  instant: number
}

interface CryptoPaymentData {
  txId: string
  amount: number
  walletAddress: string
  network: string
  networks: Array<{ name: string; address: string; label: string }>
}

export default function PricingPage() {
  const { t } = useTranslation('trading')
  const [selectedType, setSelectedType] = useState<'evaluation' | 'funded'>('evaluation')
  const [loading, setLoading] = useState<number | null>(null)
  const [cryptoPayment, setCryptoPayment] = useState<CryptoPaymentData | null>(null)
  const [prices, setPrices] = useState<Record<number, PriceInfo> | null>(null)

  useEffect(() => {
    paymentApi.getPrices().then((data: { prices: Record<number, PriceInfo> }) => {
      setPrices(data.prices)
    }).catch(() => {})
  }, [])
  const [selectedNetwork, setSelectedNetwork] = useState('BTC')
  const [txHash, setTxHash] = useState('')
  const [promoCode, setPromoCode] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { addToast } = useToast()

  const handlePurchase = async (accountSize: number) => {
    setLoading(accountSize)
    try {
      const result = await paymentApi.checkout(accountSize, selectedType, promoCode)
      if (result.txId) {
        setCryptoPayment(result)
        setSelectedNetwork(result.network || 'BTC')
      } else if (result.url) {
        window.location.href = result.url
      }
    } catch (err: unknown) {
      addToast(err instanceof Error ? err.message : t('pricing.submissionFailed'), 'error')
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
    } catch (err: unknown) {
      addToast(err instanceof Error ? err.message : 'Submission failed', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const copyAddress = (addr: string) => {
    navigator.clipboard.writeText(addr)
    addToast(t('pricing.addressCopied'), 'success')
  }

  return (
    <Layout>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <h1 style={{ fontSize: 32, fontWeight: 700, color: '#e0e0e0', marginBottom: 8 }}>
            {t('pricing.chooseAccount')}
          </h1>
          <p style={{ color: '#6b7280', fontSize: 16 }}>
            {t('pricing.cryptoSubtitle')}
          </p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 40 }}>
          {(['evaluation', 'funded'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              style={{
                padding: '10px 24px',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                border: 'none',
                background: selectedType === type ? '#2563eb' : '#1f2937',
                color: selectedType === type ? '#fff' : '#9ca3af',
                transition: 'all 0.15s',
              }}
            >
              {type === 'evaluation' ? t('pricing.evaluationTab') : t('pricing.instantFundingTab')}
            </button>
          ))}
        </div>

        <div
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}
        >
          {accountSizes.map((size) => {
            const plan = prices?.[size]
            const price = selectedType === 'evaluation' ? plan?.evaluation : plan?.instant
            return (
              <div
                key={size}
                style={{
                  background: '#111827',
                  borderRadius: 12,
                  border: '1px solid #1f2937',
                  padding: 28,
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <div
                  style={{
                    fontSize: 13,
                    color: '#3b82f6',
                    fontWeight: 600,
                    marginBottom: 4,
                    textTransform: 'uppercase',
                  }}
                >
                  {selectedType === 'evaluation' ? t('pricing.evaluationLabel') : t('pricing.instantFundingLabel')}
                </div>
                <div style={{ fontSize: 32, fontWeight: 700, color: '#e0e0e0', marginBottom: 4 }}>
                  ${(size / 1000).toFixed(0)}K
                </div>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#22c55e', marginBottom: 20 }}>
                  ${price}
                </div>

                <div style={{ flex: 1 }}>
                  <FeatureItem label={t('pricing.tradingBalance')} value={`$${size.toLocaleString()}`} />
                  <FeatureItem label={t('pricing.profitTarget')} value={selectedType === 'funded' ? '—' : '8%'} />
                  <FeatureItem label={t('pricing.dailyLoss')} value="6%" />
                  <FeatureItem label={t('pricing.overallLoss')} value="10%" />
                  <FeatureItem label={t('pricing.profitSplit')} value="80%" />
                  <FeatureItem
                    label={t('pricing.minTradingDays')}
                    value={selectedType === 'evaluation' ? `5 ${t('pricing.days')}` : t('pricing.none')}
                  />
                  <FeatureItem label={t('terms.leverage')} value="1:100" />
                  {selectedType === 'funded' && <FeatureItem label={t('pricing.directFunding')} value={t('pricing.yes')} />}
                </div>

                <div style={{ marginTop: 24 }}>
                  <input
                    type="text"
                    placeholder="Promo Code (Optional)"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 6,
                      border: '1px solid #374151',
                      background: '#111827',
                      color: '#fff',
                      fontSize: 14,
                      marginBottom: 16,
                      textTransform: 'uppercase'
                    }}
                  />
                  <button
                    onClick={() => handlePurchase(size)}
                    disabled={loading === size}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: 8,
                      border: 'none',
                      background: '#3b82f6',
                      color: '#fff',
                      fontSize: 15,
                      fontWeight: 600,
                      cursor: loading === size ? 'not-allowed' : 'pointer',
                      opacity: loading === size ? 0.7 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                    }}
                  >
                    {loading === size ? (
                      <div className="app-spinner" style={{ width: 18, height: 18 }} />
                    ) : (
                      'Purchase with Crypto'
                    )}
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        <div
          style={{
            marginTop: 60,
            padding: 32,
            background: '#111827',
            borderRadius: 12,
            border: '1px solid #1f2937',
          }}
        >
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#e0e0e0', marginBottom: 16 }}>
            {t('pricing.whyFundedPro')}
          </h2>
          <div
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 20 }}
          >
            <ComparisonItem label={t('pricing.dailyLossLimit')} value="6%" competitor="5% (FTMO)" better />
            <ComparisonItem label={t('pricing.instantFunding')} value={t('pricing.available')} competitor={t('pricing.limited')} better />
            <ComparisonItem label={t('pricing.evaluationPrice')} value={t('pricing.fromPrice', { price: '49' })} competitor={t('pricing.fromPrice', { price: '150+' })} better />
            <ComparisonItem label={t('pricing.profitSplit')} value="80%" competitor="80%" />
            <ComparisonItem label={t('pricing.maxLeverage')} value="1:100" competitor="1:100" />
            <ComparisonItem label={t('pricing.payment')} value="Crypto (BTC/ETH/USDT)" competitor={t('pricing.limited')} better />
          </div>
        </div>
      </div>

      {cryptoPayment && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: '#111827',
              borderRadius: 16,
              border: '1px solid #1f2937',
              padding: 32,
              width: 480,
              maxWidth: '95vw',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 24,
              }}
            >
              <h2 style={{ fontSize: 20, fontWeight: 700, color: '#e0e0e0' }}>{t('pricing.cryptoPaymentTitle')}</h2>
              <button
                onClick={() => {
                  setCryptoPayment(null)
                  setTxHash('')
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#6b7280',
                  fontSize: 20,
                  cursor: 'pointer',
                }}
              >
                x
              </button>
            </div>

            <div
              style={{
                textAlign: 'center',
                padding: 16,
                background: '#0a0e17',
                borderRadius: 10,
                marginBottom: 20,
              }}
            >
              <div style={{ color: '#6b7280', fontSize: 13, marginBottom: 4 }}>{t('pricing.amountToPay')}</div>
              <div style={{ fontSize: 32, fontWeight: 700, color: '#22c55e' }}>${cryptoPayment.amount}</div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ color: '#9ca3af', fontSize: 13, marginBottom: 8 }}>{t('pricing.selectNetwork')}</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {cryptoPayment.networks.map((net) => (
                  <button
                    key={net.name}
                    onClick={() => setSelectedNetwork(net.name)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: 'none',
                      background: selectedNetwork === net.name ? '#2563eb' : '#1f2937',
                      color: selectedNetwork === net.name ? '#fff' : '#9ca3af',
                    }}
                  >
                    {net.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ color: '#9ca3af', fontSize: 13, marginBottom: 6 }}>
                {t('pricing.sendExactly')}
              </div>
              <div
                style={{
                  padding: 12,
                  background: '#0a0e17',
                  borderRadius: 8,
                  border: '1px solid #374151',
                  wordBreak: 'break-all',
                }}
              >
                <div style={{ color: '#e0e0e0', fontSize: 14, fontFamily: 'monospace' }}>
                  {cryptoPayment.networks.find((n) => n.name === selectedNetwork)?.address}
                </div>
              </div>
              <button
                onClick={() =>
                  copyAddress(cryptoPayment.networks.find((n) => n.name === selectedNetwork)?.address || '')
                }
                style={{
                  marginTop: 8,
                  padding: '6px 16px',
                  background: '#1f2937',
                  border: '1px solid #374151',
                  borderRadius: 6,
                  color: '#e0e0e0',
                  fontSize: 13,
                  cursor: 'pointer',
                  width: '100%',
                }}
              >
                {t('pricing.copyAddress')}
              </button>
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ color: '#9ca3af', fontSize: 13, marginBottom: 6 }}>{t('pricing.transactionHash')}</div>
              <input
                value={txHash}
                onChange={(e) => setTxHash(e.target.value)}
                placeholder={t('pricing.transactionPlaceholder')}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: '#0a0e17',
                  border: '1px solid #374151',
                  borderRadius: 8,
                  color: '#e0e0e0',
                  fontSize: 13,
                  fontFamily: 'monospace',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <button
              onClick={handleSubmitTx}
              disabled={!txHash.trim() || submitting}
              style={{
                width: '100%',
                padding: '12px 0',
                background: !txHash.trim() || submitting ? '#22c55e66' : '#22c55e',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                fontSize: 15,
                fontWeight: 600,
                cursor: !txHash.trim() || submitting ? 'not-allowed' : 'pointer',
              }}
            >
              {submitting ? t('pricing.submitting') : t('pricing.submitTransaction')}
            </button>

            <div
              style={{
                marginTop: 16,
                padding: 12,
                background: '#f59e0b10',
                borderRadius: 8,
                border: '1px solid #f59e0b30',
                color: '#f59e0b',
                fontSize: 12,
                lineHeight: 1.6,
              }}
            >
              {t('pricing.confirmationNote')}
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}

function FeatureItem({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        padding: '8px 0',
        borderBottom: '1px solid #1f293720',
      }}
    >
      <span style={{ color: '#6b7280', fontSize: 13 }}>{label}</span>
      <span style={{ color: '#e0e0e0', fontSize: 13, fontWeight: 500 }}>{value}</span>
    </div>
  )
}

function ComparisonItem({
  label,
  value,
  competitor,
  better,
}: {
  label: string
  value: string
  competitor: string
  better?: boolean
}) {
  const { t } = useTranslation('trading')
  return (
    <div style={{ padding: 16, background: '#0a0e17', borderRadius: 8 }}>
      <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>{label}</div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 15, fontWeight: 600, color: better ? '#22c55e' : '#e0e0e0' }}>{value}</span>
        <span style={{ fontSize: 12, color: '#6b7280' }}>{t('pricing.competitors', { competitor })}</span>
      </div>
    </div>
  )
}
