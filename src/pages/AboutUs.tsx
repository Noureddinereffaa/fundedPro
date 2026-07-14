import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import Footer from '../components/layout/Footer.tsx'
import { SeoHead } from '../i18n/SeoHead'

export default function AboutUs() {
  const { i18n } = useTranslation()
  const lang = i18n.language

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#030712' }}>
      <SeoHead title="About Us" description="Learn about ProFundX — our mission, team, and vision for prop trading." />
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
          <div style={{ fontSize: 14, color: '#3b82f6', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 12 }}>Our Mission</div>
          <h1 style={{ fontSize: 48, fontWeight: 800, color: '#fff', marginBottom: 24 }}>The Future of Funding is Crypto</h1>
          <p style={{ color: '#9ca3af', fontSize: 18, lineHeight: 1.6 }}>
            ProFundX was built by traders, for traders. We saw the inefficiencies of traditional prop firms: slow fiat payouts, high credit card processing fees, and complex banking regulations. We decided to fix it.
          </p>
        </div>

        <div style={{ display: 'grid', gap: 40 }}>
          <section style={{ background: 'linear-gradient(145deg, #111827 0%, #1f2937 100%)', padding: 40, borderRadius: 24, border: '1px solid #374151' }}>
            <h2 style={{ fontSize: 24, fontWeight: 700, color: '#fff', marginBottom: 16 }}>100% Crypto Only</h2>
            <p style={{ color: '#9ca3af', lineHeight: 1.7, fontSize: 16 }}>
              By eliminating fiat currencies entirely, we bypass the legacy financial system. This means no bank delays, no hidden conversion fees, and instantaneous payouts directly to your crypto wallet via the blockchain. Whether you prefer USDT, BTC, or ETH, your capital is always liquid.
            </p>
          </section>

          <section style={{ background: 'linear-gradient(145deg, #111827 0%, #1f2937 100%)', padding: 40, borderRadius: 24, border: '1px solid #374151' }}>
            <h2 style={{ fontSize: 24, fontWeight: 700, color: '#fff', marginBottom: 16 }}>Direct Binance Liquidity</h2>
            <p style={{ color: '#9ca3af', lineHeight: 1.7, fontSize: 16 }}>
              We don't rely on slow, outdated brokers. Our trading engine hooks directly into Binance WebSockets, providing you with real-time, tick-by-tick data. You get the exact same spreads and execution speeds as trading natively on the world's largest exchange.
            </p>
          </section>

          <section style={{ background: 'linear-gradient(145deg, #111827 0%, #1f2937 100%)', padding: 40, borderRadius: 24, border: '1px solid #374151' }}>
            <h2 style={{ fontSize: 24, fontWeight: 700, color: '#fff', marginBottom: 16 }}>Global Accessibility</h2>
            <p style={{ color: '#9ca3af', lineHeight: 1.7, fontSize: 16 }}>
              Because we operate entirely on-chain, we are accessible to traders from almost anywhere in the world. As long as you have a crypto wallet and internet access, you have the opportunity to prove your skills and manage our capital.
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  )
}
