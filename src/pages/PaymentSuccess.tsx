import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { accountApi } from '../utils/api.ts'
import Layout from '../components/Layout.tsx'

export default function PaymentSuccessPage() {
  const { t } = useTranslation('common')
  const [searchParams] = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [account, setAccount] = useState<any>(null)

  const accountId = searchParams.get('accountId')
  const sessionId = searchParams.get('session_id')
  const isDev = searchParams.get('dev') === '1'

  useEffect(() => {
    if (isDev && accountId) {
      fetchAccountDetails(accountId)
    }
    else if (!isDev && sessionId) {
      accountApi
        .getAll(1, 1)
        .then((res) => {
          if (res.data && res.data.length > 0) {
            setAccount(res.data[0])
          }
          setLoading(false)
        })
        .catch(() => {
          setLoading(false)
        })
    } else {
      setLoading(false)
    }
  }, [accountId, sessionId, isDev])

  const fetchAccountDetails = (id: string) => {
    accountApi
      .getById(id)
      .then((data) => {
        setAccount(data)
        setLoading(false)
      })
      .catch(() => {
        setLoading(false)
      })
  }

  return (
    <Layout>
      <div style={{ maxWidth: 800, margin: '40px auto', textAlign: 'center' }}>
        <div
          style={{
            background: '#111827',
            borderRadius: 16,
            padding: '60px 40px',
            border: '1px solid #1f2937',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          }}
        >
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              background: '#22c55e20',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px',
            }}
          >
            <svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#22c55e"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>

          <h1 style={{ fontSize: 32, fontWeight: 700, color: '#e0e0e0', marginBottom: 16 }}>
            {t('paymentSuccess.title')}
          </h1>

          <p
            style={{ color: '#9ca3af', fontSize: 16, marginBottom: 40, maxWidth: 500, margin: '0 auto 40px' }}
          >
            {t('paymentSuccess.description')}
          </p>

          {loading ? (
            <div style={{ padding: 20, color: '#6b7280' }}>{t('paymentSuccess.loading')}</div>
          ) : account ? (
            <div
              style={{
                background: '#0a0e17',
                borderRadius: 12,
                padding: 24,
                marginBottom: 40,
                border: '1px solid #1f2937',
                textAlign: 'left',
                maxWidth: 400,
                margin: '0 auto 40px',
              }}
            >
              <h3
                style={{
                  fontSize: 16,
                  fontWeight: 600,
                  color: '#e0e0e0',
                  marginBottom: 16,
                  borderBottom: '1px solid #1f2937',
                  paddingBottom: 12,
                }}
              >
                {t('paymentSuccess.accountSummary')}
              </h3>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ color: '#6b7280', fontSize: 14 }}>{t('paymentSuccess.size')}</span>
                <span style={{ color: '#e0e0e0', fontWeight: 600, fontSize: 14 }}>
                  ${Number(account.accountSize).toLocaleString()}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ color: '#6b7280', fontSize: 14 }}>{t('paymentSuccess.type')}</span>
                <span
                  style={{ color: '#3b82f6', fontWeight: 600, fontSize: 14, textTransform: 'capitalize' }}
                >
                  {account.accountType === 'funded' ? t('paymentSuccess.instantFunding') : t('paymentSuccess.evaluation')}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#6b7280', fontSize: 14 }}>{t('paymentSuccess.platform')}</span>
                <span style={{ color: '#e0e0e0', fontWeight: 600, fontSize: 14 }}>{account.platform}</span>
              </div>
            </div>
          ) : (
            <div style={{ marginBottom: 40, color: '#6b7280' }}>
              {t('paymentSuccess.preparing')}
            </div>
          )}

          <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
            <Link
              to="/dashboard"
              style={{
                padding: '12px 24px',
                background: '#1f2937',
                color: '#e0e0e0',
                borderRadius: 8,
                textDecoration: 'none',
                fontSize: 15,
                fontWeight: 600,
                border: '1px solid #374151',
                transition: 'all 0.15s',
              }}
            >
              {t('paymentSuccess.goToDashboard')}
            </Link>

            {(account || accountId) && (
              <Link
                to={`/trade/${account?.id || accountId}`}
                style={{
                  padding: '12px 32px',
                  background: '#2563eb',
                  color: '#ffffff',
                  borderRadius: 8,
                  textDecoration: 'none',
                  fontSize: 15,
                  fontWeight: 600,
                  boxShadow: '0 4px 14px 0 rgba(37, 99, 235, 0.39)',
                  transition: 'all 0.15s',
                }}
              >
                {t('paymentSuccess.startTrading')}
              </Link>
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}
