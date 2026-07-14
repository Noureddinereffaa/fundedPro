import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Layout from '../components/Layout.tsx'
import { SeoHead } from '../i18n/SeoHead'

export default function NotFoundPage() {
  const { t } = useTranslation('common')
  return (
    <Layout>
      <SeoHead title="Page Not Found" description="The page you're looking for doesn't exist." noIndex={true} />
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          gap: 16,
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 72, fontWeight: 700, color: '#1a1e2e', lineHeight: 1 }}>{t('notFound.title')}</div>
        <div style={{ fontSize: 18, color: '#d1d4dc', fontWeight: 600 }}>{t('notFound.message')}</div>
        <div style={{ fontSize: 13, color: '#787b86', maxWidth: 360 }}>
          {t('notFound.description')}
        </div>
        <Link
          to="/dashboard"
          style={{
            marginTop: 8,
            padding: '8px 20px',
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 600,
            background: '#3b82f6',
            color: '#fff',
            textDecoration: 'none',
          }}
        >
          {t('notFound.goToDashboard')}
        </Link>
      </div>
    </Layout>
  )
}
