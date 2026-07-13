import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

interface Settings {
  [key: string]: string
}

export default function Footer() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const [settings, setSettings] = useState<Settings>({})

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL || 'https://profundx.com/api'}/settings`)
      .then((r) => r.json())
      .then((d) => setSettings(d))
      .catch(() => {})
  }, [])

  return (
    <footer style={{
      background: '#0a0a0a',
      borderTop: '1px solid #1f2937',
      padding: '60px 20px 40px',
      marginTop: 'auto'
    }}>
      <div style={{
        maxWidth: 1200,
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: 40,
        marginBottom: 60
      }}>
        {/* Brand */}
        <div>
          <Link to={`/${lang}`} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#fff', letterSpacing: -0.5 }}>
              <span style={{ color: '#3b82f6' }}>Pro</span>FundX
            </div>
          </Link>
          <p style={{ color: '#9ca3af', fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>
            {t('footer.description', 'The premier 100% Crypto Prop Firm. Trade with our capital, keep up to 90% of profits. No fiat limits, instant crypto payouts.')}
          </p>
          <div style={{ display: 'flex', gap: 16 }}>
            {settings.social_twitter && (
              <a href={settings.social_twitter} target="_blank" rel="noreferrer" style={{ color: '#9ca3af', textDecoration: 'none' }}>𝕏</a>
            )}
            {settings.social_telegram && (
              <a href={settings.social_telegram} target="_blank" rel="noreferrer" style={{ color: '#9ca3af', textDecoration: 'none' }}>Telegram</a>
            )}
            {settings.social_discord && (
              <a href={settings.social_discord} target="_blank" rel="noreferrer" style={{ color: '#9ca3af', textDecoration: 'none' }}>Discord</a>
            )}
          </div>
        </div>

        {/* Quick Links */}
        <div>
          <h4 style={{ color: '#fff', fontSize: 16, fontWeight: 600, marginBottom: 20 }}>{t('footer.platform', 'Platform')}</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Link to={`/${lang}`} style={{ color: '#9ca3af', textDecoration: 'none', fontSize: 14 }}>{t('nav.home')}</Link>
            <Link to={`/${lang}/pricing`} style={{ color: '#9ca3af', textDecoration: 'none', fontSize: 14 }}>{t('nav.pricing')}</Link>
            <Link to={`/${lang}/leaderboard`} style={{ color: '#9ca3af', textDecoration: 'none', fontSize: 14 }}>{t('nav.leaderboard', 'Leaderboard')}</Link>
          </div>
        </div>

        {/* Company */}
        <div>
          <h4 style={{ color: '#fff', fontSize: 16, fontWeight: 600, marginBottom: 20 }}>{t('footer.company', 'Company')}</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Link to={`/${lang}/about`} style={{ color: '#9ca3af', textDecoration: 'none', fontSize: 14 }}>{t('nav.about')}</Link>
            <Link to={`/${lang}/contact`} style={{ color: '#9ca3af', textDecoration: 'none', fontSize: 14 }}>{t('nav.contact')}</Link>
            <Link to={`/${lang}/faq`} style={{ color: '#9ca3af', textDecoration: 'none', fontSize: 14 }}>{t('landing.faq.tag')}</Link>
          </div>
        </div>

        {/* Legal */}
        <div>
          <h4 style={{ color: '#fff', fontSize: 16, fontWeight: 600, marginBottom: 20 }}>{t('footer.legal', 'Legal')}</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Link to={`/${lang}/terms`} style={{ color: '#9ca3af', textDecoration: 'none', fontSize: 14 }}>{t('footer.terms')}</Link>
            <Link to={`/${lang}/privacy`} style={{ color: '#9ca3af', textDecoration: 'none', fontSize: 14 }}>{t('footer.privacy')}</Link>
            <span style={{ color: '#9ca3af', fontSize: 14 }}>{settings.contact_email || 'support@profundx.com'}</span>
          </div>
        </div>
      </div>

      <div style={{
        maxWidth: 1200,
        margin: '0 auto',
        paddingTop: 20,
        borderTop: '1px solid #1f2937',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 20,
        color: '#6b7280',
        fontSize: 13
      }}>
        <div>&copy; {new Date().getFullYear()} ProFundX. All rights reserved.</div>
        <div>Not available in restricted jurisdictions. Trading involves risk.</div>
      </div>
    </footer>
  )
}
