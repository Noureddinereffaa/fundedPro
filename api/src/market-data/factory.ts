import { MarketDataProvider } from './provider.js'
import { ProviderName, ProviderConfig, MarketType } from './types.js'
import { logger } from '../utils/logger.js'

type ProviderConstructor = new (config: ProviderConfig) => MarketDataProvider

export class ProviderFactory {
  private registry: Map<ProviderName, ProviderConstructor>
  private instances: Map<ProviderName, MarketDataProvider>
  private configs: Map<ProviderName, ProviderConfig>

  constructor() {
    this.registry = new Map()
    this.instances = new Map()
    this.configs = new Map()
  }

  register(name: ProviderName, ctor: ProviderConstructor): void {
    this.registry.set(name, ctor)
    logger.info(`ProviderFactory: registered ${name}`)
  }

  configure(configs: ProviderConfig[]): void {
    for (const cfg of configs) {
      this.configs.set(cfg.name, cfg)
    }
  }

  async getProvider(name: ProviderName): Promise<MarketDataProvider> {
    const existing = this.instances.get(name)
    if (existing) return existing

    const ctor = this.registry.get(name)
    if (!ctor) {
      throw new Error(`Provider ${name} is not registered`)
    }

    const config = this.configs.get(name)
    if (!config) {
      throw new Error(`Provider ${name} has no configuration`)
    }

    if (!config.enabled) {
      throw new Error(`Provider ${name} is disabled`)
    }

    const instance = new ctor(config)
    await instance.connect()
    this.instances.set(name, instance)
    logger.info(`ProviderFactory: initialized ${name}`)
    return instance
  }

  async getProviderFor(marketType: MarketType, prefer?: ProviderName): Promise<MarketDataProvider> {
    const all = this.getEnabledProviders()
    const sorted = all.slice().sort((a, b) => a.priority - b.priority)

    if (prefer) {
      const preferred = sorted.find(p => p.name === prefer)
      if (preferred) {
        const instance = await this.getProvider(preferred.name)
        return instance
      }
    }

    for (const cfg of sorted) {
      try {
        const instance = await this.getProvider(cfg.name)
        return instance
      } catch (err) {
        logger.warn(`ProviderFactory: ${cfg.name} unavailable, trying next: ${err}`)
      }
    }

    throw new Error(`No available provider for ${marketType}`)
  }

  getAllProviders(): MarketDataProvider[] {
    return Array.from(this.instances.values())
  }

  getEnabledConfigs(): ProviderConfig[] {
    return Array.from(this.configs.values()).filter(c => c.enabled)
  }

  getEnabledProviders(): ProviderConfig[] {
    return this.getEnabledConfigs()
  }

  async disconnectAll(): Promise<void> {
    for (const [name, instance] of this.instances) {
      try {
        instance.disconnect()
        logger.info(`ProviderFactory: disconnected ${name}`)
      } catch (err) {
        logger.error(`ProviderFactory: error disconnecting ${name}: ${err}`)
      }
    }
    this.instances.clear()
  }

  isInitialized(name: ProviderName): boolean {
    return this.instances.has(name)
  }
}

export const providerFactory = new ProviderFactory()
