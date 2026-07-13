import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '../contexts/AuthContext.tsx'

const loginSchema = z.object({
  email: z.string().email('login.invalidEmail'),
  password: z.string().min(6, 'login.passwordMin'),
})

type LoginForm = z.infer<typeof loginSchema>

export default function LoginPage() {
  const { t, i18n } = useTranslation('auth')
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })
  const { login } = useAuth()
  const navigate = useNavigate()
  const lang = i18n.language

  const onSubmit = async (data: LoginForm) => {
    try {
      await login(data.email, data.password)
      navigate(`/${lang}/dashboard`)
    } catch (err: unknown) {
      setError('root', { message: err instanceof Error ? err.message : t('login.failed') })
    }
  }

  return (
    <div
      className="auth-container"
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0a0e17',
      }}
    >
      <div
        style={{
          width: 400,
          maxWidth: 'calc(100% - 32px)',
          padding: 40,
          background: '#111827',
          borderRadius: 12,
          border: '1px solid #1f2937',
        }}
      >
        <h1 style={{ color: '#3b82f6', fontSize: 28, fontWeight: 700, textAlign: 'center', marginBottom: 8 }}>
          ProFundX
        </h1>
        <p style={{ color: '#6b7280', textAlign: 'center', marginBottom: 32, fontSize: 14 }}>
          {t('login.title')}
        </p>

        {errors.root && (
          <div
            style={{
              background: '#7f1d1d',
              color: '#fca5a5',
              padding: '10px 14px',
              borderRadius: 8,
              marginBottom: 16,
              fontSize: 13,
            }}
          >
            {errors.root.message}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', color: '#9ca3af', fontSize: 13, marginBottom: 6 }}>{t('login.email')}</label>
            <input
              type="email"
              {...register('email')}
              style={{
                width: '100%',
                padding: '10px 14px',
                background: '#1f2937',
                border: errors.email ? '1px solid #ef4444' : '1px solid #374151',
                borderRadius: 8,
                color: '#e0e0e0',
                fontSize: 14,
                boxSizing: 'border-box',
              }}
              placeholder={t('login.email')}
            />
            {errors.email && (
              <p style={{ color: '#ef4444', fontSize: 12, margin: '4px 0 0' }}>{t(errors.email.message || '')}</p>
            )}
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', color: '#9ca3af', fontSize: 13, marginBottom: 6 }}>
              {t('login.password')}
            </label>
            <input
              type="password"
              {...register('password')}
              style={{
                width: '100%',
                padding: '10px 14px',
                background: '#1f2937',
                border: errors.password ? '1px solid #ef4444' : '1px solid #374151',
                borderRadius: 8,
                color: '#e0e0e0',
                fontSize: 14,
                boxSizing: 'border-box',
              }}
              placeholder="••••••••"
            />
            {errors.password && (
              <p style={{ color: '#ef4444', fontSize: 12, margin: '4px 0 0' }}>{t(errors.password.message || '')}</p>
            )}
            <div style={{ textAlign: 'right', marginTop: 6 }}>
              <Link to={`/${lang}/forgot-password`} style={{ color: '#3b82f6', textDecoration: 'none', fontSize: 12 }}>
                {t('login.forgotPassword')}
              </Link>
            </div>
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              width: '100%',
              padding: '12px 0',
              background: isSubmitting ? '#2563eb99' : '#2563eb',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontSize: 15,
              fontWeight: 600,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
            }}
          >
            {isSubmitting ? t('actions.loading', { ns: 'common' }) : t('login.title')}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 24, color: '#6b7280', fontSize: 13 }}>
          {t('login.noAccount')}{' '}
          <Link to={`/${lang}/register`} style={{ color: '#3b82f6', textDecoration: 'none' }}>
            {t('login.signUp')}
          </Link>
        </p>
      </div>
    </div>
  )
}
