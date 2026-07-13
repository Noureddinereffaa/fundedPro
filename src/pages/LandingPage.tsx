import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { SUPPORTED_LANGUAGES } from '../i18n/config'
import Footer from '../components/layout/Footer.tsx'
import '../styles/landing.css'

export default function LandingPage() {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const statsRef = useRef<HTMLDivElement>(null)

  const FAQ = [
    { q: t('landing.faq.q1'), a: t('landing.faq.a1') },
    { q: t('landing.faq.q2'), a: t('landing.faq.a2') },
    { q: t('landing.faq.q3'), a: t('landing.faq.a3') },
    { q: t('landing.faq.q4'), a: t('landing.faq.a4') },
    { q: t('landing.faq.q5'), a: t('landing.faq.a5') },
    { q: t('landing.faq.q6'), a: t('landing.faq.a6') },
  ]

  const FEATURES = [
    { icon: '💰', color: '#3b82f6', title: t('landing.why.profitSplitTitle'), desc: t('landing.why.profitSplitDesc') },
    { icon: '⚡', color: '#f59e0b', title: t('landing.why.instantTitle'), desc: t('landing.why.instantDesc') },
    { icon: '💎', color: '#22c55e', title: t('landing.why.lowFeesTitle'), desc: t('landing.why.lowFeesDesc') },
    { icon: '🔗', color: '#ef4444', title: t('landing.why.cryptoTitle'), desc: t('landing.why.cryptoDesc') },
    { icon: '📊', color: '#8b5cf6', title: t('landing.why.leverageTitle'), desc: t('landing.why.leverageDesc') },
    { icon: '🖥️', color: '#06b6d4', title: t('landing.why.platformTitle'), desc: t('landing.why.platformDesc') },
  ]

  const PLANS = [
    { size: '$5,000', evalPrice: '$49', instantPrice: '$99', popular: false },
    { size: '$25,000', evalPrice: '$149', instantPrice: '$299', popular: true },
    { size: '$100,000', evalPrice: '$399', instantPrice: '$799', popular: false },
  ]

  const lang = i18n.language

  useEffect(() => {
    if (user) {
      navigate(`/${lang}/dashboard`, { replace: true })
    }
  }, [user, lang, navigate])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const scrollTo = (id: string) => {
    setMobileOpen(false)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="landing-page">
      {/* -- Navigation -- */}
      <nav className={`landing-nav ${scrolled ? 'scrolled' : ''}`}>
        <Link to={`/${lang}`} className="landing-nav-logo">
          <span>Pro</span>FundX
        </Link>

        <div className="landing-nav-links">
          <button className="landing-nav-link" onClick={() => scrollTo('features')}>{t('nav.home')}</button>
          <button className="landing-nav-link" onClick={() => scrollTo('pricing')}>{t('nav.pricing')}</button>
          <Link to={`/${lang}/about`} className="landing-nav-link">{t('nav.about')}</Link>
          <Link to={`/${lang}/faq`} className="landing-nav-link">{t('landing.faq.tag')}</Link>
          <Link to={`/${lang}/contact`} className="landing-nav-link">{t('nav.contact')}</Link>
        </div>

        <div className="landing-nav-actions">
          <select
            value={lang}
            onChange={(e) => {
              const path = window.location.pathname.replace(/^\/[a-z]{2}(\/|$)/, '/$1')
              window.location.href = `/${e.target.value}${path}`
            }}
            style={{
              background: 'transparent',
              border: '1px solid #374151',
              color: '#d1d4dc',
              padding: '6px 8px',
              borderRadius: 6,
              fontSize: 12,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {SUPPORTED_LANGUAGES.map(l => (
              <option key={l.code} value={l.code}>{l.flag} {l.name}</option>
            ))}
          </select>
          <Link to={`/${lang}/login`} className="landing-nav-btn landing-nav-btn-outline">{t('nav.login')}</Link>
          <Link to={`/${lang}/register`} className="landing-nav-btn landing-nav-btn-primary">{t('nav.register')}</Link>
        </div>

        <button className="landing-mobile-toggle" onClick={() => setMobileOpen((v) => !v)}>
          {mobileOpen ? '✕' : '☰'}
        </button>
      </nav>

      <div className={`landing-mobile-menu ${mobileOpen ? 'open' : ''}`}>
        <button className="landing-nav-link" onClick={() => scrollTo('features')}>{t('nav.home')}</button>
        <button className="landing-nav-link" onClick={() => scrollTo('pricing')}>{t('nav.pricing')}</button>
        <Link to={`/${lang}/about`} className="landing-nav-link" onClick={() => setMobileOpen(false)}>{t('nav.about')}</Link>
        <Link to={`/${lang}/faq`} className="landing-nav-link" onClick={() => setMobileOpen(false)}>{t('landing.faq.tag')}</Link>
        <Link to={`/${lang}/contact`} className="landing-nav-link" onClick={() => setMobileOpen(false)}>{t('nav.contact')}</Link>
        <Link to={`/${lang}/login`} className="landing-nav-btn landing-nav-btn-outline" style={{ textAlign: 'center' }} onClick={() => setMobileOpen(false)}>{t('nav.login')}</Link>
        <Link to={`/${lang}/register`} className="landing-nav-btn landing-nav-btn-primary" style={{ textAlign: 'center' }} onClick={() => setMobileOpen(false)}>{t('nav.register')}</Link>
      </div>

      {/* -- Hero -- */}
      <section className="landing-hero">
        <div className="landing-hero-bg" />
        <div className="landing-hero-grid" />
        {/* Glow Effects */}
        <div className="glow-sphere" style={{ top: '10%', left: '20%', background: 'rgba(59, 130, 246, 0.4)' }} />
        <div className="glow-sphere" style={{ top: '40%', right: '10%', background: 'rgba(245, 158, 11, 0.3)' }} />
        <div className="glow-sphere" style={{ bottom: '-10%', left: '50%', background: 'rgba(139, 92, 246, 0.4)' }} />
        
        <div className="landing-hero-content">
          <div className="landing-hero-trustpilot">
            <span style={{ color: '#00b67a', fontSize: 18 }}>★★★★★</span>
            <span style={{ color: '#d1d4dc', fontSize: 13, fontWeight: 500 }}>{t('landing.hero.trustpilot')}</span>
          </div>

          <div className="landing-hero-badge">
            <span className="badge-pulse"></span> {t('landing.hero.badge')}
          </div>
          
          <h1 className="landing-hero-title">
            {t('landing.hero.title1')}<span>{t('landing.hero.titleHighlight')}</span> <br/>
            {t('landing.hero.title2')}
          </h1>
          
          <p className="landing-hero-sub">
            {t('landing.hero.subtitle')}
          </p>
          
          <div className="landing-hero-actions">
            <Link to={`/${lang}/register`} className="landing-hero-btn landing-hero-btn-primary">
              {t('landing.hero.cta')}
            </Link>
            <button className="landing-hero-btn landing-hero-btn-secondary" onClick={() => scrollTo('pricing')}>
              <span style={{ fontSize: 20 }}>💰</span> {t('landing.hero.viewPricing')}
            </button>
          </div>
          
          <div className="landing-hero-supported-crypto">
            <span style={{ fontSize: 12, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, display: 'block' }}>{t('landing.hero.supportedNetworks')}</span>
            <div style={{ display: 'flex', gap: 16, justifyContent: 'center', alignItems: 'center' }}>
              <div className="crypto-badge">🪙 Bitcoin (BTC)</div>
              <div className="crypto-badge">💵 Tether (USDT)</div>
              <div className="crypto-badge">💎 Ethereum (ETH)</div>
            </div>
          </div>
        </div>
      </section>

      {/* -- How It Works -- */}
      <section className="landing-section" id="features">
        <div className="landing-section-header">
          <div className="landing-section-tag">{t('landing.how.tag')}</div>
          <h2 className="landing-section-title">{t('landing.how.title')}</h2>
          <p className="landing-section-desc">{t('landing.how.desc')}</p>
        </div>
        <div className="landing-steps">
          <div className="landing-step">
            <div className="landing-step-icon">💰</div>
            <div className="landing-step-number">1</div>
            <div className="landing-step-title">{t('landing.how.step1Title')}</div>
            <div className="landing-step-desc">{t('landing.how.step1Desc')}</div>
            <div className="landing-step-arrow">→</div>
          </div>
          <div className="landing-step">
            <div className="landing-step-icon">📈</div>
            <div className="landing-step-number">2</div>
            <div className="landing-step-title">{t('landing.how.step2Title')}</div>
            <div className="landing-step-desc">{t('landing.how.step2Desc')}</div>
            <div className="landing-step-arrow">→</div>
          </div>
          <div className="landing-step">
            <div className="landing-step-icon">🚀</div>
            <div className="landing-step-number">3</div>
            <div className="landing-step-title">{t('landing.how.step3Title')}</div>
            <div className="landing-step-desc">{t('landing.how.step3Desc')}</div>
          </div>
        </div>
      </section>

      {/* -- Why ProFundX -- */}
      <section className="landing-section" style={{ paddingTop: 0 }}>
        <div className="landing-section-header">
          <div className="landing-section-tag">{t('landing.why.tag')}</div>
          <h2 className="landing-section-title">{t('landing.why.title')}</h2>
          <p className="landing-section-desc">{t('landing.why.desc')}</p>
        </div>
        <div className="landing-features">
          {FEATURES.map((f, i) => (
            <div key={i} className="landing-feature">
              <div className="landing-feature-icon" style={{ background: `${f.color}15`, color: f.color }}>{f.icon}</div>
              <div className="landing-feature-title">{f.title}</div>
              <div className="landing-feature-desc">{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* -- Pricing Preview -- */}
      <section className="landing-section" id="pricing">
        <div className="landing-section-header">
          <div className="landing-section-tag">{t('landing.pricing.tag')}</div>
          <h2 className="landing-section-title">{t('landing.pricing.title')}</h2>
          <p className="landing-section-desc">{t('landing.pricing.desc')}</p>
        </div>
        <div className="landing-pricing-grid">
          {PLANS.map((p, i) => (
            <div key={i} className={`landing-pricing-card ${p.popular ? 'featured' : ''}`}>
              <div className="landing-pricing-size">{p.size}</div>
              <div className="landing-pricing-amount">{p.evalPrice} <span>{t('landing.pricing.evaluation')}</span></div>
              <div className="landing-pricing-amount" style={{ fontSize: 28, marginTop: 4 }}>{p.instantPrice} <span style={{ fontSize: 14 }}>{t('landing.pricing.instant')}</span></div>
              <div className="landing-pricing-detail">{t('landing.pricing.onetime')}</div>
              <ul className="landing-pricing-features">
                <li>{t('landing.pricing.featSplit')}</li>
                <li>{t('landing.pricing.featLeverage')}</li>
                <li>{t('landing.pricing.featTracking')}</li>
                <li>{t('landing.pricing.featWithdrawals')}</li>
                <li>{t('landing.pricing.featPlatform')}</li>
                <li>{t('landing.pricing.featSupport')}</li>
              </ul>
              <Link to={`/${lang}/register`} className={`landing-pricing-btn ${p.popular ? 'featured' : ''}`}>
                {t('landing.pricing.getStarted')}
              </Link>
            </div>
          ))}
        </div>
        <div style={{ textAlign: 'center', marginTop: 32 }}>
          <Link to={`/${lang}/pricing`} className="landing-hero-btn landing-hero-btn-secondary">
            {t('landing.pricing.viewAll')} →
          </Link>
        </div>
      </section>

      {/* -- Trading Rules -- */}
      <section className="landing-section" id="rules" style={{ paddingTop: 0 }}>
        <div className="landing-section-header">
          <div className="landing-section-tag">{t('landing.rules.tag')}</div>
          <h2 className="landing-section-title">{t('landing.rules.title')}</h2>
          <p className="landing-section-desc">{t('landing.rules.desc')}</p>
        </div>
        <table className="landing-rules-table">
          <thead>
            <tr>
              <th>{t('landing.rules.rule')}</th>
              <th>{t('landing.rules.phase1')}</th>
              <th>{t('landing.rules.phase2')}</th>
              <th>{t('landing.rules.funded')}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ fontWeight: 600, color: '#d1d4dc' }}>{t('landing.rules.profitTarget')}</td>
              <td><span className="highlight">{t('landing.rules.pct8')}</span></td>
              <td><span className="highlight">{t('landing.rules.pct5')}</span></td>
              <td>{t('landing.rules.noTarget')}</td>
            </tr>
            <tr>
              <td style={{ fontWeight: 600, color: '#d1d4dc' }}>{t('landing.rules.dailyLoss')}</td>
              <td>{t('landing.rules.pct4_5')}</td>
              <td>{t('landing.rules.pct4_5')}</td>
              <td>{t('landing.rules.pct4_5')}</td>
            </tr>
            <tr>
              <td style={{ fontWeight: 600, color: '#d1d4dc' }}>{t('landing.rules.overallLoss')}</td>
              <td>{t('landing.rules.pct8_10')}</td>
              <td>{t('landing.rules.pct8_10')}</td>
              <td>{t('landing.rules.pct8_10')}</td>
            </tr>
            <tr>
              <td style={{ fontWeight: 600, color: '#d1d4dc' }}>{t('landing.rules.leverage')}</td>
              <td>{t('landing.rules.leverage100')}</td>
              <td>{t('landing.rules.leverage100')}</td>
              <td>{t('landing.rules.leverage100')}</td>
            </tr>
            <tr>
              <td style={{ fontWeight: 600, color: '#d1d4dc' }}>{t('landing.rules.minDays')}</td>
              <td>{t('landing.rules.days5')}</td>
              <td>{t('landing.rules.days5')}</td>
              <td>{t('landing.rules.none')}</td>
            </tr>
            <tr>
              <td style={{ fontWeight: 600, color: '#d1d4dc' }}>{t('landing.rules.profitSplit')}</td>
              <td colSpan={3} style={{ textAlign: 'center', color: '#22c55e', fontWeight: 700 }}>{t('landing.rules.splitValue')}</td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* -- FAQ -- */}
      <section className="landing-section" id="faq" style={{ paddingTop: 0 }}>
        <div className="landing-section-header">
          <div className="landing-section-tag">{t('landing.faq.tag')}</div>
          <h2 className="landing-section-title">{t('landing.faq.title')}</h2>
          <p className="landing-section-desc">{t('landing.faq.desc')}</p>
        </div>
        <div className="landing-faq">
          {FAQ.map((item, i) => (
            <div key={i} className="landing-faq-item">
              <button
                className={`landing-faq-question ${openFaq === i ? 'open' : ''}`}
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
              >
                {item.q}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
              <div className={`landing-faq-answer ${openFaq === i ? 'open' : ''}`}>
                <p>{item.a}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* -- CTA -- */}
      <section className="landing-cta">
        <div className="landing-cta-bg" />
        <div className="landing-cta-content">
          <h2 className="landing-cta-title">{t('landing.cta.title')}</h2>
          <p className="landing-cta-desc">{t('landing.cta.desc')}</p>
          <Link to={`/${lang}/register`} className="landing-cta-btn">
            {t('landing.cta.button')} →
          </Link>
        </div>
      </section>

      {/* -- Footer -- */}
      <Footer />
    </div>
  )
}
