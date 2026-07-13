import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import Footer from '../components/layout/Footer.tsx'

export default function FaqPage() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  const faqs = [
    { category: 'General', q: 'What is ProFundX?', a: 'ProFundX is a 100% Crypto Prop Firm. We provide capital to profitable traders. You trade our funds and keep up to 90% of the profits you generate. We exclusively deal in cryptocurrency for deposits and payouts.' },
    { category: 'General', q: 'Why Crypto Only?', a: 'By focusing exclusively on crypto (USDT, BTC, ETH), we eliminate fiat processing fees, chargeback risks, and banking delays. This allows us to offer instant payouts to our traders anywhere in the world.' },
    { category: 'Evaluation', q: 'What are the rules of the evaluation?', a: 'You must reach the profit target (typically 8-10%) without violating the maximum daily loss (e.g. 5%) or maximum overall loss (e.g. 10%). There is no time limit to pass the evaluation.' },
    { category: 'Evaluation', q: 'Can I hold trades over the weekend?', a: 'Yes, we allow holding trades over the weekend on our crypto accounts, as the crypto market is open 24/7.' },
    { category: 'Payouts', q: 'How do payouts work?', a: 'Once you are funded and generate a profit, you can request a payout. Payouts are processed instantly to your designated crypto wallet via the blockchain.' },
    { category: 'Payouts', q: 'What is the profit split?', a: 'Traders start with an 80% profit split, which can scale up to 90% based on consistent performance.' },
  ]

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#030712' }}>
      <nav style={{ padding: '20px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1f2937' }}>
        <Link to={`/${lang}`} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#fff', letterSpacing: -0.5 }}>
            <span style={{ color: '#3b82f6' }}>Pro</span>FundX
          </div>
        </Link>
        <Link to={`/${lang}`} style={{ color: '#9ca3af', textDecoration: 'none', fontSize: 14 }}>Back to Home</Link>
      </nav>

      <main style={{ flex: 1, padding: '80px 20px', maxWidth: 800, margin: '0 auto', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: 60 }}>
          <h1 style={{ fontSize: 48, fontWeight: 800, color: '#fff', marginBottom: 16 }}>Frequently Asked Questions</h1>
          <p style={{ color: '#9ca3af', fontSize: 18 }}>
            Everything you need to know about trading with our Crypto Prop Firm.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {faqs.map((faq, i) => (
            <div key={i} style={{ background: '#111827', borderRadius: 12, border: '1px solid #1f2937', overflow: 'hidden' }}>
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                style={{
                  width: '100%',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: 24,
                  background: 'transparent',
                  border: 'none',
                  color: '#fff',
                  fontSize: 18,
                  fontWeight: 600,
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 12, padding: '4px 8px', background: '#1f2937', borderRadius: 4, color: '#9ca3af' }}>{faq.category}</span>
                  {faq.q}
                </div>
                <span>{openIndex === i ? '−' : '+'}</span>
              </button>
              {openIndex === i && (
                <div style={{ padding: '0 24px 24px', color: '#9ca3af', lineHeight: 1.6, fontSize: 16 }}>
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  )
}
