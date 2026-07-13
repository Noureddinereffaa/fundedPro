import { prisma } from '../index.js'

export class ReportService {
  async getDailyReport(accountId: string, date: Date) {
    const start = new Date(date)
    start.setHours(0, 0, 0, 0)
    const end = new Date(date)
    end.setHours(23, 59, 59, 999)

    const trades = await prisma.trade.findMany({
      where: { accountId, closeTime: { gte: start, lte: end } },
    })

    const wins = trades.filter((t) => Number(t.profit) > 0)
    const losses = trades.filter((t) => Number(t.profit) < 0)
    const totalPnl = trades.reduce((sum, t) => sum + Number(t.profit), 0)

    return {
      date: start.toISOString().split('T')[0],
      totalTrades: trades.length,
      wins: wins.length,
      losses: losses.length,
      winRate: trades.length > 0 ? ((wins.length / trades.length) * 100).toFixed(1) : '0',
      totalPnl: totalPnl.toFixed(2),
      trades: trades.map((t) => ({
        symbol: t.symbol,
        side: t.side,
        volume: t.volume,
        openPrice: t.openPrice,
        closePrice: t.closePrice,
        profit: t.profit,
        duration: t.duration,
      })),
    }
  }

  async getEquityCurve(accountId: string, days: number = 30) {
    const account = await prisma.account.findUnique({ where: { id: accountId } })
    if (!account) return []

    const snapshots = await prisma.dailySnapshot.findMany({
      where: { accountId },
      orderBy: { date: 'asc' },
      take: days,
    })

    return snapshots.map((s) => ({
      date: s.date,
      equity: s.equity,
      balance: s.balance,
      dailyPnl: s.dailyPnl,
      totalPnl: s.totalPnl,
    }))
  }

  async getPerformanceStats(accountId: string) {
    const trades = await prisma.trade.findMany({ where: { accountId } })
    if (trades.length === 0) return null

    const profits: number[] = trades.map((t) => Number(t.profit))
    const wins: number[] = profits.filter((p) => p > 0)
    const losses: number[] = profits.filter((p) => p < 0)

    const totalProfit: number = wins.reduce((s: number, p: number) => s + p, 0)
    const totalLoss: number = Math.abs(losses.reduce((s: number, p: number) => s + p, 0))

    const durations: number[] = trades.filter((t) => t.duration).map((t) => t.duration as number)
    const avgDuration: number =
      durations.length > 0 ? durations.reduce((s: number, d: number) => s + d, 0) / durations.length : 0

    const avgWin = wins.length > 0 ? totalProfit / wins.length : 0
    const avgLoss = losses.length > 0 ? totalLoss / losses.length : 0
    const winRate = wins.length / trades.length
    const expectancy = winRate * avgWin - (1 - winRate) * avgLoss

    let maxConsecutiveWins = 0,
      maxConsecutiveLosses = 0
    let currentWins = 0,
      currentLosses = 0
    for (const p of profits) {
      if (p > 0) {
        currentWins++
        currentLosses = 0
      } else if (p < 0) {
        currentLosses++
        currentWins = 0
      } else {
        currentWins = 0
        currentLosses = 0
      }
      maxConsecutiveWins = Math.max(maxConsecutiveWins, currentWins)
      maxConsecutiveLosses = Math.max(maxConsecutiveLosses, currentLosses)
    }

    return {
      totalTrades: trades.length,
      winRate: (winRate * 100).toFixed(1),
      profitFactor: totalLoss > 0 ? (totalProfit / totalLoss).toFixed(2) : 'Infinity',
      expectancy: expectancy.toFixed(2),
      averageWin: avgWin.toFixed(2),
      averageLoss: avgLoss.toFixed(2),
      bestTrade: Math.max(...profits).toFixed(2),
      worstTrade: Math.min(...profits).toFixed(2),
      totalProfit: totalProfit.toFixed(2),
      totalLoss: totalLoss.toFixed(2),
      netPnl: (totalProfit - totalLoss).toFixed(2),
      maxConsecutiveWins,
      maxConsecutiveLosses,
      averageDuration: Math.round(avgDuration),
    }
  }

  async getSymbolBreakdown(accountId: string) {
    const trades = await prisma.trade.findMany({ where: { accountId } })
    const symbolMap = new Map<string, { trades: number; pnl: number; wins: number }>()

    for (const t of trades) {
      const existing = symbolMap.get(t.symbol) || { trades: 0, pnl: 0, wins: 0 }
      existing.trades++
      existing.pnl += Number(t.profit)
      if (Number(t.profit) > 0) existing.wins++
      symbolMap.set(t.symbol, existing)
    }

    return Array.from(symbolMap.entries())
      .map(([symbol, data]) => ({
        symbol,
        trades: data.trades,
        pnl: data.pnl.toFixed(2),
        winRate: ((data.wins / data.trades) * 100).toFixed(1),
      }))
      .sort((a, b) => Number(b.pnl) - Number(a.pnl))
  }
}
