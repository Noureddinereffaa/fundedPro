export type Constructor<T> = new (...args: unknown[]) => T
export type Factory<T> = () => T
export type Token = string | symbol

export class Container {
  private singletons = new Map<Token, unknown>()
  private factories = new Map<Token, Factory<unknown>>()
  private transientFactories = new Map<Token, Factory<unknown>>()

  register<T>(token: Token, factory: Factory<T>): void {
    this.factories.set(token, factory as Factory<unknown>)
    this.singletons.delete(token)
    this.transientFactories.delete(token)
  }

  registerSingleton<T>(token: Token, instance: T): void {
    this.singletons.set(token, instance)
    this.factories.delete(token)
    this.transientFactories.delete(token)
  }

  registerTransient<T>(token: Token, factory: Factory<T>): void {
    this.transientFactories.set(token, factory as Factory<unknown>)
    this.factories.delete(token)
    this.singletons.delete(token)
  }

  resolve<T>(token: Token): T {
    const singleton = this.singletons.get(token)
    if (singleton !== undefined) {
      return singleton as T
    }

    const transientFactory = this.transientFactories.get(token)
    if (transientFactory) {
      return transientFactory() as T
    }

    const factory = this.factories.get(token)
    if (factory) {
      const instance = factory()
      this.singletons.set(token, instance)
      this.factories.delete(token)
      return instance as T
    }

    throw new Error(`No registration found for token: ${String(token)}`)
  }

  tryResolve<T>(token: Token): T | null {
    try {
      return this.resolve<T>(token)
    } catch {
      return null
    }
  }

  has(token: Token): boolean {
    return (
      this.singletons.has(token) ||
      this.factories.has(token) ||
      this.transientFactories.has(token)
    )
  }

  clear(): void {
    this.singletons.clear()
    this.factories.clear()
    this.transientFactories.clear()
  }

  getRegisteredTokens(): Token[] {
    const tokens = new Set<Token>()
    for (const key of this.singletons.keys()) {
      tokens.add(key)
    }
    for (const key of this.factories.keys()) {
      tokens.add(key)
    }
    for (const key of this.transientFactories.keys()) {
      tokens.add(key)
    }
    return Array.from(tokens)
  }
}
