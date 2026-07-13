import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { createChart, ColorType, AreaSeries } from 'lightweight-charts'
import type { Time } from 'lightweight-charts'
import { accountApi } from '../utils/api'
import type { PlotPoint } from '../../shared/types'

interface EquityChartProps {
  accountId: string
  days?: number
  height?: number
}

export function EquityChart({ accountId, days = 30, height = 280 }: EquityChartProps) {
  const { t } = useTranslation('trading')
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<ReturnType<typeof createChart> | null>(null)
  const [data, setData] = useState<PlotPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState(days)

  useEffect(() => {
    setLoading(true)
    accountApi
      .getSnapshots(accountId, range)
      .then((res: { data?: PlotPoint[] } & Record<string, unknown>) => {
        const points: PlotPoint[] = (res.data || []).map((s: PlotPoint) => ({
          date: typeof s.date === 'string' ? s.date.split('T')[0] : s.date,
          equity: Number(s.equity),
          balance: Number(s.balance),
        }))
        setData(points)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [accountId, range])

  useEffect(() => {
    if (!containerRef.current || data.length === 0) return

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#0d111c' },
        textColor: '#787b86',
        fontSize: 11,
      },
      grid: { vertLines: { color: '#1a1e2e' }, horzLines: { color: '#1a1e2e' } },
      width: containerRef.current.clientWidth,
      height,
      rightPriceScale: { borderColor: '#1a1e2e' },
      timeScale: { borderColor: '#1a1e2e', timeVisible: true },
    })
    chartRef.current = chart

    const chartData = data.map((d) => ({
      time: (new Date(d.date).getTime() / 1000) as Time,
      value: d.equity,
    }))

    const areaSeries = chart.addSeries(AreaSeries, {
      lineColor: '#3b82f6',
      topColor: '#3b82f640',
      bottomColor: '#3b82f610',
      lineWidth: 2,
      priceFormat: { type: 'custom', formatter: (v: number) => '$' + v.toFixed(2) },
    })
    areaSeries.setData(chartData)

    chart.timeScale().fitContent()

    const ro = new ResizeObserver(() => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth })
      }
    })
    ro.observe(containerRef.current)

    return () => {
      ro.disconnect()
      chart.remove()
      chartRef.current = null
    }
  }, [data, height])

  return (
    <div className="dashboard-card" style={{ padding: 0, overflow: 'hidden' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px 0',
        }}
      >
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>{t('equityChart.title')}</h3>
        <div style={{ display: 'flex', gap: 6 }}>
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setRange(d)}
              style={{
                padding: '3px 10px',
                borderRadius: 4,
                fontSize: 11,
                cursor: 'pointer',
                border: 'none',
                background: range === d ? '#3b82f6' : '#1a1e2e',
                color: range === d ? '#fff' : '#787b86',
              }}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>
      <div style={{ padding: '8px 16px', display: 'flex', gap: 20, fontSize: 12, color: '#787b86' }}>
        {data.length > 0 && (
          <>
            <span>
              {t('equityChart.equity')} <b style={{ color: '#22c55e' }}>${data[data.length - 1]?.equity.toFixed(2)}</b>
            </span>
            <span>
              {t('equityChart.balance')} <b style={{ color: '#3b82f6' }}>${data[data.length - 1]?.balance.toFixed(2)}</b>
            </span>
            <span>
              {t('equityChart.change')}{' '}
              <b
                style={{
                  color:
                    data.length > 1 && data[data.length - 1].equity >= data[0].equity ? '#22c55e' : '#ef4444',
                }}
              >
                {data.length > 1
                  ? (((data[data.length - 1].equity - data[0].equity) / data[0].equity) * 100).toFixed(2)
                  : '0'}
                %
              </b>
            </span>
          </>
        )}
      </div>
      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: height - 60 }}>
          <div className="app-spinner" />
        </div>
      )}
      <div
        ref={containerRef}
        style={{ width: '100%', height: height - 60, display: loading ? 'none' : 'block' }}
      />
      {!loading && data.length === 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: height - 60,
            color: '#787b86',
            fontSize: 13,
          }}
        >
          {t('equityChart.noData')}
        </div>
      )}
    </div>
  )
}
