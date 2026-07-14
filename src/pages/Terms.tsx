import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import Footer from '../components/layout/Footer.tsx'
import { SeoHead } from '../i18n/SeoHead'

export default function Terms() {
  const { i18n } = useTranslation()
  const lang = i18n.language

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#030712' }}>
      <SeoHead title="Terms of Service" description="ProFundX Terms of Service — please read carefully before using our platform." />
      <nav style={{ padding: '20px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1f2937' }}>
        <Link to={`/${lang}`} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#fff', letterSpacing: -0.5 }}>
            <span style={{ color: '#3b82f6' }}>Pro</span>FundX
          </div>
        </Link>
        <Link to={`/${lang}`} style={{ color: '#9ca3af', textDecoration: 'none', fontSize: 14 }}>Back to Home</Link>
      </nav>

      <main style={{ flex: 1, padding: '80px 20px', maxWidth: 800, margin: '0 auto', width: '100%', color: '#9ca3af', lineHeight: 1.8, fontSize: 15 }}>
        <h1 style={{ fontSize: 36, fontWeight: 800, color: '#fff', marginBottom: 8 }}>Terms of Service</h1>
        <p style={{ color: '#4b5563', marginBottom: 40 }}>Last updated: July 13, 2026</p>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 20, color: '#fff', marginBottom: 12 }}>1. Acceptance of Terms</h2>
          <p>By accessing or using the ProFundX platform ("Platform"), you agree to be legally bound by these Terms of Service ("Terms"). If you do not agree, do not use the Platform. We may update these Terms at any time; continued use after changes constitutes acceptance.</p>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 20, color: '#fff', marginBottom: 12 }}>2. Eligibility</h2>
          <p>You must be at least 18 years old and have the legal capacity to enter into binding contracts. By registering, you represent that you are not a resident of a jurisdiction where crypto prop trading is prohibited. You are responsible for ensuring compliance with your local laws.</p>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 20, color: '#fff', marginBottom: 12 }}>3. Account Registration</h2>
          <p>You must provide accurate and complete information. You are solely responsible for maintaining the confidentiality of your login credentials. ProFundX is not liable for any loss caused by unauthorized access due to negligence in safeguarding your account.</p>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 20, color: '#fff', marginBottom: 12 }}>4. Evaluation & Funded Accounts</h2>
          <p>Evaluation phases simulate real trading conditions. Passing an evaluation does not guarantee a funded account; funding is at ProFundX's sole discretion. Funded accounts are subject to maximum drawdown, daily loss, and position size limits as specified in your account dashboard. Violation of any rule may result in immediate account closure without payout.</p>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 20, color: '#fff', marginBottom: 12 }}>5. Fees & Payments</h2>
          <p>All fees are paid in cryptocurrency (USDT, BTC, ETH) and are non-refundable unless otherwise stated. Evaluation fees are one-time payments for the evaluation phase. No hidden fees apply. You are responsible for any blockchain network fees.</p>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 20, color: '#fff', marginBottom: 12 }}>6. Profit Split & Payouts</h2>
          <p>Profit splits are as specified in your account plan (up to 90% to the trader). Payouts are processed in cryptocurrency within the stated timeframe. ProFundX reserves the right to deny payouts if rules violations, fraudulent activity, or prohibited trading strategies are detected. Minimum payout amounts apply.</p>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 20, color: '#fff', marginBottom: 12 }}>7. Risk Disclosure</h2>
          <p>Trading cryptocurrencies carries substantial risk, including the potential loss of all capital. Past performance in evaluations does not guarantee future results. ProFundX does not provide investment advice. You acknowledge that you are trading at your own risk and that ProFundX acts solely as a capital provider, not a financial advisor.</p>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 20, color: '#fff', marginBottom: 12 }}>8. Prohibited Conduct</h2>
          <p>The following are strictly prohibited: (a) hedging across multiple accounts, (b) latency arbitrage or quote stuffing, (c) use of expert advisors (EAs) that violate risk rules, (d) insider trading or market manipulation, (e) any form of fraud or misrepresentation. Violation may result in account termination and forfeiture of all fees and profits.</p>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 20, color: '#fff', marginBottom: 12 }}>9. Limitation of Liability</h2>
          <p>ProFundX, its affiliates, and employees shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the Platform, including loss of profits, data, or business interruption. Our total liability is limited to the fees you paid in the preceding 12 months.</p>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 20, color: '#fff', marginBottom: 12 }}>10. Indemnification</h2>
          <p>You agree to indemnify and hold ProFundX harmless from any claims, damages, or expenses arising from your violation of these Terms, your use of the Platform, or infringement of any third-party rights.</p>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 20, color: '#fff', marginBottom: 12 }}>11. Termination</h2>
          <p>We may suspend or terminate your account at any time for violation of these Terms. Upon termination, all pending payouts may be forfeited. You may terminate your account at any time by contacting support; fees are non-refundable upon termination.</p>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 20, color: '#fff', marginBottom: 12 }}>12. Governing Law</h2>
          <p>These Terms are governed by the laws of the British Virgin Islands. Any disputes shall be resolved through binding arbitration in accordance with the BVI International Arbitration Centre rules. The language of arbitration shall be English.</p>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 20, color: '#fff', marginBottom: 12 }}>13. Contact</h2>
          <p>For questions about these Terms, contact us at <span style={{ color: '#3b82f6' }}>support@pro-fundx.com</span>.</p>
        </section>
      </main>

      <Footer />
    </div>
  )
}
