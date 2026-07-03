import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { accountApi } from '../utils/api.ts'
import Layout from '../components/Layout.tsx'

export default function PaymentSuccessPage() {
  const [searchParams] = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [account, setAccount] = useState<any>(null)
  
  const accountId = searchParams.get('accountId')
  const sessionId = searchParams.get('session_id')
  const isDev = searchParams.get('dev') === '1'

  useEffect(() => {
    // If it's a dev mode payment, the account ID is passed directly
    if (isDev && accountId) {
      fetchAccountDetails(accountId)
    } 
    // If it's a Stripe payment, we might need to wait for the webhook to create the account,
    // or fetch the latest account for this user. For simplicity, if we don't have an accountId,
    // we'll just check for their latest account or redirect to dashboard after a delay.
    else if (!isDev && sessionId) {
      // In a real scenario, you might poll the backend to check if the account was created by the webhook.
      // Here, we'll try to fetch their accounts and grab the newest one, or just show a generic success.
      accountApi.getAll(1, 1).then(res => {
        if (res.data && res.data.length > 0) {
          setAccount(res.data[0])
        }
        setLoading(false)
      }).catch(() => {
        setLoading(false)
      })
    } else {
      setLoading(false)
    }
  }, [accountId, sessionId, isDev])

  const fetchAccountDetails = (id: string) => {
    accountApi.getById(id)
      .then(data => {
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
        <div style={{
          background: '#111827', borderRadius: 16, padding: '60px 40px',
          border: '1px solid #1f2937', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
        }}>
          
          <div style={{
            width: 80, height: 80, borderRadius: '50%', background: '#22c55e20',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 24px'
          }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>

          <h1 style={{ fontSize: 32, fontWeight: 700, color: '#e0e0e0', marginBottom: 16 }}>
            Payment Successful!
          </h1>
          
          <p style={{ color: '#9ca3af', fontSize: 16, marginBottom: 40, maxWidth: 500, margin: '0 auto 40px' }}>
            Your transaction has been completed and your account is ready. Welcome to FundedPro!
          </p>

          {loading ? (
            <div style={{ padding: 20, color: '#6b7280' }}>Loading account details...</div>
          ) : account ? (
            <div style={{ 
              background: '#0a0e17', borderRadius: 12, padding: 24, marginBottom: 40,
              border: '1px solid #1f2937', textAlign: 'left', maxWidth: 400, margin: '0 auto 40px'
            }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: '#e0e0e0', marginBottom: 16, borderBottom: '1px solid #1f2937', paddingBottom: 12 }}>
                Account Summary
              </h3>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ color: '#6b7280', fontSize: 14 }}>Size</span>
                <span style={{ color: '#e0e0e0', fontWeight: 600, fontSize: 14 }}>
                  ${Number(account.accountSize).toLocaleString()}
                </span>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ color: '#6b7280', fontSize: 14 }}>Type</span>
                <span style={{ color: '#3b82f6', fontWeight: 600, fontSize: 14, textTransform: 'capitalize' }}>
                  {account.accountType === 'funded' ? 'Instant Funding' : 'Evaluation'}
                </span>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#6b7280', fontSize: 14 }}>Platform</span>
                <span style={{ color: '#e0e0e0', fontWeight: 600, fontSize: 14 }}>
                  {account.platform}
                </span>
              </div>
            </div>
          ) : (
            <div style={{ marginBottom: 40, color: '#6b7280' }}>
              Your account is being prepared. It will appear in your dashboard shortly.
            </div>
          )}

          <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
            <Link to="/dashboard" style={{
              padding: '12px 24px', background: '#1f2937', color: '#e0e0e0',
              borderRadius: 8, textDecoration: 'none', fontSize: 15, fontWeight: 600,
              border: '1px solid #374151', transition: 'all 0.15s'
            }}>
              Go to Dashboard
            </Link>
            
            {(account || accountId) && (
              <Link to={`/trade/${account?.id || accountId}`} style={{
                padding: '12px 32px', background: '#2563eb', color: '#ffffff',
                borderRadius: 8, textDecoration: 'none', fontSize: 15, fontWeight: 600,
                boxShadow: '0 4px 14px 0 rgba(37, 99, 235, 0.39)', transition: 'all 0.15s'
              }}>
                Start Trading Now
              </Link>
            )}
          </div>

        </div>
      </div>
    </Layout>
  )
}
