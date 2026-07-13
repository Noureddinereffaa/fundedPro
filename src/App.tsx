import { BrowserRouter, Routes, Route, Navigate, useParams, useNavigate, Outlet, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext.tsx'
import { ToastProvider } from './contexts/ToastContext.tsx'
import { lazy, Suspense, useEffect, useRef, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { SUPPORTED_CODES, getLanguageDir } from './i18n/config'
import { SeoHead } from './i18n/SeoHead'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'
import CookieConsent from './components/CookieConsent.tsx'
import './App.css'

const LoginPage = lazy(() => import('./pages/Login.tsx'))
const RegisterPage = lazy(() => import('./pages/Register.tsx'))
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPassword.tsx'))
const ResetPasswordPage = lazy(() => import('./pages/ResetPassword.tsx'))
const VerifyEmailPage = lazy(() => import('./pages/VerifyEmail.tsx'))
const DashboardPage = lazy(() => import('./pages/Dashboard.tsx'))
const LandingPage = lazy(() => import('./pages/LandingPage.tsx'))
const PricingPage = lazy(() => import('./pages/Pricing.tsx'))
const AccountDetailPage = lazy(() => import('./pages/AccountDetail.tsx'))
const TradePage = lazy(() => import('./pages/Trade.tsx'))
const PortfolioPage = lazy(() => import('./pages/PortfolioPage.tsx'))
const PaymentSuccessPage = lazy(() => import('./pages/PaymentSuccess.tsx'))
const ProfilePage = lazy(() => import('./pages/user/ProfilePage.tsx'))
const KycPage = lazy(() => import('./pages/user/KycPage.tsx'))
const TradingHistoryPage = lazy(() => import('./pages/user/TradingHistoryPage.tsx'))
const PayoutRequestPage = lazy(() => import('./pages/user/PayoutRequestPage.tsx'))
const ReferralPage = lazy(() => import('./pages/user/ReferralPage.tsx'))
const AlertsPage = lazy(() => import('./pages/AlertsPage.tsx'))
const AdminDashboardPage = lazy(() => import('./pages/admin/AdminDashboard.tsx'))
const AdminUsersPage = lazy(() => import('./pages/admin/AdminUsers.tsx'))
const AdminAccountsPage = lazy(() => import('./pages/admin/AdminAccounts.tsx'))
const AdminPayoutsPage = lazy(() => import('./pages/admin/AdminPayouts.tsx'))
const AdminPaymentsPage = lazy(() => import('./pages/admin/AdminPayments.tsx'))
const AdminViolationsPage = lazy(() => import('./pages/admin/AdminViolations.tsx'))
const AdminRulesPage = lazy(() => import('./pages/admin/AdminRules.tsx'))
const AdminCouponsPage = lazy(() => import('./pages/admin/AdminCoupons.tsx'))
const AdminSettingsPage = lazy(() => import('./pages/admin/AdminSettings.tsx'))
const AdminMessagesPage = lazy(() => import('./pages/admin/AdminMessages.tsx'))
const LeaderboardPage = lazy(() => import('./pages/Leaderboard.tsx'))
const BadgesPage = lazy(() => import('./pages/Badges.tsx'))
const AboutUsPage = lazy(() => import('./pages/AboutUs.tsx'))
const ContactPage = lazy(() => import('./pages/Contact.tsx'))
const FaqPage = lazy(() => import('./pages/FaqPage.tsx'))
const TermsPage = lazy(() => import('./pages/Terms.tsx'))
const PrivacyPage = lazy(() => import('./pages/Privacy.tsx'))
const NotFoundPage = lazy(() => import('./pages/NotFound.tsx'))

function Preloader() {
  useEffect(() => {
    import('./pages/Dashboard.tsx')
    import('./pages/Trade.tsx')
    import('./pages/Login.tsx')
  }, [])
  return null
}

function SuspenseWrapper({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100vh',
            background: '#0a0e17',
          }}
        >
          <div className="app-spinner" />
        </div>
      }
    >
      {children}
    </Suspense>
  )
}

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const { i18n } = useTranslation()
  if (loading)
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          background: '#0a0e17',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <div className="app-spinner" />
        <span style={{ color: '#6b7280', fontSize: 14 }}>Loading...</span>
      </div>
    )
  const lang = i18n.language
  return user ? <SuspenseWrapper>{children}</SuspenseWrapper> : <Navigate to={`/${lang}/login`} replace />
}

function AdminRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const { i18n } = useTranslation()
  if (loading) return null
  const lang = i18n.language
  if (!user) return <Navigate to={`/${lang}/login`} replace />
  if (user.role !== 'admin') return <Navigate to={`/${lang}/dashboard`} replace />
  return <SuspenseWrapper>{children}</SuspenseWrapper>
}

function GuestRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const { i18n } = useTranslation()
  if (loading) return null
  const lang = i18n.language
  return user ? <Navigate to={`/${lang}/dashboard`} replace /> : <SuspenseWrapper>{children}</SuspenseWrapper>
}

function LangLayout() {
  const { lang } = useParams<{ lang: string }>()
  const { i18n } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const initialised = useRef(false)

  useEffect(() => {
    if (!lang || !SUPPORTED_CODES.includes(lang)) {
      const path = location.pathname.replace(/^\/[a-z]{2}/, '')
      navigate(`/en${path}${location.search}`, { replace: true })
      return
    }
    if (i18n.language !== lang) {
      i18n.changeLanguage(lang)
    }
    document.documentElement.lang = lang
    document.documentElement.dir = getLanguageDir(lang)
    document.documentElement.classList.remove('rtl', 'ltr')
    document.documentElement.classList.add(getLanguageDir(lang))
    initialised.current = true
  }, [lang])

  if (!lang || !SUPPORTED_CODES.includes(lang)) return null

  return (
    <>
      <SeoHead />
      <Outlet />
    </>
  )
}

function RootRedirect() {
  const navigate = useNavigate()

  useEffect(() => {
    const cookieLang = document.cookie
      .split('; ')
      .find((row) => row.startsWith('i18next='))
      ?.split('=')[1]

    let detected = 'en'
    if (cookieLang && SUPPORTED_CODES.includes(cookieLang)) {
      detected = cookieLang
    } else {
      const browserLangs = navigator.languages || [navigator.language]
      for (const bl of browserLangs) {
        const base = bl.split('-')[0]
        if (SUPPORTED_CODES.includes(base)) {
          detected = base
          break
        }
      }
    }
    navigate(`/${detected}`, { replace: true })
  }, [navigate])

  return null
}

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Preloader />
        <CookieConsent />
        <AuthProvider>
          <ToastProvider>
            <Routes>
              <Route path="/" element={<RootRedirect />} />
              <Route path="/:lang" element={<LangLayout />}>
                <Route index element={<GuestRoute><LandingPage /></GuestRoute>} />
                <Route
                  path="login"
                  element={
                    <GuestRoute>
                      <LoginPage />
                    </GuestRoute>
                  }
                />
                <Route
                  path="register"
                  element={
                    <GuestRoute>
                      <RegisterPage />
                    </GuestRoute>
                  }
                />
                <Route
                  path="forgot-password"
                  element={
                    <GuestRoute>
                      <ForgotPasswordPage />
                    </GuestRoute>
                  }
                />
                <Route
                  path="reset-password/:token"
                  element={
                    <GuestRoute>
                      <ResetPasswordPage />
                    </GuestRoute>
                  }
                />
                <Route
                  path="verify-email/:token"
                  element={
                    <SuspenseWrapper>
                      <VerifyEmailPage />
                    </SuspenseWrapper>
                  }
                />
                <Route
                  path="dashboard"
                  element={
                    <ProtectedRoute>
                      <DashboardPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="portfolio"
                  element={
                    <ProtectedRoute>
                      <PortfolioPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="pricing"
                  element={
                    <ProtectedRoute>
                      <PricingPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="leaderboard"
                  element={
                    <SuspenseWrapper>
                      <LeaderboardPage />
                    </SuspenseWrapper>
                  }
                />
                <Route
                  path="badges"
                  element={
                    <ProtectedRoute>
                      <BadgesPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="about"
                  element={
                    <SuspenseWrapper>
                      <AboutUsPage />
                    </SuspenseWrapper>
                  }
                />
                <Route
                  path="contact"
                  element={
                    <SuspenseWrapper>
                      <ContactPage />
                    </SuspenseWrapper>
                  }
                />
                <Route
                  path="faq"
                  element={
                    <SuspenseWrapper>
                      <FaqPage />
                    </SuspenseWrapper>
                  }
                />
                <Route
                  path="terms"
                  element={
                    <SuspenseWrapper>
                      <TermsPage />
                    </SuspenseWrapper>
                  }
                />
                <Route
                  path="privacy"
                  element={
                    <SuspenseWrapper>
                      <PrivacyPage />
                    </SuspenseWrapper>
                  }
                />
                <Route
                  path="account/:id"
                  element={
                    <ProtectedRoute>
                      <AccountDetailPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="trade/:id"
                  element={
                    <ProtectedRoute>
                      <TradePage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="payment/success"
                  element={
                    <ProtectedRoute>
                      <PaymentSuccessPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="profile"
                  element={
                    <ProtectedRoute>
                      <ProfilePage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="kyc"
                  element={
                    <ProtectedRoute>
                      <KycPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="history"
                  element={
                    <ProtectedRoute>
                      <TradingHistoryPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="payout"
                  element={
                    <ProtectedRoute>
                      <PayoutRequestPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="referral"
                  element={
                    <ProtectedRoute>
                      <ReferralPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="alerts"
                  element={
                    <ProtectedRoute>
                      <AlertsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="admin"
                  element={
                    <AdminRoute>
                      <AdminDashboardPage />
                    </AdminRoute>
                  }
                />
                <Route
                  path="admin/users"
                  element={
                    <AdminRoute>
                      <AdminUsersPage />
                    </AdminRoute>
                  }
                />
                <Route
                  path="admin/accounts"
                  element={
                    <AdminRoute>
                      <AdminAccountsPage />
                    </AdminRoute>
                  }
                />
                <Route
                  path="admin/payouts"
                  element={
                    <AdminRoute>
                      <AdminPayoutsPage />
                    </AdminRoute>
                  }
                />
                <Route
                  path="admin/payments"
                  element={
                    <AdminRoute>
                      <AdminPaymentsPage />
                    </AdminRoute>
                  }
                />
                <Route
                  path="admin/violations"
                  element={
                    <AdminRoute>
                      <AdminViolationsPage />
                    </AdminRoute>
                  }
                />
                <Route
                  path="admin/rules"
                  element={
                    <AdminRoute>
                      <AdminRulesPage />
                    </AdminRoute>
                  }
                />
                <Route
                  path="admin/coupons"
                  element={
                    <AdminRoute>
                      <AdminCouponsPage />
                    </AdminRoute>
                  }
                />
                <Route
                  path="admin/settings"
                  element={
                    <AdminRoute>
                      <AdminSettingsPage />
                    </AdminRoute>
                  }
                />
                <Route
                  path="admin/messages"
                  element={
                    <AdminRoute>
                      <AdminMessagesPage />
                    </AdminRoute>
                  }
                />
                <Route
                  path="*"
                  element={
                    <SuspenseWrapper>
                      <NotFoundPage />
                    </SuspenseWrapper>
                  }
                />
              </Route>
            </Routes>
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  )
}

export default App
