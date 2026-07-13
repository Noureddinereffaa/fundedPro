import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import OrderPanel from '../components/trade/OrderPanel.tsx'

vi.mock('../utils/useRealtime', () => ({
  useLivePrice: vi.fn(() => ({
    symbol: 'BTCUSDT',
    price: 67500.12,
    change: 0.15,
    time: Date.now(),
  })),
}))

import { useLivePrice } from '../utils/useRealtime'

const defaultProps = {
  symbol: 'BTCUSDT',
  side: 'buy' as const,
  orderType: 'market' as const,
  volume: '0.10',
  price: '',
  sl: '',
  tp: '',
  orderError: '',
  submitting: false,
  isStale: false,
  onSideChange: vi.fn(),
  onOrderTypeChange: vi.fn(),
  onVolumeChange: vi.fn(),
  onPriceChange: vi.fn(),
  onSlChange: vi.fn(),
  onTpChange: vi.fn(),
  onCopyPrice: vi.fn(),
  onCopySl: vi.fn(),
  onCopyTp: vi.fn(),
  onSubmit: vi.fn(),
}

beforeEach(() => {
  vi.mocked(useLivePrice).mockReturnValue({
    symbol: 'BTCUSDT',
    price: 67500.12,
    change: 0.15,
    time: Date.now(),
  })
})

describe('OrderPanel', () => {
  it('renders symbol and price', () => {
    render(<OrderPanel {...defaultProps} />)
    expect(screen.getByText('BTCUSDT')).toBeInTheDocument()
    expect(screen.getByText('67500.12')).toBeInTheDocument()
  })

  it('renders BUY and SELL buttons', () => {
    render(<OrderPanel {...defaultProps} />)
    expect(screen.getByText('BUY')).toBeInTheDocument()
    expect(screen.getByText('SELL')).toBeInTheDocument()
  })

  it('renders order type buttons', () => {
    render(<OrderPanel {...defaultProps} />)
    expect(screen.getByText('Market')).toBeInTheDocument()
    expect(screen.getByText('Limit')).toBeInTheDocument()
    expect(screen.getByText('Stop')).toBeInTheDocument()
  })

  it('renders volume presets', () => {
    render(<OrderPanel {...defaultProps} />)
    for (const v of ['0.01', '0.05', '0.10', '0.50', '1.00']) {
      expect(screen.getByText(v)).toBeInTheDocument()
    }
  })

  it('shows error message when orderError is set', () => {
    render(<OrderPanel {...defaultProps} orderError="Insufficient margin" />)
    expect(screen.getByText('Insufficient margin')).toBeInTheDocument()
  })

  it('calls onSubmit when submit button clicked then confirmed', async () => {
    const onSubmit = vi.fn()
    render(<OrderPanel {...defaultProps} onSubmit={onSubmit} />)
    await userEvent.click(screen.getByRole('button', { name: /buy 0.10 btcusdt/i }))
    await userEvent.click(screen.getByRole('button', { name: /confirm/i }))
    expect(onSubmit).toHaveBeenCalledOnce()
  })

  it('calls onSideChange when BUY clicked', async () => {
    const onSideChange = vi.fn()
    render(<OrderPanel {...defaultProps} onSideChange={onSideChange} />)
    await userEvent.click(screen.getByText('SELL'))
    expect(onSideChange).toHaveBeenCalledWith('sell')
  })

  it('calls onOrderTypeChange when Limit clicked', async () => {
    const onOrderTypeChange = vi.fn()
    render(<OrderPanel {...defaultProps} onOrderTypeChange={onOrderTypeChange} />)
    await userEvent.click(screen.getByText('Limit'))
    expect(onOrderTypeChange).toHaveBeenCalledWith('limit')
  })

  it('shows price input when order type is limit', () => {
    render(<OrderPanel {...defaultProps} orderType="limit" />)
    expect(screen.getByPlaceholderText('Enter price')).toBeInTheDocument()
  })

  it('shows risk calculator when riskAmount > 0', () => {
    const sl = '1.12335'
    render(<OrderPanel {...defaultProps} sl={sl} />)
    expect(screen.getByText(/Risk:/)).toBeInTheDocument()
  })

  it('shows offline state when no live price', () => {
    vi.mocked(useLivePrice).mockReturnValue(undefined)
    render(<OrderPanel {...defaultProps} />)
    expect(screen.getByText('Offline')).toBeInTheDocument()
  })

  it('shows stale indicator when isStale is true', () => {
    render(<OrderPanel {...defaultProps} isStale={true} />)
    expect(screen.getByText(/Stale/)).toBeInTheDocument()
  })

  it('disables submit when market order and no live price', () => {
    vi.mocked(useLivePrice).mockReturnValue(undefined)
    render(<OrderPanel {...defaultProps} />)
    expect(screen.getByRole('button', { name: /buy 0.10 btcusdt/i })).toBeDisabled()
  })

  it('volume + button calls onVolumeChange', async () => {
    const onVolumeChange = vi.fn()
    render(<OrderPanel {...defaultProps} onVolumeChange={onVolumeChange} />)
    const plusBtn = screen.getByText('+')
    await userEvent.click(plusBtn)
    expect(onVolumeChange).toHaveBeenCalledWith('0.11')
  })

  it('volume - button calls onVolumeChange', async () => {
    const onVolumeChange = vi.fn()
    render(<OrderPanel {...defaultProps} onVolumeChange={onVolumeChange} />)
    const minusBtn = screen.getByText('−')
    await userEvent.click(minusBtn)
    expect(onVolumeChange).toHaveBeenCalledWith('0.09')
  })
})
