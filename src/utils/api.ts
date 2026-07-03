const API_BASE = 'http://localhost:3001/api'

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

  private async request<T = any>(endpoint: string, options: FetchOptions = {}, retryCount = 0): Promise<T> {
    const { params, ...fetchOptions } = options

    let url = `${API_BASE}${endpoint}`
    if (params) {
      const searchParams = new URLSearchParams()
      Object.entries(params).forEach(([k, v]) => searchParams.set(k, String(v)))
      url += `?${searchParams.toString()}`
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(fetchOptions.headers as Record<string, string> || {}),
    }

    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`
    }

    const response = await fetch(url, {
      ...fetchOptions,
      headers,
      credentials: 'include',
    })

    if (response.status === 401 && retryCount === 0) {
      const newToken = await this.tryRefresh()
      if (newToken) {
        return this.request<T>(endpoint, options, 1)
      }
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Network error' }))
      throw new Error(error.error || `HTTP ${response.status}`)
    }

    return response.json()
  }

  get<T = any>(endpoint: string, options?: FetchOptions) {
    return this.request<T>(endpoint, { ...options, method: 'GET' })
  }

  post<T = any>(endpoint: string, body?: any, options?: FetchOptions) {
    return this.request<T>(endpoint, { ...options, method: 'POST', body: body ? JSON.stringify(body) : undefined })
  }

  put<T = any>(endpoint: string, body?: any, options?: FetchOptions) {
    return this.request<T>(endpoint, { ...options, method: 'PUT', body: body ? JSON.stringify(body) : undefined })
  }

  delete<T = any>(endpoint: string, options?: FetchOptions) {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' })
  }
}

export const api = new ApiClient()

// Auth
export const authApi = {
  register: (data: { email: string; password: string; firstName?: string; lastName?: string }) =>
    api.post<{ user: any; accessToken: string }>('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post<{ user: any; accessToken: string }>('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  getProfile: () => api.get('/auth/me'),
  updateProfile: (data: any) => api.put('/auth/me', data),
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
}

// Trading
export const tradingApi = {
  placeOrder: (data: any) => api.post('/trading/order', data),
  modifyOrder: (id: string, data: any) => api.put(`/trading/order/${id}`, data),
  cancelOrder: (id: string, accountId: string) => api.delete(`/trading/order/${id}`, { body: JSON.stringify({ accountId }) }),
  getOrders: (accountId: string) => api.get(`/trading/orders/${accountId}`),
  getPositions: (accountId: string) => api.get(`/trading/positions/${accountId}`),
  modifyPosition: (id: string, data: any) => api.put(`/trading/position/${id}`, data),
  closePosition: (id: string, accountId: string, volume?: number, price?: number) => api.post(`/trading/position/${id}/close`, { accountId, volume, price }),
  getHistory: (accountId: string, page = 1, limit = 50) =>
    api.get(`/trading/history/${accountId}`, { params: { page, limit } }),
  getStats: (accountId: string) => api.get(`/trading/stats/${accountId}`),
}

// Risk
export const riskApi = {
  getStatus: (accountId: string) => api.get(`/risk/status/${accountId}`),
}

// Reports
export const reportApi = {
  getDaily: (accountId: string, date?: string) =>
    api.get(`/reports/daily/${accountId}`, { params: { date: date || '' } }),
  getEquity: (accountId: string, days = 30) =>
    api.get(`/reports/equity/${accountId}`, { params: { days } }),
  getStats: (accountId: string) => api.get(`/reports/stats/${accountId}`),
  getSymbols: (accountId: string) => api.get(`/reports/symbols/${accountId}`),
}

// Payments
export const paymentApi = {
  checkout: (accountSize: number, accountType: string) =>
    api.post('/payments/checkout', { accountSize, accountType }),
  submitTx: (txId: string, txHash: string) =>
    api.post('/payments/submit-tx', { txId, txHash }),
  getStatus: (txId: string) => api.get(`/payments/status/${txId}`),
  requestPayout: (accountId: string, amount: number) =>
    api.post('/payments/payout', { accountId, amount }),
  getPayouts: () => api.get('/payments/payouts'),
  getHistory: () => api.get('/payments/history'),
}

// Admin — payments
export const adminPaymentApi = {
  getPayments: (page = 1, limit = 20) => api.get('/admin/payments', { params: { page, limit } }),
  approvePayment: (id: string, status: string) => api.put(`/admin/payments/${id}`, { status }),
}

// Admin
export const adminApi = {
  getStats: () => api.get('/admin/stats'),
  getUsers: (page = 1, limit = 20) => api.get('/admin/users', { params: { page, limit } }),
  updateUser: (id: string, data: any) => api.put(`/admin/users/${id}`, data),
  getAccounts: (page = 1, limit = 20) => api.get('/admin/accounts', { params: { page, limit } }),
  updateAccount: (id: string, data: any) => api.put(`/admin/accounts/${id}`, data),
  getPayouts: (page = 1, limit = 20) => api.get('/admin/payouts', { params: { page, limit } }),
  processPayout: (id: string, status: string) => api.put(`/admin/payouts/${id}`, { status }),
  getViolations: () => api.get('/admin/violations'),
  updateRules: (accountSize: number, phase: string, data: any) =>
    api.put(`/admin/rules/${accountSize}/${phase}`, data),
}
