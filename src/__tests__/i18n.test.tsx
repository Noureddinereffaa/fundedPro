import { describe, it, expect } from 'vitest'
import i18n, { SUPPORTED_LANGUAGES, isRtl, getLanguageDir, SUPPORTED_CODES } from '../i18n/config'

describe('i18n config', () => {
  it('supports 5 languages', () => {
    expect(SUPPORTED_LANGUAGES).toHaveLength(5)
    expect(SUPPORTED_CODES).toEqual(['en', 'ar', 'fr', 'es', 'id'])
  })

  it.each([
    ['en', 'ltr', false],
    ['ar', 'rtl', true],
    ['fr', 'ltr', false],
    ['es', 'ltr', false],
    ['id', 'ltr', false],
  ])('isRtl and getLanguageDir for %s', (lang, dir, rtl) => {
    expect(isRtl(lang)).toBe(rtl)
    expect(getLanguageDir(lang)).toBe(dir)
  })

  it('loads all namespaces for English', async () => {
    const ns = ['common', 'trading', 'auth', 'dashboard', 'admin']
    for (const n of ns) {
      await i18n.loadNamespaces(n)
      expect(i18n.hasResourceBundle('en', n)).toBe(true)
    }
  })

  it('loads all languages for common namespace', () => {
    for (const lang of SUPPORTED_CODES) {
      expect(i18n.hasResourceBundle(lang, 'common')).toBe(true)
    }
  })

  it('has site.name in every language', () => {
    const names: Record<string, string> = {
      en: 'ProFundX',
      ar: 'ProFundX',
      fr: 'ProFundX',
      es: 'ProFundX',
      id: 'ProFundX',
    }
    for (const [lang, expected] of Object.entries(names)) {
      expect(i18n.t('site.name', { lng: lang })).toBe(expected)
    }
  })

  it('has trading terms in Arabic (RTL)', () => {
    expect(i18n.t('terms.drawdown', { lng: 'ar', ns: 'trading' })).toBe('السحب')
  })

  it('has trading terms in French', () => {
    expect(i18n.t('terms.buy', { lng: 'fr', ns: 'trading' })).toBe('Achat')
  })

  it('has trading terms in Spanish', () => {
    expect(i18n.t('terms.sell', { lng: 'es', ns: 'trading' })).toBe('Venta')
  })

  it('has trading terms in Indonesian', () => {
    expect(i18n.t('terms.payout', { lng: 'id', ns: 'trading' })).toBe('Penarikan')
  })

  it('has auth translations in all languages', () => {
    expect(i18n.t('login.title', { lng: 'en', ns: 'auth' })).toBe('Login')
    expect(i18n.t('login.title', { lng: 'ar', ns: 'auth' })).toBe('تسجيل الدخول')
    expect(i18n.t('login.title', { lng: 'fr', ns: 'auth' })).toBe('Connexion')
    expect(i18n.t('login.title', { lng: 'es', ns: 'auth' })).toBe('Iniciar Sesión')
    expect(i18n.t('login.title', { lng: 'id', ns: 'auth' })).toBe('Masuk')
  })

  it('fallbacks to English for missing keys', () => {
    expect(i18n.t('nonexistent.key', { lng: 'ar' })).toBe('nonexistent.key')
  })
})
