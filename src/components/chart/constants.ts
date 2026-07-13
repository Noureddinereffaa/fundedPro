import type { UTCTimestamp } from 'lightweight-charts'

export const THEME_COLORS = {
  dark: {
    bg: '#060816',
    text: '#9aa4bf',
    grid: '#1a2338',
    border: '#243047',
    up: '#2dd4bf',
    down: '#fb7185',
    volumeUp: '#2dd4bf40',
    volumeDown: '#fb718540',
    crosshair: '#60a5fa',
    wickUp: '#2dd4bf',
    wickDown: '#fb7185',
  },
  light: {
    bg: '#ffffff',
    text: '#6b7280',
    grid: '#e5e7eb',
    border: '#e5e7eb',
    up: '#22c55e',
    down: '#ef4444',
    volumeUp: '#22c55e30',
    volumeDown: '#ef444430',
    crosshair: '#3b82f6',
    wickUp: '#22c55e',
    wickDown: '#ef4444',
  },
}

export const CHART_LAYOUT = {
  main: 0.62,
  volume: 0.12,
  rsi: 0.1,
  macd: 0.1,
}

export function getChartColors(theme: 'dark' | 'light') {
  return THEME_COLORS[theme]
}

export function toTVTime(t: number): UTCTimestamp {
  return Math.floor(t) as UTCTimestamp
}
