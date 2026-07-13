import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '../contexts/AuthContext.tsx'

// ── Password strength helpers ─────────────────────────────────────────────
interface StrengthResult {
  score: number  // 0-4
  label: string
  color: string
  checks: { label: string; ok: boolean }[]
}

function getPasswordStrength(password: string): StrengthResult {
  const checks = [
    { label: '8+ characters',         ok: password.length >= 8 },
    { label: 'Uppercase letter (A-Z)', ok: /[A-Z]/.test(password) },
    { label: 'Number (0-9)',           ok: /[0-9]/.test(password) },
    { label: 'Special character',     ok: /[!@#$%^&*(),.?":{}|<>_\-]/.test(password) },
  ]
  const score = checks.filter((c) => c.ok).length
  const labels = ['Too weak', 'Weak', 'Fair', 'Good', 'Strong']
  const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#10b981']
  return { score, label: labels[score], color: colors[score], checks }
}

function PasswordStrength({ password }: { password: string }) {
  if (!password) return null
  const { score, label, color, checks } = getPasswordStrength(password)
  return (
    <div style={{ marginTop: 8 }}>
      {/* Strength bar */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: 4,
              borderRadius: 2,
              background: i <= score ? color : '#1f2937',
              transition: 'background 0.2s',
            }}
          />
        ))}
      </div>
      {/* Label */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 11, color: '#6b7280' }}>Strength</span>
        <span style={{ fontSize: 11, color, fontWeight: 600 }}>{label}</span>
      </div>
      {/* Checklist */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 8px' }}>
        {checks.map((c) => (
          <div key={c.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ fontSize: 10, color: c.ok ? '#22c55e' : '#4b5563' }}>{c.ok ? '✓' : '○'}</span>
            <span style={{ fontSize: 11, color: c.ok ? '#9ca3af' : '#4b5563' }}>{c.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

const registerSchema = z
  .object({
    firstName: z.string().min(1, 'register.required'),
    lastName: z.string().min(1, 'register.required'),
    email: z.string().email('login.invalidEmail'),
    password: z
      .string()
      .min(8, 'password.requirements')
      .regex(/[A-Z]/, 'password.requirements')
      .regex(/[0-9]/, 'password.requirements')
      .regex(/[!@#$%^&*(),.?":{}|<>_\-]/, 'password.requirements'),
    confirmPassword: z.string().min(1, 'register.required'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'password.match',
    path: ['confirmPassword'],
  })

type RegisterForm = z.infer<typeof registerSchema>

export default function RegisterPage() {
  const { t, i18n } = useTranslation('auth')
  const {
    register,
    handleSubmit,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  })
  const { register: registerUser } = useAuth()
  const navigate = useNavigate()
  const lang = i18n.language
  const watchedPassword = watch('password', '')

  const onSubmit = async (data: RegisterForm) => {
    try {
      await registerUser({
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
      })
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
          width: 440,
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
          {t('register.title')}
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
          <div className="auth-name-row" style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', color: '#9ca3af', fontSize: 13, marginBottom: 6 }}>
                {t('register.firstName')}
              </label>
              <input
                {...register('firstName')}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  background: '#1f2937',
                  border: errors.firstName ? '1px solid #ef4444' : '1px solid #374151',
                  borderRadius: 8,
                  color: '#e0e0e0',
                  fontSize: 14,
                  boxSizing: 'border-box',
                }}
                placeholder={t('register.firstName')}
              />
              {errors.firstName && (
                <p style={{ color: '#ef4444', fontSize: 12, margin: '4px 0 0' }}>{t(errors.firstName.message || '')}</p>
              )}
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', color: '#9ca3af', fontSize: 13, marginBottom: 6 }}>
                {t('register.lastName')}
              </label>
              <input
                {...register('lastName')}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  background: '#1f2937',
                  border: errors.lastName ? '1px solid #ef4444' : '1px solid #374151',
                  borderRadius: 8,
                  color: '#e0e0e0',
                  fontSize: 14,
                  boxSizing: 'border-box',
                }}
                placeholder={t('register.lastName')}
              />
              {errors.lastName && (
                <p style={{ color: '#ef4444', fontSize: 12, margin: '4px 0 0' }}>{t(errors.lastName.message || '')}</p>
              )}
            </div>
          </div>
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
              placeholder="you@example.com"
            />
            {errors.email && (
              <p style={{ color: '#ef4444', fontSize: 12, margin: '4px 0 0' }}>{t(errors.email.message || '')}</p>
            )}
          </div>
          <div style={{ marginBottom: 16 }}>
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
              placeholder={t('password.requirements')}
            />
            {errors.password && (
              <p style={{ color: '#ef4444', fontSize: 12, margin: '4px 0 0' }}>{t(errors.password.message || '')}</p>
            )}
            <PasswordStrength password={watchedPassword} />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', color: '#9ca3af', fontSize: 13, marginBottom: 6 }}>
              {t('register.confirmPassword')}
            </label>
            <input
              type="password"
              {...register('confirmPassword')}
              style={{
                width: '100%',
                padding: '10px 14px',
                background: '#1f2937',
                border: errors.confirmPassword ? '1px solid #ef4444' : '1px solid #374151',
                borderRadius: 8,
                color: '#e0e0e0',
                fontSize: 14,
                boxSizing: 'border-box',
              }}
              placeholder="••••••••"
            />
            {errors.confirmPassword && (
              <p style={{ color: '#ef4444', fontSize: 12, margin: '4px 0 0' }}>{t(errors.confirmPassword.message || '')}</p>
            )}
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
            {isSubmitting ? t('actions.loading', { ns: 'common' }) : t('register.title')}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 24, color: '#6b7280', fontSize: 13 }}>
          {t('register.haveAccount')}{' '}
          <Link to={`/${lang}/login`} style={{ color: '#3b82f6', textDecoration: 'none' }}>
            {t('register.login')}
          </Link>
        </p>
      </div>
    </div>
  )
}
