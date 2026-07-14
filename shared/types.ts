// ── Market Data Types ────────────────────────────────────────

export interface Candle {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

/** @deprecated Use Candle instead */
export type Kline = Candle

export type MarketType = 'crypto' | 'rwa' | 'forex' | 'metals' | 'indices'

export interface MarketSymbol {
  symbol: string
  name: string
  type: MarketType
  digits: number
  group: string
}

export interface Tick {
  symbol: string
  price: number
  change: number
  time: number
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected'

export interface MarketStatus {
  open: boolean
  text: string
  nextOpen: number | null
  nextClose: number | null
}

// ── Trading Types ────────────────────────────────────────────

export type TradeSide = 'buy' | 'sell'
export type OrderType = 'market' | 'limit' | 'stop'
export type OrderStatus = 'pending' | 'filled' | 'cancelled' | 'expired'

export interface Position {
  id: string
  accountId: string
  symbol: string
  side: TradeSide
  volume: number
  openPrice: number
  currentPrice?: number
  stopLoss?: number | null
  takeProfit?: number | null
  margin?: number
  swap?: number
  commission?: number
  profit?: number
  createdAt: string
  updatedAt?: string
}

export interface Order {
  id: string
  accountId: string
  symbol: string
  side: TradeSide
  type: OrderType
  volume: number
  price: number
  stopLoss?: number | null
  takeProfit?: number | null
  status: OrderStatus
  createdAt: string
  updatedAt?: string
}

export interface TradeHistory {
  id: string
  accountId: string
  symbol: string
  side: TradeSide
  volume: number
  openPrice: number
  closePrice: number
  profit: number
  swap?: number
  commission?: number
  duration?: number
  closeReason?: string
  openTime: string
  closeTime: string
}

// ── Account & User Types ─────────────────────────────────────

export interface Account {
  id: string
  accountSize: number
  balance: number
  equity: number
  status: string
  phase: string
  platform: string
  createdAt: string
  maxDailyLoss?: number
  maxTradingDays?: number
  tradingDaysCount?: number
  profitTarget?: number
  maxOverallLoss?: number
  maxPositionSize?: number
  maxOpenTrades?: number
  minTradingDays?: number
  userId?: string
  user?: Pick<User, 'id' | 'email' | 'firstName' | 'lastName'>
}

export interface PortfolioSummary {
  totalBalance: number
  totalEquity: number
  totalFloatingPnl: number
  totalMarginUsed: number
  totalFreeMargin: number
  totalOpenPositions: number
  totalAccounts: number
  activeAccounts: number
  fundedAccounts: number
  accounts: Account[]
}

export interface User {
  id: string
  email: string
  firstName?: string
  lastName?: string
  role: string
  kycStatus?: string
  createdAt?: string
}

export interface RiskStatus {
  dailyPnl: string
  dailyLossPercent: string
  profitTargetProgress: string
  openPositions: number
}

// ── Payment Types ────────────────────────────────────────────

export interface Payment {
  id: string
  amount: number
  status: string
  method?: string
  walletAddress?: string
  network?: string
  txHash?: string
  createdAt: string
  user: Pick<User, 'email' | 'firstName' | 'lastName'>
  metadata?: Record<string, unknown>
}

export interface Payout {
  id: string
  accountId: string
  userId: string
  amount: number
  status: string
  method?: string
  walletAddress?: string
  txHash?: string
  createdAt: string
  processedAt?: string
  user: Pick<User, 'email'>
  account: Pick<Account, 'accountSize'>
}

export interface Violation {
  id: string
  ruleType: string
  description?: string
  violationData?: Record<string, unknown>
  createdAt: string
  account: Pick<Account, 'accountSize' | 'status'>
}

export interface ReferralStats {
  totalReferrals: number
  activeReferrals: number
  totalEarnings: number
  pendingEarnings: number
  commissionRate: number
  referralCode: string
}

export interface AdminStats {
  totalUsers: number
  totalAccounts: number
  fundedAccounts: number
  pendingPayouts: number
  totalRevenue: number
}

// ── UI Types ─────────────────────────────────────────────────

export interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'warning' | 'info'
  read?: boolean
  time?: string
}

export interface ToastContextType {
  toasts: Toast[]
  addToast: (message: string, type?: Toast['type']) => void
  removeToast: (id: string) => void
}

export interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (data: {
    email: string
    password: string
    firstName?: string
    lastName?: string
  }) => Promise<void>
  logout: () => Promise<void>
}

// ── Badge / Achievement Types ─────────────────────────────────

export type BadgeCategory = 'progression' | 'volume' | 'profit' | 'streak' | 'risk' | 'consistency' | 'special'

export type BadgeCriteriaType =
  | 'trades_count'
  | 'profit'
  | 'win_streak'
  | 'trading_days'
  | 'passed_evaluation'
  | 'funded'
  | 'payout'
  | 'no_violations'

export interface BadgeCriteria {
  type: BadgeCriteriaType
  value: number
  label?: string
}

export interface Badge {
  id: string
  key: string
  category: BadgeCategory
  tier: number
  name: string
  description: string
  icon: string
  criteria: BadgeCriteria
  createdAt?: string
  updatedAt?: string
}

export interface UserBadge {
  id: string
  userId: string
  badgeId: string
  progress: number
  unlocked: boolean
  unlockedAt?: string
  metadata?: {
    currentValue: number
    targetValue: number
    [key: string]: unknown
  }
  badge: Badge
}

export interface BadgeWithProgress extends Badge {
  userBadge?: UserBadge
  progress: number
  unlocked: boolean
  unlockedAt?: string
}

// ── Utility Types ────────────────────────────────────────────

export interface PlotPoint {
  date: string
  equity: number
  balance: number
}

// ── Alert ──────────────────────────────────────────────────────

export interface Alert {
  id: string
  userId: string
  symbol: string
  condition: 'above' | 'below'
  price: number
  message?: string
  status: 'active' | 'triggered' | 'deleted'
  triggeredAt?: string
  createdAt: string
  updatedAt: string
}

// ── Notification ───────────────────────────────────────────────

export interface Notification {
  id: string
  userId: string
  type: 'alert_triggered' | 'payout_processed' | 'violation' | 'account_update' | 'system'
  title: string
  message?: string
  data?: unknown
  link?: string
  read: boolean
  createdAt: string
}
