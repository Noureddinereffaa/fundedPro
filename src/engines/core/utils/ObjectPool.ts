export class ObjectPool<T> {
  private pool: T[] = []
  private factory: () => T
  private reset: (obj: T) => void
  private maxSize: number

  constructor(
    factory: () => T,
    reset: (obj: T) => void,
    initialSize: number = 0,
    maxSize: number = 1024
  ) {
    this.factory = factory
    this.reset = reset
    this.maxSize = maxSize
    this.prewarm(initialSize)
  }

  acquire(): T {
    if (this.pool.length > 0) {
      return this.pool.pop()!
    }
    return this.factory()
  }

  release(obj: T): void {
    this.reset(obj)
    if (this.pool.length < this.maxSize) {
      this.pool.push(obj)
    }
  }

  get size(): number {
    return this.pool.length
  }

  get available(): number {
    return this.pool.length
  }

  clear(): void {
    this.pool.length = 0
  }

  prewarm(count: number): void {
    const toAdd = Math.min(count, this.maxSize - this.pool.length)
    for (let i = 0; i < toAdd; i++) {
      this.pool.push(this.factory())
    }
  }
}
