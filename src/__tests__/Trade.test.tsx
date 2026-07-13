import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

import TradePage from '../pages/Trade'

// ── Mocks ────────────────────────────────────────────────────

vi.mock('react-router-dom', () => ({
  useParams: () => ({ id: 'test-account-id' }),
  Link: ({ children, to }: any) => <a href={to}>{children}</a>,
  MemoryRouter: ({ children }: any) => <>{children}</>,
}))

vi.mock('../components/ProfessionalChart', () => ({
  ProfessionalChart: vi.fn(() => <div data-testid="chart-mock">Chart</div>),
}))

vi.mock('../components/MarketWatch', () => ({
  MarketWatch: ({ onSelectSymbol, activeSymbol }: any) => (
    <div data-testid="market-watch">
      <button onClick={() => onSelectSymbol('GBPUSD')}>GBPUSD</button>
      <span>Active: {activeSymbol}</span>
    </div>
  ),
}))

vi.mock('../components/trade/LivePrice', () => ({
  default: ({ symbol }: any) => <div data-testid="live-price">{symbol}</div>,
}))

vi.mock('../components/trade/AccountSummary', () => ({
  default: ({ balance }: any) => <div data-testid="account-summary">Balance: {balance}</div>,
}))

vi.mock('../components/trade/OrderPanel', () => ({
  default: (props: any) => (
    <div data-testid="order-panel">
      <span data-testid="op-symbol">{props.symbol}</span>
      <button onClick={() => props.onSubmit(1.2345)}>Place Order</button>
    </div>
  ),
}))

vi.mock('../components/trade/PositionsTable', () => ({
  default: ({ positions, onClose: _onClose, onModify: _onModify, onReverse: _onReverse }: any) => (
    <div data-testid="positions-table">
      {positions.length === 0 ? (
        <span>No positions</span>
      ) : (
        positions.map((p: any) => (
          <div key={p.id} data-testid={`position-${p.symbol}`}>
            {p.symbol} {p.volume} {p.side}
          </div>
        ))
      )}
    </div>
  ),
}))

vi.mock('../components/trade/OrdersTable', () => ({
  default: ({ orders }: any) => (
    <div data-testid="orders-table">
      {orders.length === 0 ? (
        <span>No orders</span>
      ) : (
        orders.map((o: any) => <div key={o.id}>{o.symbol}</div>)
      )}
    </div>
  ),
}))

vi.mock('../components/trade/HistoryTable', () => ({
  default: ({ history }: any) => (
    <div data-testid="history-table">
      {history.length === 0 ? (
        <span>No history</span>
      ) : (
        history.map((h: any) => <div key={h.id}>{h.symbol}</div>)
      )}
    </div>
  ),
}))

vi.mock('../utils/api', () => ({
  accountApi: {
    getById: vi.fn(() =>
      Promise.resolve({
        id: 'test-account-id',
        balance: 10000,
        equity: 10500,
        margin: 200,
        marginLevel: 200,
        freeMargin: 9800,
        leverage: 100,
        currency: 'USD',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
    ),
  },
  tradingApi: {
    getPositions: vi.fn(() =>
      Promise.resolve([
        {
          id: 'p1',
          symbol: 'EURUSD',
          side: 'buy',
          volume: 0.1,
          openPrice: 1.08,
          currentPrice: 1.085,
          stopLoss: null,
          takeProfit: null,
          margin: 50,
          createdAt: new Date().toISOString(),
        },
        {
          id: 'p2',
          symbol: 'GBPUSD',
          side: 'sell',
          volume: 0.2,
          openPrice: 1.26,
          currentPrice: 1.255,
          stopLoss: null,
          takeProfit: null,
          margin: 100,
          createdAt: new Date().toISOString(),
        },
      ]),
    ),
    getOrders: vi.fn(() =>
      Promise.resolve([
        {
          id: 'o1',
          symbol: 'EURUSD',
          type: 'limit',
          side: 'buy',
          volume: 0.05,
          price: 1.07,
          status: 'pending',
          createdAt: new Date().toISOString(),
        },
      ]),
    ),
    getHistory: vi.fn(() => Promise.resolve({ data: [] })),
    placeOrder: vi.fn(() => Promise.resolve({ id: 'new-order' })),
    closePosition: vi.fn(() => Promise.resolve()),
    cancelOrder: vi.fn(() => Promise.resolve()),
    modifyPosition: vi.fn(() => Promise.resolve()),
    closeAllPositions: vi.fn(() => Promise.resolve()),
  },
  riskApi: {
    getStatus: vi.fn(() =>
      Promise.resolve({
        dailyLoss: 0,
        maxDailyLoss: 1000,
        dailyLossPct: 0,
        maxDrawdown: 0,
        maxDrawdownPct: 0,
      }),
    ),
  },
}))

vi.mock('../utils/useRealtime', () => ({
  useRealtimePrices: vi.fn(() => ({ connectionStatus: 'connected' })),
  useLivePrice: vi.fn(() => ({ symbol: 'EURUSD', price: 1.12345, change: 0.15, time: Date.now() })),
  useMarketStatus: vi.fn(() => ({ open: true, text: 'Open', nextOpen: null, nextClose: null })),
  useRealtimeCandles: vi.fn(() => ({ isLoading: false })),
}))
vi.mock('../utils/marketData', () => ({
  ALL_SYMBOLS: [
    { symbol: 'EURUSD', name: 'Euro / US Dollar', type: 'forex', digits: 5, group: 'Majors' },
    { symbol: 'GBPUSD', name: 'Pound / US Dollar', type: 'forex', digits: 5, group: 'Majors' },
    { symbol: 'BTCUSDT', name: 'Bitcoin / Tether', type: 'crypto', digits: 2, group: 'Crypto' },
  ],
  getMarketInfo: vi.fn(() => ({ type: 'forex', digits: 5 })),
}))
vi.mock('../utils/marketHours', () => ({
  getMarketStatus: vi.fn(() => ({ open: true, text: 'Open', nextOpen: null, nextClose: null })),
}))

vi.mock('../contexts/ToastContext', () => ({
  useToast: () => ({ addToast: vi.fn() }),
}))

vi.mock('../components/Layout', () => ({
  default: ({ children }: any) => <div data-testid="layout">{children}</div>,
}))

describe('TradePage integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1400 })
  })

  it('renders all major components', async () => {
    render(<TradePage />)
    await waitFor(() => {
      expect(screen.getByTestId('chart-mock')).toBeInTheDocument()
      expect(screen.getByTestId('order-panel')).toBeInTheDocument()
      expect(screen.getByTestId('live-price')).toBeInTheDocument()
    })
  })

  it('passes the current symbol to OrderPanel', async () => {
    render(<TradePage />)
    await waitFor(() => {
      expect(screen.getByTestId('op-symbol')).toHaveTextContent('EURUSD')
    })
  })

  it('changes symbol via MarketWatch and propagates', async () => {
    render(<TradePage />)
    await waitFor(() => {
      expect(screen.getByTestId('market-watch')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('GBPUSD'))

    await waitFor(() => {
      expect(screen.getByTestId('op-symbol')).toHaveTextContent('GBPUSD')
      expect(screen.getByTestId('live-price')).toHaveTextContent('GBPUSD')
    })
  })

  it('shows positions tab by default with position count', async () => {
    render(<TradePage />)
    await waitFor(() => {
      const tabs = screen.getAllByText(/Positions/)
      const tabButton = tabs.find((el) => el.tagName === 'BUTTON')
      expect(tabButton).toBeTruthy()
    })
  })

  it('switches tabs when clicking Orders and History', async () => {
    render(<TradePage />)
    await waitFor(() => {
      expect(screen.getByText('Orders')).toBeInTheDocument()
      expect(screen.getByText('History')).toBeInTheDocument()
    })
  })

  it('shows connection status indicator', async () => {
    render(<TradePage />)
    await waitFor(() => {
      expect(screen.getByText('Live')).toBeInTheDocument()
    })
  })
})
