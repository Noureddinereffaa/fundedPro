import type { User } from '../../shared/types'

const API_BASE = (import.meta.env.VITE_API_URL || (typeof window !== 'undefined' && window.location.hostname !== 'localhost' ? `${window.location.origin}/api` : 'http://localhost:3001/api')).trim().replace(/\/$/, '')

interface FetchOptions extends RequestInit {
  params?: Record<string, string | number>
}

class ApiClient {
  private accessToken: string | null = null
  private refreshPromise: Promise<string | null> | null = null

  setToken(token: string | null) {
    this.accessToken = token
  }

  getToken(): string | null {
    return this.accessToken
  }

  private async tryRefresh(): Promise<string | null> {
    if (this.refreshPromise) return this.refreshPromise
    this.refreshPromise = (async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        })
        if (!res.ok) return null
        const data = await res.json()
        if (data.accessToken) {
          this.accessToken = data.accessToken
          return data.accessToken
        }
        return null
      } catch {
        return null
      } finally {
        this.refreshPromise = null
      }
    })()
    return this.refreshPromise
  }

  private async request<T = unknown>(endpoint: string, options: FetchOptions = {}, retryCount = 0): Promise<T> {
    const { params, ...fetchOptions } = options

    let url = `${API_BASE}${endpoint}`
    if (params) {
      const searchParams = new URLSearchParams()
      Object.entries(params).forEach(([k, v]) => searchParams.set(k, String(v)))
      url += `?${searchParams.toString()}`
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((fetchOptions.headers as Record<string, string>) || {}),
    }

    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`
    }

    let response: Response
    try {
      response = await fetch(url, {
        ...fetchOptions,
        headers,
        credentials: 'include',
      })
    } catch (err) {
      throw new Error('Server is offline or unreachable. Please check your connection or try again later.')
    }

    if (response.status === 401 && retryCount === 0) {
      const newToken = await this.tryRefresh()
      if (newToken) {
        return this.request<T>(endpoint, options, 1)
      }
    }

    if (!response.ok) {
      let errorData
      const textResponse = await response.text().catch(() => '')
      try {
        errorData = textResponse ? JSON.parse(textResponse) : { error: 'Network error' }
      } catch (e) {
        errorData = { error: textResponse || 'Network error' }
      }
      throw new Error(errorData.error || `HTTP ${response.status}`)
    }

    return response.json()
  }

  get<T = unknown>(endpoint: string, options?: FetchOptions) {
    return this.request<T>(endpoint, { ...options, method: 'GET' })
  }

  post<T = unknown>(endpoint: string, body?: unknown, options?: FetchOptions) {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    })
  }

  put<T = unknown>(endpoint: string, body?: unknown, options?: FetchOptions) {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    })
  }

  delete<T = unknown>(endpoint: string, options?: FetchOptions) {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' })
  }
}

export const api = new ApiClient()

// Auth
export const authApi = {
  register: (data: { email: string; password: string; firstName?: string; lastName?: string }) =>
    api.post<{ user: User; accessToken: string }>('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post<{ user: User; accessToken: string }>('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  getProfile: () => api.get('/auth/me'),
  updateProfile: (data: { firstName?: string; lastName?: string; phone?: string; country?: string }) =>
    api.put('/auth/me', data),
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.post('/auth/change-password', data),
  forgotPassword: (email: string) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token: string, password: string) => api.post('/auth/reset-password', { token, password }),
  verifyEmail: (token: string) => api.post('/auth/verify-email', { token }),
  verifyResetToken: (token: string) => api.get(`/auth/verify-reset/${token}`),
}

// Accounts
export const accountApi = {
  getAll: (page = 1, limit = 20) => api.get('/accounts', { params: { page, limit } }),
  getById: (id: string) => api.get(`/accounts/${id}`),
  purchase: (accountSize: number, accountType: string) =>
    api.post('/accounts/purchase', { accountSize, accountType }),
  getSnapshots: (id: string, days = 30) => api.get(`/accounts/${id}/snapshots`, { params: { days } }),
  getSummary: () => api.get('/accounts/summary'),
  getPortfolioEquity: (days = 90) => api.get('/accounts/summary/equity', { params: { days } }),
}

// Trading
export const tradingApi = {
  placeOrder: (data: {
    accountId: string
    symbol: string
    type: string
    side: string
    volume: number
    price: number
    stopLoss?: number
    takeProfit?: number
  }) => api.post('/trading/order', data),
  modifyOrder: (id: string, data: Record<string, unknown>) => api.put(`/trading/order/${id}`, data),
  cancelOrder: (id: string, accountId: string) =>
    api.delete(`/trading/order/${id}`, { body: JSON.stringify({ accountId }) }),
  getOrders: (accountId: string) => api.get(`/trading/orders/${accountId}`),
  getPositions: (accountId: string) => api.get(`/trading/positions/${accountId}`),
  modifyPosition: (
    id: string,
    data: { accountId: string; stopLoss?: number | null; takeProfit?: number | null },
  ) => api.put(`/trading/position/${id}`, data),
  closePosition: (id: string, accountId: string, volume?: number, price?: number) =>
    api.post(`/trading/position/${id}/close`, { accountId, volume, price }),
  closeAllPositions: (accountId: string) => api.post(`/trading/positions/${accountId}/close-all`),
  getHistory: (accountId: string, page = 1, limit = 50) =>
    api.get(`/trading/history/${accountId}`, { params: { page, limit } }),
  getStats: (accountId: string) => api.get(`/trading/stats/${accountId}`),
}

// Risk
export const riskApi = {
  getStatus: (accountId: string) => api.get(`/risk/status/${accountId}`),
  /** Fetch risk status for ALL of the user's accounts in one request. Returns { [accountId]: RiskStatus } */
  getBatch: () => api.get<Record<string, any>>('/risk/batch'),
}


// Reports
export const reportApi = {
  getDaily: (accountId: string, date?: string) =>
    api.get(`/reports/daily/${accountId}`, { params: { date: date || '' } }),
  getEquity: (accountId: string, days = 30) => api.get(`/reports/equity/${accountId}`, { params: { days } }),
  getStats: (accountId: string) => api.get(`/reports/stats/${accountId}`),
  getSymbols: (accountId: string) => api.get(`/reports/symbols/${accountId}`),
}

// Payments
export const paymentApi = {
  getPrices: () => api.get<any>('/payments/prices'),
  checkout: (accountSize: number, accountType: string, promoCode?: string) =>
    api.post('/payments/checkout', { accountSize, accountType, promoCode }),
  submitTx: (txId: string, txHash: string) => api.post('/payments/submit-tx', { txId, txHash }),
  getStatus: (txId: string) => api.get(`/payments/status/${txId}`),
  requestPayout: (accountId: string, amount: number, method?: string, walletAddress?: string) =>
    api.post('/payments/payout', { accountId, amount, method, walletAddress }),
  getPayouts: () => api.get('/payments/payouts'),
  getHistory: () => api.get('/payments/history'),
  getMaxPayout: (accountId: string) => api.get(`/payments/max-payout/${accountId}`),
}

// Alerts & Notifications
export const alertApi = {
  create: (data: { symbol: string; condition: 'above' | 'below'; price: number; message?: string }) =>
    api.post('/alerts', data),
  list: () => api.get('/alerts'),
  delete: (id: string) => api.delete(`/alerts/${id}`),
}

export const notificationApi = {
  list: () => api.get('/alerts/notifications'),
  markRead: (id: string) => api.put(`/alerts/notifications/${id}/read`),
  markAllRead: () => api.put('/alerts/notifications/read-all'),
}

// Admin
export const adminApi = {
  getStats: () => api.get('/admin/stats'),
  getUsers: (page = 1, limit = 20) => api.get('/admin/users', { params: { page, limit } }),
  updateUser: (id: string, data: Partial<Pick<User, 'role' | 'kycStatus'>>) =>
    api.put(`/admin/users/${id}`, data),
  getAccounts: (page = 1, limit = 20) => api.get('/admin/accounts', { params: { page, limit } }),
  updateAccount: (id: string, data: Record<string, unknown>) => api.put(`/admin/accounts/${id}`, data),
  getPayouts: (page = 1, limit = 20) => api.get('/admin/payouts', { params: { page, limit } }),
  processPayout: (id: string, status: string, txHash?: string) =>
    api.put(`/admin/payouts/${id}`, { status, txHash }),
  getCoupons: () => api.get('/admin/coupons'),
  createCoupon: (data: Record<string, unknown>) => api.post('/admin/coupons', data),
  updateCoupon: (id: string, data: Record<string, unknown>) => api.put(`/admin/coupons/${id}`, data),
  deleteCoupon: (id: string) => api.delete(`/admin/coupons/${id}`),

  getSettings: () => api.get('/admin/settings'),
  updateSetting: (data: Record<string, unknown>) => api.put('/admin/settings', data),

  getContactMessages: () => api.get('/admin/contact-messages'),
  updateContactMessage: (id: string, data: Record<string, unknown>) => api.put(`/admin/contact-messages/${id}`, data),
  deleteContactMessage: (id: string) => api.delete(`/admin/contact-messages/${id}`),
  getViolations: () => api.get('/admin/violations'),
  getPayments: (page = 1, limit = 20) => api.get('/admin/payments', { params: { page, limit } }),
  approvePayment: (id: string, status: string) => api.put(`/admin/payments/${id}`, { status }),
  updateRules: (accountSize: number, phase: string, data: Record<string, unknown>) =>
    api.put(`/admin/rules/${accountSize}/${phase}`, data),
  getRules: (accountSize: number, phase: string) =>
    api.get(`/admin/rules/${accountSize}/${phase}`),
  getRulesMatrix: () => api.get('/admin/rules/matrix'),
  getBadges: () => api.get('/admin/badges'),
  createBadge: (data: Record<string, unknown>) => api.post('/admin/badges', data),
  updateBadge: (id: string, data: Record<string, unknown>) => api.put(`/admin/badges/${id}`, data),
  deleteBadge: (id: string) => api.delete(`/admin/badges/${id}`),
  seedBadges: () => api.post('/admin/badges/seed'),
}

export const badgeApi = {
  getAll: () => api.get('/badges'),
  getUserBadges: () => api.get('/badges/user'),
  check: (stats: Record<string, unknown>) => api.post('/badges/check', stats),
}
