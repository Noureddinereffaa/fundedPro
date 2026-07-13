import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import type { Position, Order, TradeHistory, Account, RiskStatus } from '../../../shared/types'
import { riskApi, tradingApi, accountApi } from '../../utils/api'
import { useRealtimePrices, useLivePrice } from '../../utils/useRealtime'
import { useToast } from '../../contexts/ToastContext'

export function useTradePage(id: string | undefined) {
  const [symbol, setSymbol] = useState('EURUSD')
  const [chartInterval, setChartInterval] = useState('3600')
  const [account, setAccount] = useState<Account | null>(null)
  const [, setRisk] = useState<RiskStatus | null>(null)
  const [positions, setPositions] = useState<Position[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [history, setHistory] = useState<TradeHistory[]>([])
  const [historyPage, setHistoryPage] = useState(1)
  const [historyTotalPages, setHistoryTotalPages] = useState(1)
  const historyPageRef = useRef(historyPage)
  historyPageRef.current = historyPage
  const symbolsToTrack = useMemo(
    () => Array.from(new Set([symbol, ...positions.map((p) => p.symbol)])),
    [symbol, positions],
  )
  const { connectionStatus } = useRealtimePrices(symbolsToTrack)
  const wsConnected = connectionStatus === 'connected'
  const { addToast } = useToast()
  const [side, setSide] = useState<'buy' | 'sell'>('buy')
  const [orderType, setOrderType] = useState<'market' | 'limit' | 'stop'>('market')
  const [volume, setVolume] = useState('0.01')
  const [price, setPrice] = useState('')
  const [sl, setSl] = useState('')
  const [tp, setTp] = useState('')
  const [orderError, setOrderError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState<'positions' | 'orders' | 'history'>('positions')

  useEffect(() => {
    if (!id) return
    accountApi.getById(id).then(setAccount).catch(() => {})
    riskApi.getStatus(id).then(setRisk).catch(() => {})
    tradingApi.getPositions(id).then(setPositions).catch(() => {})
    tradingApi.getOrders(id).then(setOrders).catch(() => {})
    tradingApi.getHistory(id, 1, 20).then((res) => {
      setHistory((res.data as TradeHistory[]) || [])
      if (res.pagination) setHistoryTotalPages(res.pagination.pages || 1)
    }).catch(() => {})

    const timerId = window.setInterval(() => {
      if (!id) return
      accountApi.getById(id).then(setAccount).catch(() => {})
      tradingApi.getPositions(id).then(setPositions).catch(() => {})
      tradingApi.getOrders(id).then(setOrders).catch(() => {})
      riskApi.getStatus(id).then(setRisk).catch(() => {})
      tradingApi.getHistory(id, historyPageRef.current, 20).then((res) => {
        if (res.data) setHistory(res.data)
        if (res.pagination) setHistoryTotalPages(res.pagination.pages || 1)
      }).catch(() => {})
    }, wsConnected ? 15000 : 5000)
    return () => window.clearInterval(timerId)
  }, [id, addToast, wsConnected])

  // Fetch history when page changes
  useEffect(() => {
    if (!id) return
    tradingApi.getHistory(id, historyPage, 20).then((res) => {
      setHistory((res.data as TradeHistory[]) || [])
      if (res.pagination) setHistoryTotalPages(res.pagination.pages || 1)
    }).catch(() => {})
  }, [id, historyPage])

  useEffect(() => {
    setPrice('')
    setSl('')
    setTp('')
  }, [symbol])

  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showFullscreenPanel, setShowFullscreenPanel] = useState(false)
  const [showRightPanel, setShowRightPanel] = useState(window.innerWidth > 1024)
  const [showMarketWatch, setShowMarketWatch] = useState(true)

  const [modifyingPosition, setModifyingPosition] = useState<Position | null>(null)
  const [modifySl, setModifySl] = useState('')
  const [modifyTp, setModifyTp] = useState('')
  const [modifySubmitting, setModifySubmitting] = useState(false)

  const [modifyingOrder, setModifyingOrder] = useState<Order | null>(null)
  const [modifyOrderPrice, setModifyOrderPrice] = useState('')
  const [modifyOrderSl, setModifyOrderSl] = useState('')
  const [modifyOrderTp, setModifyOrderTp] = useState('')
  const [modifyOrderSubmitting, setModifyOrderSubmitting] = useState(false)

  const [closingPosition, setClosingPosition] = useState<Position | null>(null)
  const [closeVolume, setCloseVolume] = useState('')
  const [closeSubmitting, setCloseSubmitting] = useState(false)

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {})
    } else {
      if (document.exitFullscreen) document.exitFullscreen()
    }
  }, [])

  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFull = !!document.fullscreenElement
      setIsFullscreen(isFull)
      if (!isFull) setShowFullscreenPanel(false)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth <= 1024) setShowRightPanel(false)
      else setShowRightPanel(true)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const handlePriceSelect = useCallback(
    (p: number) => {
      const priceStr = p.toString()
      navigator.clipboard.writeText(priceStr).then(() => {
        addToast(`${priceStr} — copied`, 'success')
      }).catch(() => {
        addToast(`${priceStr} — select to fill`, 'success')
      })
      if (orderType !== 'market' && !price) {
        setPrice(priceStr)
      } else if (!sl) {
        setSl(priceStr)
      } else if (!tp) {
        setTp(priceStr)
      } else if (orderType !== 'market') {
        setPrice(priceStr)
      }
    },
    [orderType, price, sl, tp, addToast],
  )

  const handlePlaceOrder = useCallback(
    async (currentDisplayPrice: number | undefined) => {
      if (!id) return
      if (orderType === 'market' && currentDisplayPrice == null) {
        addToast('No live price available. Cannot place market order.', 'error')
        return
      }
      setOrderError('')
      setSubmitting(true)
      try {
        const orderPrice = orderType === 'market' ? currentDisplayPrice! : Number(price) || currentDisplayPrice || 0
        await tradingApi.placeOrder({
          accountId: id,
          symbol,
          type: orderType,
          side,
          volume: Number(volume),
          price: orderPrice,
          stopLoss: sl ? Number(sl) : undefined,
          takeProfit: tp ? Number(tp) : undefined,
        })
        addToast(`${side.toUpperCase()} ${volume} ${symbol} order placed`, 'success')
        tradingApi.getPositions(id).then(setPositions).catch(() => {})
        tradingApi.getOrders(id).then(setOrders).catch(() => {})
        riskApi.getStatus(id).then(setRisk).catch(() => {})
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to place order'
        setOrderError(msg)
        addToast(msg, 'error')
      } finally {
        setSubmitting(false)
      }
    },
    [id, orderType, price, symbol, side, volume, sl, tp, addToast],
  )

  const submitPartialClose = useCallback(async () => {
    if (!id || !closingPosition) return
    setCloseSubmitting(true)
    try {
      await tradingApi.closePosition(closingPosition.id, id, Number(closeVolume), 0)
      addToast(
        Number(closeVolume) < Number(closingPosition.volume) ? 'Partial close successful' : 'Position closed',
        'success',
      )
      setClosingPosition(null)
      tradingApi.getPositions(id).then(setPositions).catch(() => {})
      riskApi.getStatus(id).then(setRisk).catch(() => {})
    } catch (err: unknown) {
      addToast(err instanceof Error ? err.message : 'Failed to close', 'error')
    } finally {
      setCloseSubmitting(false)
    }
  }, [id, closingPosition, closeVolume, addToast])

  const submitModifyPosition = useCallback(async () => {
    if (!id || !modifyingPosition) return
    setModifySubmitting(true)
    try {
      const data: { accountId: string; stopLoss?: number; takeProfit?: number } = { accountId: id }
      if (modifySl) data.stopLoss = Number(modifySl)
      if (modifyTp) data.takeProfit = Number(modifyTp)
      await tradingApi.modifyPosition(modifyingPosition.id, data)
      addToast('Position modified successfully', 'success')
      setModifyingPosition(null)
      tradingApi.getPositions(id).then(setPositions).catch(() => {})
    } catch (err: unknown) {
      addToast(err instanceof Error ? err.message : 'Failed to modify position', 'error')
    } finally {
      setModifySubmitting(false)
    }
  }, [id, modifyingPosition, modifySl, modifyTp, addToast])

  const submitModifyOrder = useCallback(async () => {
    if (!id || !modifyingOrder) return
    setModifyOrderSubmitting(true)
    try {
      const data: { accountId: string; price?: number; stopLoss?: number; takeProfit?: number } = { accountId: id }
      if (modifyOrderPrice) data.price = Number(modifyOrderPrice)
      if (modifyOrderSl) data.stopLoss = Number(modifyOrderSl)
      if (modifyOrderTp) data.takeProfit = Number(modifyOrderTp)
      await tradingApi.modifyOrder(modifyingOrder.id, data)
      addToast(`Order ${modifyingOrder.type.toUpperCase()} modified`, 'success')
      setModifyingOrder(null)
      tradingApi.getOrders(id).then(setOrders).catch(() => {})
    } catch (err: unknown) {
      addToast(err instanceof Error ? err.message : 'Failed to modify order', 'error')
    } finally {
      setModifyOrderSubmitting(false)
    }
  }, [id, modifyingOrder, modifyOrderPrice, modifyOrderSl, modifyOrderTp, addToast])

  const handleModifyOrder = useCallback((o: Order) => {
    setModifyingOrder(o)
    setModifyOrderPrice(o.price != null ? String(o.price) : '')
    setModifyOrderSl(o.stopLoss != null ? String(o.stopLoss) : '')
    setModifyOrderTp(o.takeProfit != null ? String(o.takeProfit) : '')
  }, [])

  const handleChartModifyPosition = useCallback(
    async (positionId: string, data: { stopLoss?: number; takeProfit?: number }) => {
      if (!id) return
      try {
        await tradingApi.modifyPosition(positionId, { accountId: id, ...data })
        addToast('Position modified from chart', 'success')
        tradingApi.getPositions(id).then(setPositions).catch(() => {})
      } catch (err: unknown) {
        addToast(err instanceof Error ? err.message : 'Failed to modify position', 'error')
      }
    },
    [id, addToast],
  )

  const handleCloseAll = useCallback(async () => {
    if (!id) return
    if (!window.confirm('Are you sure you want to close ALL open positions?')) return
    try {
      await tradingApi.closeAllPositions(id)
      addToast('All positions closed', 'success')
      tradingApi.getPositions(id).then(setPositions).catch(() => {})
      riskApi.getStatus(id).then(setRisk).catch(() => {})
    } catch (err: unknown) {
      addToast(err instanceof Error ? err.message : 'Failed to close all positions', 'error')
    }
  }, [id, addToast])

  const handleReversePosition = useCallback(
    async (p: Position) => {
      if (!id) return
      try {
        await tradingApi.closePosition(p.id, id, Number(p.volume), 0)
        const reverseSide = p.side === 'buy' ? 'sell' : 'buy'
        await tradingApi.placeOrder({
          accountId: id,
          symbol: p.symbol,
          type: 'market',
          side: reverseSide,
          volume: Number(p.volume),
          price: 0,
        })
        addToast(`Position reversed: ${reverseSide.toUpperCase()} ${p.volume} ${p.symbol}`, 'success')
        tradingApi.getPositions(id).then(setPositions).catch(() => {})
        riskApi.getStatus(id).then(setRisk).catch(() => {})
      } catch (err: unknown) {
        addToast(err instanceof Error ? err.message : 'Failed to reverse position', 'error')
      }
    },
    [id, addToast],
  )

  const marketOpen = true
  const liveTick = useLivePrice(symbol)
  const [isStale, setIsStale] = useState(false)
  useEffect(() => {
    if (connectionStatus !== 'connected') {
      setIsStale(false)
      return
    }
    const timeout = window.setTimeout(() => setIsStale(true), 5000)
    return () => window.clearTimeout(timeout)
  }, [connectionStatus, liveTick?.time])

  const currentSymbolPositions = useMemo(
    () => positions.filter((p) => p.symbol === symbol),
    [positions, symbol],
  )

  const liveMarginUsed = useMemo(
    () => positions.reduce((sum: number, p) => sum + Number(p.margin), 0),
    [positions],
  )

  const handleCancelOrder = useCallback(
    async (orderId: string) => {
      if (!id) return
      try {
        await tradingApi.cancelOrder(orderId, id)
        addToast('Order cancelled', 'success')
        tradingApi.getOrders(id).then(setOrders).catch(() => {})
      } catch (err: unknown) {
        addToast(err instanceof Error ? err.message : 'Failed to cancel', 'error')
      }
    },
    [id, addToast],
  )

  const handleCopyPrice = useCallback((p: string) => setPrice(p), [])
  const handleCopySl = useCallback((p: string) => setSl(p), [])
  const handleCopyTp = useCallback((p: string) => setTp(p), [])

  const handleModify = useCallback((p: Position) => {
    setModifyingPosition(p)
    setModifySl(p.stopLoss != null ? String(p.stopLoss) : '')
    setModifyTp(p.takeProfit != null ? String(p.takeProfit) : '')
  }, [])
  const handleClose = useCallback((p: Position) => {
    setClosingPosition(p)
    setCloseVolume(p.volume.toString())
  }, [])
  const handleVolumeDecrement = useCallback(() => {
    setCloseVolume((v) => Math.max(0.01, Number(v) - 0.01).toFixed(2))
  }, [])
  const handleVolumeIncrement = useCallback(() => {
    setCloseVolume((v) => Math.min(Number(closingPosition?.volume || 0), Number(v) + 0.01).toFixed(2))
  }, [closingPosition])

  return {
    symbol, setSymbol, chartInterval, setChartInterval,
    account, positions, orders, history,
    symbolsToTrack, connectionStatus,
    side, setSide, orderType, setOrderType, volume, setVolume,
    price, setPrice, sl, setSl, tp, setTp,
    orderError, submitting, activeTab, setActiveTab,
    isFullscreen, showFullscreenPanel, setShowFullscreenPanel,
    showRightPanel, setShowRightPanel, showMarketWatch, setShowMarketWatch,
    modifyingPosition, setModifyingPosition,
    modifySl, setModifySl, modifyTp, setModifyTp,
    modifySubmitting,
    modifyingOrder, setModifyingOrder,
    modifyOrderPrice, setModifyOrderPrice, modifyOrderSl, setModifyOrderSl,
    modifyOrderTp, setModifyOrderTp, modifyOrderSubmitting,
    closingPosition, setClosingPosition,
    closeVolume, setCloseVolume, closeSubmitting,
    marketOpen, liveTick, isStale, currentSymbolPositions, liveMarginUsed,
    historyPage, historyTotalPages, setHistoryPage,
    handlePriceSelect, handlePlaceOrder, submitPartialClose,
    submitModifyPosition, handleCloseAll, handleReversePosition,
    handleCancelOrder, handleCopyPrice, handleCopySl, handleCopyTp,
    handleModify, handleClose, handleVolumeDecrement, handleVolumeIncrement,
    handleChartModifyPosition, toggleFullscreen,
    handleModifyOrder, submitModifyOrder,
  }
}
