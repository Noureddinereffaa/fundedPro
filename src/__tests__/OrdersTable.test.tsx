import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import OrdersTable from '../components/trade/OrdersTable.tsx'

vi.mock('react-virtuoso', () => ({
  Virtuoso: function MockVirtuoso({ totalCount, itemContent }: { totalCount: number; itemContent: (i: number) => any }) {
    const React = require('react')
    return React.createElement(React.Fragment, null,
      ...Array.from({ length: totalCount }, (_, i) => React.createElement('div', { key: i }, itemContent(i)))
    )
  },
}))

const mockOrders = [
  {
    id: 'o1',
    accountId: 'a1',
    symbol: 'EURUSD',
    type: 'limit' as const,
    side: 'buy' as const,
    volume: 0.1,
    price: 1.1,
    stopLoss: null,
    takeProfit: 1.11,
    status: 'pending' as const,
    createdAt: '2025-01-15T10:00:00Z',
  },
  {
    id: 'o2',
    accountId: 'a1',
    symbol: 'GBPUSD',
    type: 'stop' as const,
    side: 'sell' as const,
    volume: 0.2,
    price: 1.26,
    stopLoss: 1.265,
    takeProfit: 1.255,
    status: 'pending' as const,
    createdAt: '2025-01-15T11:00:00Z',
  },
]

describe('OrdersTable', () => {
  it('shows empty message when no orders', () => {
    render(<OrdersTable orders={[]} accountId="a1" onCancel={vi.fn()} />)
    expect(screen.getByText('No pending orders')).toBeInTheDocument()
  })

  it('renders orders', () => {
    render(<OrdersTable orders={mockOrders} accountId="a1" onCancel={vi.fn()} />)
    expect(screen.getByText('EURUSD')).toBeInTheDocument()
    expect(screen.getByText('GBPUSD')).toBeInTheDocument()
    expect(screen.getByText('BUY')).toBeInTheDocument()
    expect(screen.getByText('SELL')).toBeInTheDocument()
  })

  it('renders order types', () => {
    render(<OrdersTable orders={mockOrders} accountId="a1" onCancel={vi.fn()} />)
    expect(screen.getByText('LIMIT')).toBeInTheDocument()
    expect(screen.getByText('STOP')).toBeInTheDocument()
  })

  it('calls onCancel when Cancel button clicked', async () => {
    const onCancel = vi.fn().mockResolvedValue(undefined)
    render(<OrdersTable orders={[mockOrders[0]]} accountId="a1" onCancel={onCancel} />)
    fireEvent.click(screen.getByText(/Cancel/))
    expect(onCancel).toHaveBeenCalledWith('o1')
  })

  it('renders cancel buttons for each order', () => {
    render(<OrdersTable orders={mockOrders} accountId="a1" onCancel={vi.fn()} />)
    expect(screen.getAllByText(/Cancel/)).toHaveLength(2)
  })

  it('renders target price', () => {
    render(<OrdersTable orders={[mockOrders[0]]} accountId="a1" onCancel={vi.fn()} />)
    expect(screen.getByText('1.1')).toBeInTheDocument()
  })

  it('shows dash for missing SL/TP', () => {
    render(<OrdersTable orders={[mockOrders[0]]} accountId="a1" onCancel={vi.fn()} />)
    expect(screen.getByText('—')).toBeInTheDocument()
  })
})
