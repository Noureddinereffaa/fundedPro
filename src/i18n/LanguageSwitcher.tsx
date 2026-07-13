import { useTranslation } from 'react-i18next'
import { useNavigate, useLocation } from 'react-router-dom'
import { SUPPORTED_LANGUAGES } from './config'

interface LanguageSwitcherProps {
  theme: 'dark' | 'light'
  compact?: boolean
}

export function LanguageSwitcher({ theme, compact = false }: LanguageSwitcherProps) {
  const { i18n } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const currentLang = i18n.language

  const handleLanguageChange = (code: string) => {
    if (code === currentLang) return
    const path = location.pathname.replace(/^\/[a-z]{2}(\/|$)/, '/$1')
    i18n.changeLanguage(code)
    navigate(`/${code}${path}${location.search}`, { replace: true })
  }

  const current = SUPPORTED_LANGUAGES.find((l) => l.code === currentLang) || SUPPORTED_LANGUAGES[0]

  if (compact) {
    return (
      <div style={{ position: 'relative' }}>
        <select
          value={currentLang}
          onChange={(e) => handleLanguageChange(e.target.value)}
          aria-label="Select language"
          style={{
            appearance: 'none',
            padding: '6px 28px 6px 8px',
            borderRadius: 8,
            background: theme === 'dark' ? '#1f2937' : '#f3f4f6',
            border: `1px solid ${theme === 'dark' ? '#374151' : '#d1d5db'}`,
            color: theme === 'dark' ? '#e0e0e0' : '#1f2937',
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 500,
            outline: 'none',
          }}
        >
          {SUPPORTED_LANGUAGES.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.flag} {lang.name}
            </option>
          ))}
        </select>
        <svg
          style={{
            position: 'absolute',
            right: 8,
            top: '50%',
            transform: 'translateY(-50%)',
            pointerEvents: 'none',
          }}
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke={theme === 'dark' ? '#9ca3af' : '#6b7280'}
          strokeWidth="2"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <div style={{ fontSize: 11, color: '#6b7280', padding: '0 4px' }}>
        {current.flag} {current.name}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, padding: '0 4px' }}>
        {SUPPORTED_LANGUAGES.map((lang) => (
          <button
            key={lang.code}
            onClick={() => handleLanguageChange(lang.code)}
            style={{
              padding: '4px 8px',
              borderRadius: 6,
              background: lang.code === currentLang
                ? '#3b82f6'
                : theme === 'dark' ? '#1f2937' : '#f3f4f6',
              border: `1px solid ${lang.code === currentLang
                ? '#3b82f6'
                : theme === 'dark' ? '#374151' : '#d1d5db'}`,
              color: lang.code === currentLang ? '#fff' : theme === 'dark' ? '#e0e0e0' : '#1f2937',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: lang.code === currentLang ? 600 : 400,
              transition: 'all 0.15s',
            }}
          >
            {lang.flag}
          </button>
        ))}
      </div>
    </div>
  )
}
