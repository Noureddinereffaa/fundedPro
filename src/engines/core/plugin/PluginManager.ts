import type { EventBus } from '../events/EventBus'
import type { Container } from '../di/Container'
import { PluginEvents } from '../events/EventTypes'

export interface PluginMetadata {
  id: string
  name: string
  version: string
  author?: string
  description?: string
}

export interface Plugin<TConfig = Record<string, unknown>> extends PluginMetadata {
  initialize(context: PluginContext): Promise<void> | void
  destroy(): Promise<void> | void
  configure?(config: TConfig): void
}

export interface PluginContext {
  eventBus: EventBus
  container: Container
  version: string
}

export class PluginManager {
  private plugins = new Map<string, Plugin>()
  private contexts = new Map<string, PluginContext>()
  private loadOrder: string[] = []
  private eventBus: EventBus
  private container: Container

  constructor(eventBus: EventBus, container: Container) {
    this.eventBus = eventBus
    this.container = container
  }

  async register(plugin: Plugin): Promise<void> {
    if (this.plugins.has(plugin.id)) {
      throw new Error(`Plugin "${plugin.id}" is already registered`)
    }

    const context: PluginContext = {
      eventBus: this.eventBus,
      container: this.container,
      version: plugin.version,
    }

    this.plugins.set(plugin.id, plugin)
    this.contexts.set(plugin.id, context)
    this.loadOrder.push(plugin.id)

    await plugin.initialize(context)

    this.eventBus.emit(PluginEvents.PLUGIN_REGISTERED, {
      pluginId: plugin.id,
      name: plugin.name,
      version: plugin.version,
    })
  }

  async unregister(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId)
    if (!plugin) {
      throw new Error(`Plugin "${pluginId}" is not registered`)
    }

    await plugin.destroy()

    this.plugins.delete(pluginId)
    this.contexts.delete(pluginId)
    this.loadOrder = this.loadOrder.filter((id) => id !== pluginId)

    this.eventBus.emit(PluginEvents.PLUGIN_UNREGISTERED, {
      pluginId,
    })
  }

  getPlugin<T extends Plugin>(pluginId: string): T | null {
    const plugin = this.plugins.get(pluginId)
    return (plugin as T) ?? null
  }

  getLoadedPlugins(): PluginMetadata[] {
    return this.loadOrder
      .map((id) => this.plugins.get(id))
      .filter((p): p is Plugin => p !== undefined)
      .map((p) => ({
        id: p.id,
        name: p.name,
        version: p.version,
        author: p.author,
        description: p.description,
      }))
  }

  async destroyAll(): Promise<void> {
    const reversed = [...this.loadOrder].reverse()
    for (const pluginId of reversed) {
      const plugin = this.plugins.get(pluginId)
      if (plugin) {
        await plugin.destroy()
      }
    }
    this.plugins.clear()
    this.contexts.clear()
    this.loadOrder = []
  }

  isRegistered(pluginId: string): boolean {
    return this.plugins.has(pluginId)
  }
}
