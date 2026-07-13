import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import Footer from '../components/layout/Footer.tsx'

export default function Privacy() {
  const { i18n } = useTranslation()
  const lang = i18n.language

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

      <main style={{ flex: 1, padding: '80px 20px', maxWidth: 800, margin: '0 auto', width: '100%', color: '#9ca3af', lineHeight: 1.8, fontSize: 15 }}>
        <h1 style={{ fontSize: 36, fontWeight: 800, color: '#fff', marginBottom: 8 }}>Privacy Policy</h1>
        <p style={{ color: '#4b5563', marginBottom: 40 }}>Last updated: July 13, 2026</p>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 20, color: '#fff', marginBottom: 12 }}>1. Information We Collect</h2>
          <p><strong style={{ color: '#e0e0e0' }}>Account Information:</strong> Email address, name, phone number, country of residence, and account credentials (hashed passwords).</p>
          <p><strong style={{ color: '#e0e0e0' }}>Identity Verification (KYC):</strong> Government-issued ID, proof of address, and selfie — collected only when required for compliance.</p>
          <p><strong style={{ color: '#e0e0e0' }}>Trading Data:</strong> Order history, trade performance, account balances, and equity snapshots — used to operate the Platform and evaluate rule compliance.</p>
          <p><strong style={{ color: '#e0e0e0' }}>Technical Data:</strong> IP address, browser type, device information, and usage patterns — collected via cookies and similar technologies.</p>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 20, color: '#fff', marginBottom: 12 }}>2. How We Use Your Information</h2>
          <p>We use your information to: (a) operate, maintain, and improve the Platform, (b) process evaluation purchases and payouts, (c) verify your identity and prevent fraud, (d) communicate with you about your account and platform updates, (e) comply with legal obligations and enforce our Terms of Service.</p>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 20, color: '#fff', marginBottom: 12 }}>3. Data Sharing</h2>
          <p>We do not sell your personal information. We may share data with: (a) service providers who help us operate the Platform (hosting, email delivery, identity verification), (b) law enforcement or regulators when required by law, (c) potential acquirers in the event of a merger or acquisition. All third parties are contractually bound to protect your data.</p>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 20, color: '#fff', marginBottom: 12 }}>4. Data Retention</h2>
          <p>We retain your personal data for as long as your account is active and for 5 years thereafter to comply with legal obligations. Trading data is retained indefinitely for platform integrity. You may request deletion of your data, subject to our legal retention requirements.</p>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 20, color: '#fff', marginBottom: 12 }}>5. Cookies</h2>
          <p>We use essential cookies for authentication and platform functionality. We also use analytics cookies to improve our service. You can manage cookie preferences through your browser settings. Disabling essential cookies may prevent the Platform from functioning correctly.</p>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 20, color: '#fff', marginBottom: 12 }}>6. Your Rights (GDPR & CCPA)</h2>
          <p>If you are in the EEA or California, you have the right to: (a) access your personal data, (b) request correction or deletion, (c) restrict or object to processing, (d) data portability, (e) withdraw consent at any time. To exercise these rights, contact <span style={{ color: '#3b82f6' }}>privacy@pro-fundx.com</span>. We will respond within 30 days.</p>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 20, color: '#fff', marginBottom: 12 }}>7. Data Security</h2>
          <p>We implement industry-standard security measures including encryption at rest and in transit, regular security audits, and access controls. Despite these measures, no system is 100% secure. You are responsible for maintaining the security of your account credentials.</p>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 20, color: '#fff', marginBottom: 12 }}>8. International Transfers</h2>
          <p>Your data may be processed in countries other than your own. We ensure adequate safeguards are in place through Standard Contractual Clauses or equivalent mechanisms when transferring data across borders.</p>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 20, color: '#fff', marginBottom: 12 }}>9. Children</h2>
          <p>The Platform is not intended for individuals under 18. We do not knowingly collect data from minors. If we become aware of such collection, we will delete the information promptly.</p>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 20, color: '#fff', marginBottom: 12 }}>10. Changes to This Policy</h2>
          <p>We may update this Privacy Policy at any time. Material changes will be notified via email or platform notification. Continued use after changes constitutes acceptance.</p>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 20, color: '#fff', marginBottom: 12 }}>11. Contact</h2>
          <p>Data Protection Officer: <span style={{ color: '#3b82f6' }}>privacy@pro-fundx.com</span><br/>Postal: ProFundX Ltd, PO Box 123, Road Town, Tortola, British Virgin Islands</p>
        </section>
      </main>

      <Footer />
    </div>
  )
}
