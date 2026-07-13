import { useEffect, useRef, useCallback } from 'react'
import type { Candle } from '../../shared/types'

type WorkerCb = (result: unknown) => void

interface PendingCall {
  id: number
  cb: WorkerCb
}

export function useWorkerIndicators() {
  const workerRef = useRef<Worker | null>(null)
  const pendingRef = useRef<PendingCall[]>([])
  const idCounter = useRef(0)

  useEffect(() => {
    const worker = new Worker(new URL('./indicators.worker.ts', import.meta.url), { type: 'module' })
    workerRef.current = worker

    worker.onmessage = (e: MessageEvent) => {
      const { id, result } = e.data
      const idx = pendingRef.current.findIndex((p) => p.id === id)
      if (idx >= 0) {
        pendingRef.current[idx].cb(result)
        pendingRef.current.splice(idx, 1)
      }
    }

    worker.onerror = (err) => {
      console.error('[Worker] Error:', err)
    }

    return () => {
      worker.terminate()
      workerRef.current = null
      pendingRef.current = []
    }
  }, [])

  const compute = useCallback(
    (type: string, data: Candle[], period?: number, stdDev?: number): Promise<unknown> => {
      return new Promise((resolve) => {
        const id = ++idCounter.current
        pendingRef.current.push({ id, cb: resolve })
        workerRef.current?.postMessage({ id, type, data, period, stdDev })
      })
    },
    [],
  )

  return { compute }
}
