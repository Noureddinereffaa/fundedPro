import { createContext, useContext, useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import { api, authApi } from '../utils/api.ts'

interface User {
  id: string
  email: string
  firstName?: string
  lastName?: string
  role: string
  kycStatus?: string
  createdAt?: string
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (data: { email: string; password: string; firstName?: string; lastName?: string }) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (token) {
      api.setToken(token)
      authApi.getProfile()
        .then(data => setUser(data))
        .catch(() => {
          localStorage.removeItem('accessToken')
          api.setToken(null)
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const login = async (email: string, password: string) => {
    const result = await authApi.login({ email, password })
    localStorage.setItem('accessToken', result.accessToken)
    api.setToken(result.accessToken)
    setUser(result.user)
  }

  const register = async (data: { email: string; password: string; firstName?: string; lastName?: string }) => {
    const result = await authApi.register(data)
    localStorage.setItem('accessToken', result.accessToken)
    api.setToken(result.accessToken)
    setUser(result.user)
  }

  const logout = async () => {
    await authApi.logout().catch(() => {})
    localStorage.removeItem('accessToken')
    api.setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
