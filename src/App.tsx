import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext.tsx'
import { ToastProvider } from './contexts/ToastContext.tsx'
import { lazy, Suspense } from 'react'
import type { ReactNode } from 'react'
import './App.css'

const LoginPage = lazy(() => import('./pages/Login.tsx'))
const RegisterPage = lazy(() => import('./pages/Register.tsx'))
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPassword.tsx'))
const ResetPasswordPage = lazy(() => import('./pages/ResetPassword.tsx'))
const VerifyEmailPage = lazy(() => import('./pages/VerifyEmail.tsx'))
const DashboardPage = lazy(() => import('./pages/Dashboard.tsx'))
const PricingPage = lazy(() => import('./pages/Pricing.tsx'))
const AccountDetailPage = lazy(() => import('./pages/AccountDetail.tsx'))
const TradePage = lazy(() => import('./pages/Trade.tsx'))
const PaymentSuccessPage = lazy(() => import('./pages/PaymentSuccess.tsx'))
const ProfilePage = lazy(() => import('./pages/user/ProfilePage.tsx'))
const KycPage = lazy(() => import('./pages/user/KycPage.tsx'))
const TradingHistoryPage = lazy(() => import('./pages/user/TradingHistoryPage.tsx'))
const PayoutRequestPage = lazy(() => import('./pages/user/PayoutRequestPage.tsx'))
const ReferralPage = lazy(() => import('./pages/user/ReferralPage.tsx'))
const AdminDashboardPage = lazy(() => import('./pages/admin/AdminDashboard.tsx'))
const AdminUsersPage = lazy(() => import('./pages/admin/AdminUsers.tsx'))
const AdminAccountsPage = lazy(() => import('./pages/admin/AdminAccounts.tsx'))
const AdminPayoutsPage = lazy(() => import('./pages/admin/AdminPayouts.tsx'))
const AdminPaymentsPage = lazy(() => import('./pages/admin/AdminPayments.tsx'))
const AdminViolationsPage = lazy(() => import('./pages/admin/AdminViolations.tsx'))
const AdminRulesPage = lazy(() => import('./pages/admin/AdminRules.tsx'))

function SuspenseWrapper({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0a0e17' }}>
        <div className="app-spinner" />
      </div>
    }>
      {children}
    </Suspense>
  )
}

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0a0e17', flexDirection: 'column', gap: 16 }}>
      <div className="app-spinner" />
      <span style={{ color: '#6b7280', fontSize: 14 }}>Loading...</span>
    </div>
  )
  return user ? <SuspenseWrapper>{children}</SuspenseWrapper> : <Navigate to="/login" replace />
}

function AdminRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'admin') return <Navigate to="/dashboard" replace />
  return <SuspenseWrapper>{children}</SuspenseWrapper>
}

function GuestRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return null
  return user ? <Navigate to="/dashboard" replace /> : <SuspenseWrapper>{children}</SuspenseWrapper>
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
            <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />
            <Route path="/forgot-password" element={<GuestRoute><ForgotPasswordPage /></GuestRoute>} />
            <Route path="/reset-password/:token" element={<GuestRoute><ResetPasswordPage /></GuestRoute>} />
            <Route path="/verify-email" element={<SuspenseWrapper><VerifyEmailPage /></SuspenseWrapper>} />
            <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
            <Route path="/pricing" element={<ProtectedRoute><PricingPage /></ProtectedRoute>} />
            <Route path="/account/:id" element={<ProtectedRoute><AccountDetailPage /></ProtectedRoute>} />
            <Route path="/trade/:id" element={<ProtectedRoute><TradePage /></ProtectedRoute>} />
            <Route path="/payment/success" element={<ProtectedRoute><PaymentSuccessPage /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
            <Route path="/kyc" element={<ProtectedRoute><KycPage /></ProtectedRoute>} />
            <Route path="/history" element={<ProtectedRoute><TradingHistoryPage /></ProtectedRoute>} />
            <Route path="/payout" element={<ProtectedRoute><PayoutRequestPage /></ProtectedRoute>} />
            <Route path="/referral" element={<ProtectedRoute><ReferralPage /></ProtectedRoute>} />
            <Route path="/admin" element={<AdminRoute><AdminDashboardPage /></AdminRoute>} />
            <Route path="/admin/users" element={<AdminRoute><AdminUsersPage /></AdminRoute>} />
            <Route path="/admin/accounts" element={<AdminRoute><AdminAccountsPage /></AdminRoute>} />
            <Route path="/admin/payouts" element={<AdminRoute><AdminPayoutsPage /></AdminRoute>} />
            <Route path="/admin/payments" element={<AdminRoute><AdminPaymentsPage /></AdminRoute>} />
            <Route path="/admin/violations" element={<AdminRoute><AdminViolationsPage /></AdminRoute>} />
            <Route path="/admin/rules" element={<AdminRoute><AdminRulesPage /></AdminRoute>} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
