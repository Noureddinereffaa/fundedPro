import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TradeTopBar } from '../components/trade/TradeTopBar'

vi.mock('react-router-dom', () => ({
  Link: ({ children, to }: any) => <a href={to}>{children}</a>,
}))

vi.mock('../utils/marketData', () => ({
  ALL_SYMBOLS: [
    { symbol: 'EURUSD', name: 'Euro / US Dollar', type: 'forex', digits: 5, group: 'Majors' },
  ],
}))

vi.mock('../components/trade/LivePrice', () => ({
  default: () => <div data-testid="live-price">1.12345</div>,
}))

function renderTopBar(props: Partial<Parameters<typeof TradeTopBar>[0]> = {}) {
  const defaultProps = {
    id: 'acc1',
    symbol: 'EURUSD',
    chartInterval: '3600',
    onIntervalChange: vi.fn(),
    connectionStatus: 'connected' as const,
    marketOpen: true,
    isStale: false,
    isFullscreen: false,
    showMarketWatch: false,
    showRightPanel: true,
    showFullscreenPanel: false,
    indicators: [] as string[],
    onToggleIndicator: vi.fn(),
    onToggleMarketWatch: vi.fn(),
    onToggleRightPanel: vi.fn(),
    onToggleFullscreen: vi.fn(),
    onToggleFullscreenPanel: vi.fn(),
  }
  return render(<TradeTopBar {...defaultProps} {...props} />)
}

describe('TradeTopBar component rendering', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders all 9 interval buttons', () => {
    renderTopBar()
    const buttons = screen.getAllByRole('button')
    const intervalButtons = buttons.filter((b) => ['1m', '5m', '15m', '30m', '1H', '2H', '4H', '1D', '1W'].includes(b.textContent || ''))
    expect(intervalButtons).toHaveLength(9)
  })

  it('renders interval buttons in correct order', () => {
    renderTopBar()
    const buttons = screen.getAllByRole('button')
    const labels = buttons.map((b) => b.textContent).filter(Boolean)
    const firstIntervalIndex = labels.findIndex((l) => l === '1m')
    expect(labels[firstIntervalIndex]).toBe('1m')
    expect(labels[firstIntervalIndex + 1]).toBe('5m')
    expect(labels[firstIntervalIndex + 2]).toBe('15m')
    expect(labels[firstIntervalIndex + 3]).toBe('30m')
  })
})

describe('TradeTopBar interval switching', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls onIntervalChange when clicking an interval button', () => {
    const onIntervalChange = vi.fn()
    renderTopBar({ onIntervalChange })

    fireEvent.click(screen.getByText('1H'))
    expect(onIntervalChange).toHaveBeenCalledWith('3600')
  })

  it('calls onIntervalChange for each interval', () => {
    const onIntervalChange = vi.fn()
    renderTopBar({ chartInterval: '60', onIntervalChange })

    const intervals = [
      { label: '5m', value: '300' },
      { label: '15m', value: '900' },
      { label: '30m', value: '1800' },
      { label: '2H', value: '7200' },
      { label: '4H', value: '14400' },
      { label: '1D', value: 'D' },
      { label: '1W', value: 'W' },
    ]

    for (const { label, value } of intervals) {
      fireEvent.click(screen.getByText(label))
      expect(onIntervalChange).toHaveBeenCalledWith(value)
    }
  })

  it('highlights the active interval button', () => {
    renderTopBar({ chartInterval: '3600' })
    const btn = screen.getByText('1H')
    expect(btn.className).toContain('active')
  })

  it('does not highlight inactive intervals', () => {
    renderTopBar({ chartInterval: '60' })
    expect(screen.getByText('1H').className).not.toContain('active')
    expect(screen.getByText('1D').className).not.toContain('active')
  })

  it('shows market-watch toggle button in fullscreen', () => {
    renderTopBar({ isFullscreen: true })
    expect(screen.getByTitle('Show Market Watch')).toBeInTheDocument()
  })

  it('hides market-watch toggle button in normal mode', () => {
    renderTopBar({ isFullscreen: false })
    expect(screen.queryByTitle('Show Market Watch')).not.toBeInTheDocument()
  })

  it('shows connection status indicator', () => {
    renderTopBar()
    expect(screen.getByText('Live')).toBeInTheDocument()
  })

  it('shows Connecting... when connecting', () => {
    renderTopBar({ connectionStatus: 'connecting' })
    expect(screen.getByText('Connecting...')).toBeInTheDocument()
  })

  it('shows Offline when disconnected', () => {
    renderTopBar({ connectionStatus: 'disconnected' })
    expect(screen.getByText('Offline')).toBeInTheDocument()
  })

  it('shows Stale warning', () => {
    renderTopBar({ isStale: true })
    expect(screen.getByText('Stale')).toBeInTheDocument()
  })

  it('shows fullscreen button', () => {
    renderTopBar()
    expect(screen.getByTitle('Fullscreen')).toBeInTheDocument()
  })
})
