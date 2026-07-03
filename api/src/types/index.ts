import { Request } from 'express'

export interface AuthUser {
  id: string
  email: string
  role: string
}

export interface AuthRequest extends Request {
  user?: AuthUser
}

export interface JwtPayload {
  id: string
  email: string
  role: string
}

export interface PaginationQuery {
  page?: string
  limit?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

export type OrderType = 'market' | 'limit' | 'stop' | 'stop_limit'
export type OrderSide = 'buy' | 'sell'
export type OrderStatus = 'pending' | 'filled' | 'partial' | 'cancelled' | 'rejected'
export type PositionStatus = 'open' | 'closed'
export type AccountStatus = 'active' | 'passed' | 'failed' | 'suspended' | 'expired'
export type Phase = 'evaluation_1' | 'evaluation_2' | 'funded'
export type KycStatus = 'none' | 'pending' | 'verified' | 'rejected'
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded'
export type PayoutStatus = 'pending' | 'processing' | 'completed' | 'rejected'
export type UserRole = 'user' | 'admin' | 'superadmin'
