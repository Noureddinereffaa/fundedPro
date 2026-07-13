import { useParams } from 'react-router-dom'
import { useState, useCallback, lazy, Suspense } from 'react'
import { useTranslation } from 'react-i18next'
import Layout from '../components/Layout.tsx'
import styles from '../styles/trade.module.css'
import { MarketWatch } from '../components/MarketWatch.tsx'
import { useTradePage } from './hooks/useTradePage'
import { TradeTopBar } from '../components/trade/TradeTopBar'
import AccountSummary from '../components/trade/AccountSummary.tsx'
import OrdersTable from '../components/trade/OrdersTable.tsx'
import { buildTradeLayoutClassNames, buildTradePanelClassName } from '../utils/tradeLayout'

const Chart = lazy(() => import('../components/ProfessionalChart.tsx').then(m => ({ default: m.ProfessionalChart })))
const OrderPanelLazy = lazy(() => import('../components/trade/OrderPanel.tsx'))
const PositionsTableLazy = lazy(() => import('../components/trade/PositionsTable.tsx'))
const HistoryTableLazy = lazy(() => import('../components/trade/HistoryTable.tsx'))
const ModifyModalLazy = lazy(() => import('../components/trade/ModifyModal.tsx'))
const ModifyOrderModalLazy = lazy(() => import('../components/trade/ModifyOrderModal.tsx'))
const CloseModalLazy = lazy(() => import('../components/trade/CloseModal.tsx'))

export default function TradePage() {
  const { t } = useTranslation('trading')
  const { id } = useParams<{ id: string }>()
  const {
    symbol, setSymbol, chartInterval, setChartInterval,
    account, positions, orders, history,
    connectionStatus,
    side, setSide, orderType, setOrderType,
    volume, setVolume, price, setPrice, sl, setSl, tp, setTp,
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
    marketOpen, isStale, currentSymbolPositions, liveMarginUsed,
    handlePriceSelect, handlePlaceOrder, submitPartialClose,
    submitModifyPosition, handleCloseAll, handleReversePosition,
    handleCancelOrder, handleCopyPrice, handleCopySl, handleCopyTp,
    handleModify, handleClose, handleVolumeDecrement, handleVolumeIncrement,
    handleChartModifyPosition, toggleFullscreen,
    handleModifyOrder, submitModifyOrder,
    historyPage, historyTotalPages, setHistoryPage,
  } = useTradePage(id)

  const showMkt = showMarketWatch
  const showPanel = isFullscreen ? (showRightPanel || showFullscreenPanel) : showRightPanel

  const [indicators, setIndicators] = useState<string[]>([])
  const handleToggleIndicator = useCallback((ind: string) => {
    setIndicators((prev) => (prev.includes(ind) ? prev.filter((i) => i !== ind) : [...prev, ind]))
  }, [])

  const layoutClassName = buildTradeLayoutClassNames({
    isFullscreen,
    showMarketWatch: showMkt,
    showRightPanel: showPanel,
    styles,
  })
  const marketWatchClassName = buildTradePanelClassName({
    isVisible: showMkt,
    baseClass: 'trade-market-watch',
    collapsedClass: 'trade-market-watch-collapsed',
    styles,
  })
  const rightPanelClassName = buildTradePanelClassName({
    isVisible: showPanel,
    baseClass: 'trade-right-panel',
    collapsedClass: 'trade-right-panel-collapsed',
    styles,
  })

  return (
    <Layout noPadding>
      <div className={layoutClassName}>
        <div
          className={`${marketWatchClassName} ${isFullscreen ? styles['trade-market-watch-fs'] : ''} ${isFullscreen ? styles['fs-open'] : ''}`}
          aria-hidden={!showMkt}
        >
          <MarketWatch
            onSelectSymbol={(sym) => {
              setSymbol(sym)
              setPrice('')
              setSl('')
              setTp('')
            }}
            activeSymbol={symbol}
          />
        </div>

        <div className={styles['trade-chart-area']}>
          <div className={styles['trade-chart-shell']}>
            <TradeTopBar
            id={id!}
            symbol={symbol}
            chartInterval={chartInterval}
            onIntervalChange={setChartInterval}
            connectionStatus={connectionStatus}
            marketOpen={marketOpen}
            isStale={isStale}
            isFullscreen={isFullscreen}
            showMarketWatch={showMkt}
            showRightPanel={showPanel}
            showFullscreenPanel={showFullscreenPanel}
            indicators={indicators}
            onToggleIndicator={handleToggleIndicator}
            onToggleMarketWatch={() => setShowMarketWatch((v) => !v)}
            onToggleRightPanel={() => setShowRightPanel((v) => !v)}
            onToggleFullscreen={toggleFullscreen}
            onToggleFullscreenPanel={() => setShowFullscreenPanel((v) => !v)}
          />

            <div className={styles['trade-chart-container']}>
              <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>{t('phrases.loadingChart')}</div>}>
              <Chart
                symbol={symbol}
                interval={chartInterval}
                theme="dark"
                positions={currentSymbolPositions}
                orders={orders}
                onPriceSelect={handlePriceSelect}
                connectionStatus={connectionStatus}
                showVolume={isFullscreen}
                showDrawingTools={isFullscreen}
                indicators={indicators}
                onModifyPosition={handleChartModifyPosition}
              />
            </Suspense>
          </div>

          {!isFullscreen && (
            <div className={styles['trade-bottom-panel']}>
              <div className={styles['trade-bottom-tabs']}>
                {(['positions', 'orders', 'history'] as const).map((tab) => (
                  <button
                    key={tab}
                    className={`${styles['trade-bottom-tab']} ${activeTab === tab ? styles.active : ''}`}
                    onClick={() => setActiveTab(tab)}
                  >
                    {tab === 'positions'
                      ? t('phrases.positionsTab', { count: positions.length })
                      : tab === 'orders'
                        ? t('phrases.ordersTab')
                        : t('phrases.historyTab')}
                  </button>
                ))}
              </div>
              <div className={styles['trade-bottom-content']}>
                {activeTab === 'positions' && (
                  <Suspense fallback={<div style={{ padding: 20, color: '#6b7280' }}>{t('phrases.loading')}</div>}>
                    <PositionsTableLazy
                      positions={positions}
                      onReverse={handleReversePosition}
                      onModify={handleModify}
                      onClose={handleClose}
                      onCloseAll={handleCloseAll}
                    />
                  </Suspense>
                )}
                {activeTab === 'orders' && (
                  <OrdersTable orders={orders} accountId={id!} onCancel={handleCancelOrder} onModify={handleModifyOrder} />
                )}
                {activeTab === 'history' && (
                  <Suspense fallback={<div style={{ padding: 20, color: '#6b7280' }}>{t('phrases.loading')}</div>}>
                    <HistoryTableLazy history={history} page={historyPage} totalPages={historyTotalPages} onPageChange={setHistoryPage} />
                  </Suspense>
                )}
              </div>
            </div>
          )}
        </div>

        <div
          className={`${rightPanelClassName} ${isFullscreen ? styles['fs-split'] : ''}`}
          aria-hidden={!showPanel}
        >
            {isFullscreen && (
              <div className={styles['trade-panel-header']}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#d1d4dc' }}>{t('phrases.orderPanel')}</span>
                <button
                  className={styles['trade-panel-close-btn']}
                  onClick={() => {
                    setShowRightPanel(false)
                    setShowFullscreenPanel(false)
                  }}
                  title={t('phrases.closePanel')}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            )}

            {account && (
              <AccountSummary
                balance={Number(account.balance)}
                liveMarginUsed={liveMarginUsed}
                positions={positions}
                maxDailyLoss={account.maxDailyLoss ? Number(account.maxDailyLoss) : undefined}
              />
            )}

            <Suspense fallback={<div style={{ padding: 20, color: '#6b7280' }}>{t('phrases.loading')}</div>}>
              <OrderPanelLazy
                symbol={symbol}
                side={side}
                orderType={orderType}
                volume={volume}
                price={price}
                sl={sl}
                tp={tp}
                orderError={orderError}
                submitting={submitting}
                isStale={isStale}
                onSideChange={setSide}
                onOrderTypeChange={setOrderType}
                onVolumeChange={setVolume}
                onPriceChange={setPrice}
                onSlChange={setSl}
                onTpChange={setTp}
                onCopyPrice={handleCopyPrice}
                onCopySl={handleCopySl}
                onCopyTp={handleCopyTp}
                onSubmit={handlePlaceOrder}
              />
            </Suspense>
          </div>
        </div>
      </div>

      {modifyingPosition && (
        <Suspense fallback={null}>
          <ModifyModalLazy
            position={modifyingPosition}
            modifySl={modifySl}
            modifyTp={modifyTp}
            onSlChange={setModifySl}
            onTpChange={setModifyTp}
            onSubmit={submitModifyPosition}
            onClose={() => setModifyingPosition(null)}
            submitting={modifySubmitting}
          />
        </Suspense>
      )}

      {modifyingOrder && (
        <Suspense fallback={null}>
          <ModifyOrderModalLazy
            order={modifyingOrder}
            modifyPrice={modifyOrderPrice}
            modifySl={modifyOrderSl}
            modifyTp={modifyOrderTp}
            onPriceChange={setModifyOrderPrice}
            onSlChange={setModifyOrderSl}
            onTpChange={setModifyOrderTp}
            onSubmit={submitModifyOrder}
            onClose={() => setModifyingOrder(null)}
            submitting={modifyOrderSubmitting}
          />
        </Suspense>
      )}

      {closingPosition && (
        <Suspense fallback={null}>
          <CloseModalLazy
            position={closingPosition}
            closeVolume={closeVolume}
            onVolumeChange={setCloseVolume}
            onVolumeDecrement={handleVolumeDecrement}
            onVolumeIncrement={handleVolumeIncrement}
            onSubmit={submitPartialClose}
            onClose={() => setClosingPosition(null)}
            submitting={closeSubmitting}
          />
        </Suspense>
      )}
    </Layout>
  )
}
