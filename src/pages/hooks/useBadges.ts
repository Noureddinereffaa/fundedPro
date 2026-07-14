import { useState, useEffect, useCallback } from 'react'
import { badgeApi } from '../../utils/api'
import type { BadgeWithProgress } from '../../../shared/types'

export function useBadges() {
  const [badges, setBadges] = useState<BadgeWithProgress[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState({
    totalTrades: 0,
    totalProfit: 0,
    winStreak: 0,
    tradingDays: 0,
    passedEvaluation: false,
    funded: false,
    payoutCount: 0,
    cleanDays: 0,
  })

  const fetchBadges = useCallback(async () => {
    try {
      setLoading(true)
      const data = await badgeApi.getAll()
      setBadges(data)
      setError(null)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  const checkBadges = useCallback(async (newStats: Partial<typeof stats>) => {
    try {
      const merged = { ...stats, ...newStats }
      setStats(merged)
      await badgeApi.check(merged)
      await fetchBadges()
    } catch {
      // silently fail
    }
  }, [stats, fetchBadges])

  useEffect(() => {
    fetchBadges()
  }, [fetchBadges])

  const grouped = badges.reduce((acc, b) => {
    if (!acc[b.category]) acc[b.category] = []
    acc[b.category].push(b)
    return acc
  }, {} as Record<string, BadgeWithProgress[]>)

  const unlocked = badges.filter((b) => b.unlocked).length
  const total = badges.length

  return { badges, grouped, loading, error, unlocked, total, checkBadges, refetch: fetchBadges }
}
