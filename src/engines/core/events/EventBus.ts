import type { EventHandler, UnsubscribeFn } from '../types'

type WildcardHandler = (event: string, data: unknown) => void

export class EventBus {
  private listeners = new Map<string, Set<EventHandler>>()
  private onceListeners = new Map<string, Set<EventHandler>>()
  private wildcardListeners = new Set<WildcardHandler>()
  private onceWildcardListeners = new Set<WildcardHandler>()

  on<T>(event: string, handler: EventHandler<T>): UnsubscribeFn {
    if (event === '*') {
      const wrapped: WildcardHandler = (_ev, data) => (handler as EventHandler)(data as T)
      this.wildcardListeners.add(wrapped)
      return () => {
        this.wildcardListeners.delete(wrapped)
        this.onceWildcardListeners.delete(wrapped)
      }
    }
    let set = this.listeners.get(event)
    if (!set) {
      set = new Set()
      this.listeners.set(event, set)
    }
    set.add(handler as EventHandler)
    return () => this.off(event, handler)
  }

  once<T>(event: string, handler: EventHandler<T>): UnsubscribeFn {
    if (event === '*') {
      const wrapped: WildcardHandler = (ev, data) => {
        this.onceWildcardListeners.delete(wrapped)
        this.wildcardListeners.delete(wrapped)
        ;(handler as EventHandler)(data as T)
      }
      this.onceWildcardListeners.add(wrapped)
      this.wildcardListeners.add(wrapped)
      return () => {
        this.wildcardListeners.delete(wrapped)
        this.onceWildcardListeners.delete(wrapped)
      }
    }
    const wrapped: EventHandler = (data) => {
      this.off(event, wrapped)
      handler(data as T)
    }
    let onceSet = this.onceListeners.get(event)
    if (!onceSet) {
      onceSet = new Set()
      this.onceListeners.set(event, onceSet)
    }
    onceSet.add(wrapped)

    let set = this.listeners.get(event)
    if (!set) {
      set = new Set()
      this.listeners.set(event, set)
    }
    set.add(wrapped)
    return () => this.off(event, wrapped)
  }

  off(event: string, handler: EventHandler): void {
    if (event === '*') {
      const listeners = Array.from(this.wildcardListeners)
      for (const wrapped of listeners) {
        const fn = wrapped as unknown as EventHandler
        if (fn === handler) {
          this.wildcardListeners.delete(wrapped)
          this.onceWildcardListeners.delete(wrapped)
        }
      }
      return
    }
    const set = this.listeners.get(event)
    if (set) {
      set.delete(handler)
      if (set.size === 0) {
        this.listeners.delete(event)
      }
    }
    const onceSet = this.onceListeners.get(event)
    if (onceSet) {
      onceSet.delete(handler)
      if (onceSet.size === 0) {
        this.onceListeners.delete(event)
      }
    }
  }

  emit<T>(event: string, data: T): void {
    if (this.wildcardListeners.size > 0) {
      const snapshot = new Set(this.wildcardListeners)
      for (const handler of snapshot) {
        handler(event, data)
      }
    }
    if (this.onceWildcardListeners.size > 0) {
      for (const handler of this.onceWildcardListeners) {
        this.wildcardListeners.delete(handler)
      }
      this.onceWildcardListeners.clear()
    }

    const set = this.listeners.get(event)
    if (set && set.size > 0) {
      const snapshot = new Set(set)
      for (const handler of snapshot) {
        handler(data as T)
      }
    }

    const onceSet = this.onceListeners.get(event)
    if (onceSet && onceSet.size > 0) {
      for (const handler of onceSet) {
        const s = this.listeners.get(event)
        if (s) {
          s.delete(handler)
          if (s.size === 0) {
            this.listeners.delete(event)
          }
        }
      }
      this.onceListeners.delete(event)
    }
  }

  removeAllListeners(event?: string): void {
    if (event === undefined) {
      this.listeners.clear()
      this.onceListeners.clear()
      this.wildcardListeners.clear()
      this.onceWildcardListeners.clear()
      return
    }
    if (event === '*') {
      this.wildcardListeners.clear()
      this.onceWildcardListeners.clear()
      return
    }
    this.listeners.delete(event)
    this.onceListeners.delete(event)
  }

  listenerCount(event?: string): number {
    if (event === undefined) {
      let total = this.wildcardListeners.size
      for (const set of this.listeners.values()) {
        total += set.size
      }
      return total
    }
    if (event === '*') {
      return this.wildcardListeners.size
    }
    const set = this.listeners.get(event)
    return set ? set.size : 0
  }
}
