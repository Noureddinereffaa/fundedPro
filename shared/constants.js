// ── Interval Definitions ──────────────────────────────────────
// Single source of truth for all supported chart intervals.
// Both server (Node.js ESM) and client (Vite/TypeScript) use this.

export const ALL_INTERVALS = [
  { id: '1s', sec: 1 },
  { id: '5s', sec: 5 },
  { id: '15s', sec: 15 },
  { id: '30s', sec: 30 },
  { id: '60', sec: 60 },
  { id: '300', sec: 300 },
  { id: '900', sec: 900 },
  { id: '1800', sec: 1800 },
  { id: '3600', sec: 3600 },
  { id: '7200', sec: 7200 },
  { id: '14400', sec: 14400 },
  { id: '21600', sec: 21600 },
  { id: '43200', sec: 43200 },
  { id: 'D', sec: 86400 },
  { id: 'W', sec: 604800 },
  { id: 'M', sec: 2592000 },
]

export const COMMON_INTERVALS = ['60', '300', '900', '1800', '3600', '14400', '43200', 'D']

// ── cacheTTL ──────────────────────────────────────────────────
// Returns cache TTL in milliseconds for a given interval ID.

export function cacheTTL(intervalId) {
  const n = parseInt(intervalId)
  if (isNaN(n))
    return intervalId === 'D' ? 3600000 : intervalId === 'W' ? 7200000 : intervalId === 'M' ? 7200000 : 300000
  if (n <= 60) return 30000
  if (n <= 300) return 300000
  if (n <= 900) return 300000
  if (n <= 1800) return 600000
  if (n <= 3600) return 900000
  if (n <= 14400) return 900000
  if (n <= 43200) return 1800000
  return 3600000
}

// ── intervalsToSeconds ───────────────────────────────────────
// Converts an interval ID string to its duration in seconds.

export function intervalsToSeconds(intervalId) {
  const match = ALL_INTERVALS.find((i) => i.id === intervalId)
  return match ? match.sec : 60
}
