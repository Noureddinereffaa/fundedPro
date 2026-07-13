import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import PositionsTable from '../components/trade/PositionsTable.tsx'

vi.mock('../components/trade/LivePrice', () => ({
  default: ({ symbol }: { symbol: string }) => <span>{symbol}-price</span>,
}))

vi.mock('../components/trade/LivePnl', () => ({
  default: ({ position }: { position: any }) => <span>${Number(position.profit || 0).toFixed(2)}</span>,
}))

vi.mock('react-virtuoso', () => ({
  Virtuoso: function MockVirtuoso({ totalCount, itemContent }: { totalCount: number; itemContent: (i: number) => any }) {
    const React = require('react')
    return React.createElement(React.Fragment, null,
      ...Array.from({ length: totalCount }, (_, i) => React.createElement('div', { key: i }, itemContent(i)))
    )
  },
}))

const mockPositions = [
  {
    id: '1',
    accountId: 'a1',
    symbol: 'EURUSD',
    side: 'buy' as const,
    volume: 0.1,
    openPrice: 1.105,
    stopLoss: 1.1,
    takeProfit: 1.11,
    swap: -0.5,
    profit: 25.5,
    currentPrice: 1.1075,
    createdAt: new Date().toISOString(),
  },
  {
    id: '2',
    accountId: 'a1',
    symbol: 'GBPUSD',
    side: 'sell' as const,
    volume: 0.2,
    openPrice: 1.265,
    stopLoss: null,
    takeProfit: 1.26,
    swap: 0.3,
    profit: -12.0,
    currentPrice: 1.268,
    createdAt: new Date().toISOString(),
  },
]

describe('PositionsTable', () => {
  it('shows empty message when no positions', () => {
    render(
      <PositionsTable
        positions={[]}
        onReverse={vi.fn()}
        onModify={vi.fn()}
        onClose={vi.fn()}
        onCloseAll={vi.fn()}
      />,
    )
    expect(screen.getByText('No open positions')).toBeInTheDocument()
  })

  it('renders positions', () => {
    render(
      <PositionsTable
        positions={mockPositions}
        onReverse={vi.fn()}
        onModify={vi.fn()}
        onClose={vi.fn()}
        onCloseAll={vi.fn()}
      />,
    )
    expect(screen.getByText('EURUSD')).toBeInTheDocument()
    expect(screen.getByText('GBPUSD')).toBeInTheDocument()
    expect(screen.getByText('BUY')).toBeInTheDocument()
    expect(screen.getByText('SELL')).toBeInTheDocument()
  })

  it('renders action buttons for each position', () => {
    render(
      <PositionsTable
        positions={mockPositions}
        onReverse={vi.fn()}
        onModify={vi.fn()}
        onClose={vi.fn()}
        onCloseAll={vi.fn()}
      />,
    )
    const modifyBtns = screen.getAllByText('Modify')
    const closeBtns = screen.getAllByText('Close')
    expect(modifyBtns).toHaveLength(2)
    expect(closeBtns).toHaveLength(2)
  })

  it('calls onReverse when reverse confirmed', () => {
    const onReverse = vi.fn()
    render(
      <PositionsTable
        positions={[mockPositions[0]]}
        onReverse={onReverse}
        onModify={vi.fn()}
        onClose={vi.fn()}
        onCloseAll={vi.fn()}
      />,
    )
    const reverseBtn = screen.getByTitle('Reverse Position')
    fireEvent.click(reverseBtn)
    const confirmBtn = screen.getByText('Reverse')
    fireEvent.click(confirmBtn)
    expect(onReverse).toHaveBeenCalledWith(mockPositions[0])
  })

  it('calls onModify when Modify clicked', () => {
    const onModify = vi.fn()
    render(
      <PositionsTable
        positions={[mockPositions[0]]}
        onReverse={vi.fn()}
        onModify={onModify}
        onClose={vi.fn()}
        onCloseAll={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByText('Modify'))
    expect(onModify).toHaveBeenCalledWith(mockPositions[0])
  })

  it('calls onClose when Close clicked', () => {
    const onClose = vi.fn()
    render(
      <PositionsTable
        positions={[mockPositions[0]]}
        onReverse={vi.fn()}
        onModify={vi.fn()}
        onClose={onClose}
        onCloseAll={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByText('Close'))
    expect(onClose).toHaveBeenCalledWith(mockPositions[0])
  })

  it('calls onCloseAll when Close All clicked', () => {
    const onCloseAll = vi.fn()
    render(
      <PositionsTable
        positions={mockPositions}
        onReverse={vi.fn()}
        onModify={vi.fn()}
        onClose={vi.fn()}
        onCloseAll={onCloseAll}
      />,
    )
    fireEvent.click(screen.getByText('Close All'))
    expect(onCloseAll).toHaveBeenCalled()
  })

  it('renders stop loss and take profit values', () => {
    render(
      <PositionsTable
        positions={[mockPositions[0]]}
        onReverse={vi.fn()}
        onModify={vi.fn()}
        onClose={vi.fn()}
        onCloseAll={vi.fn()}
      />,
    )
    expect(screen.getByText('1.1')).toBeInTheDocument()
    expect(screen.getByText('1.11')).toBeInTheDocument()
  })

  it('shows dash for missing stop loss', () => {
    render(
      <PositionsTable
        positions={[mockPositions[1]]}
        onReverse={vi.fn()}
        onModify={vi.fn()}
        onClose={vi.fn()}
        onCloseAll={vi.fn()}
      />,
    )
    expect(screen.getByText('—')).toBeInTheDocument()
  })
})
