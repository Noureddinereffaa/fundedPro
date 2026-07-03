import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext.tsx'
import Layout from '../../components/Layout.tsx'

const KYC_STATUSES = ['none', 'pending', 'verified', 'rejected'] as const
type KycStatus = typeof KYC_STATUSES[number]

export default function KycPage() {
  const { user, loading: authLoading } = useAuth()
  const [status, setStatus] = useState<KycStatus>('none')
  const [documents, setDocuments] = useState<Record<string, string | null>>({
    id: null,
    proof: null,
    selfie: null,
  })
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    if (user) {
      setStatus(user.kycStatus as KycStatus)
    }
  }, [user])

  const handleUpload = (type: string) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*,.pdf'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        const reader = new FileReader()
        reader.onload = () => setDocuments(prev => ({ ...prev, [type]: reader.result as string }))
        reader.readAsDataURL(file)
      }
    }
    input.click()
  }

  const handleSubmit = async () => {
    if (!documents.id || !documents.proof || !documents.selfie) {
      alert('Please upload all required documents')
      return
    }
    setLoading(true)
    setTimeout(() => {
      setStatus('pending')
      setSubmitted(true)
      setLoading(false)
    }, 1500)
  }

  const getStatusInfo = (s: KycStatus) => ({
    none: { label: 'Not Started', color: '#6b7280', bg: '#1f2937' },
    pending: { label: 'Under Review', color: '#f59e0b', bg: '#f59e0b20' },
    verified: { label: 'Verified', color: '#22c55e', bg: '#22c55e20' },
    rejected: { label: 'Rejected', color: '#ef4444', bg: '#ef444420' },
  }[s])

  const statusInfo = getStatusInfo(status)

  if (authLoading) return <Layout><div>Loading...</div></Layout>

  return (
    <Layout>
      <div style={{ maxWidth: 700 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#e0e0e0', marginBottom: 24 }}>KYC Verification</h1>

        <div style={{ background: '#111827', borderRadius: 12, padding: 24, border: '1px solid #1f2937', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
            <div style={{
              width: 64, height: 64, borderRadius: 12, background: statusInfo.bg,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24,
            }}>
              {status === 'verified' && '✓'}
              {status === 'pending' && '⏳'}
              {status === 'rejected' && '✗'}
              {status === 'none' && '○'}
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 600, color: statusInfo.color }}>{statusInfo.label}</div>
              <div style={{ color: '#6b7280', fontSize: 13 }}>
                {status === 'none' && 'Complete identity verification to unlock all features'}
                {status === 'pending' && 'Your documents are being reviewed. This usually takes 24-48 hours.'}
                {status === 'verified' && 'Your identity has been verified. All features are now available.'}
                {status === 'rejected' && 'Your submission was rejected. Please review and resubmit.'}
              </div>
            </div>
          </div>

          {status === 'rejected' && (
            <div style={{ background: '#ef444420', border: '1px solid #ef444440', borderRadius: 8, padding: 16, marginBottom: 16, color: '#ef4444', fontSize: 13 }}>
              <strong>Rejection Reason:</strong> Documents unclear or information mismatch. Please re-upload clear, valid documents.
            </div>
          )}

          {(status === 'none' || status === 'rejected') && !submitted && (
            <div style={{ border: '1px dashed #374151', borderRadius: 12, padding: 32, textAlign: 'center', marginBottom: 16 }}>
              <p style={{ color: '#6b7280', marginBottom: 24 }}>Upload the following documents to begin verification:</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
                <DocUpload type="id" label="Government ID" hint="Passport, Driver's License, or National ID" onUpload={handleUpload} preview={documents.id} />
                <DocUpload type="proof" label="Proof of Address" hint="Utility bill or bank statement (max 3 months old)" onUpload={handleUpload} preview={documents.proof} />
                <DocUpload type="selfie" label="Selfie with ID" hint="Hold your ID next to your face" onUpload={handleUpload} preview={documents.selfie} />
              </div>
              <button onClick={handleSubmit} disabled={loading || !documents.id || !documents.proof || !documents.selfie} style={{
                marginTop: 24, padding: '12px 32px', background: '#2563eb', color: '#fff',
                border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer',
                opacity: (!documents.id || !documents.proof || !documents.selfie) ? 0.5 : 1,
              }}>
                {loading ? 'Submitting...' : 'Submit for Review'}
              </button>
            </div>
          )}

          {submitted && status === 'pending' && (
            <div style={{ textAlign: 'center', padding: 32, background: '#f59e0b10', borderRadius: 12, border: '1px solid #f59e0b30' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
              <h3 style={{ color: '#e0e0e0', marginBottom: 8 }}>Submitted Successfully!</h3>
              <p style={{ color: '#6b7280' }}>Your documents are under review. You'll be notified once verification is complete.</p>
            </div>
          )}

          {status === 'verified' && (
            <div style={{ textAlign: 'center', padding: 32, background: '#22c55e10', borderRadius: 12, border: '1px solid #22c55e30' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>✓</div>
              <h3 style={{ color: '#22c55e', marginBottom: 8 }}>Identity Verified</h3>
              <p style={{ color: '#6b7280' }}>Your account is fully verified. All trading features are available.</p>
            </div>
          )}
        </div>

        <div style={{ background: '#111827', borderRadius: 12, padding: 24, border: '1px solid #1f2937' }}>
          <h3 style={{ color: '#e0e0e0', fontSize: 16, marginBottom: 16 }}>Why KYC?</h3>
          <ul style={{ color: '#9ca3af', fontSize: 13, lineHeight: 2 }}>
            <li>Regulatory compliance for prop trading firms</li>
            <li>Fraud prevention and account security</li>
            <li>Required for withdrawals and payouts</li>
            <li>Protects your funds and trading activity</li>
          </ul>
        </div>
      </div>
    </Layout>
  )
}

function DocUpload({ type, label, hint, onUpload, preview }: { type: string; label: string; hint: string; onUpload: (t: string) => void; preview: string | null }) {
  return (
    <div style={{ background: '#0a0e17', borderRadius: 8, padding: 16, border: '1px solid #1f2937', textAlign: 'center' }}>
      {preview ? (
        <div style={{ marginBottom: 8 }}>
          <img src={preview} alt={label} style={{ maxWidth: '100%', maxHeight: 120, borderRadius: 4, border: '1px solid #374151' }} />
        </div>
      ) : (
        <div style={{ fontSize: 32, marginBottom: 8 }}>📄</div>
      )}
      <div style={{ color: '#e0e0e0', fontWeight: 600, marginBottom: 4 }}>{label}</div>
      <div style={{ color: '#6b7280', fontSize: 11, marginBottom: 12 }}>{hint}</div>
      <button onClick={() => onUpload(type)} style={{
        padding: '8px 16px', background: '#1f2937', border: '1px solid #374151',
        borderRadius: 6, color: '#e0e0e0', fontSize: 12, cursor: 'pointer',
      }}>
        {preview ? 'Change' : 'Upload'}
      </button>
    </div>
  )
}