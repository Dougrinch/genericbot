import { type Config, type EntryConfig, type VariableConfig } from "./Config.ts"
import { type BotManager, useConfigManager } from "./BotManager.ts"
import { type Draft, produce } from "immer"


export function useConfig(): Config
export function useConfig<T>(selector: (state: Config) => T): T
export function useConfig<T>(selector?: (state: Config) => T): T | Config {
  return useConfigManager(cm => selector ? selector(cm.getConfig()) : cm.getConfig())
}


class IdCache<T extends { readonly id: string }> {
  private readonly elements: () => readonly T[]

  constructor(elements: () => readonly T[]) {
    this.elements = elements
  }

  private readonly cache = new Map<string, { e: T } | "empty">()

  get(id: string): T | undefined {
    const cached = this.cache.get(id)
    if (cached === "empty") {
      return undefined
    }
    if (cached !== undefined) {
      return cached.e
    }

    const element = this.elements().find(e => e.id === id)
    if (element) {
      this.cache.set(id, { e: element })
      return element
    } else {
      this.cache.set(id, "empty")
      return undefined
    }
  }

  reset() {
    this.cache.clear()
  }
}


export const CONFIG_STORAGE_KEY = "autoclick.config.v1"

export class ConfigManager {
  private readonly bot: BotManager
  private config: Config

  private readonly entriesCache = new IdCache(() => this.config.entries)
  private readonly variablesCache = new IdCache(() => this.config.variables)

  constructor(botState: BotManager) {
    this.bot = botState
    this.config = this.loadConfig()
  }

  getConfig(): Config {
    return this.config
  }

  getEntry(id: string): EntryConfig | undefined {
    return this.entriesCache.get(id)
  }

  getVariable(id: string): VariableConfig | undefined {
    return this.variablesCache.get(id)
  }

  reload() {
    this.config = this.loadConfig()
    this.entriesCache.reset()
    this.variablesCache.reset()
  }

  private saveConfig(): void {
    try {
      localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(this.config))
    } catch (error) {
      console.error("Failed to save config to localStorage:", error)
    }
  }

  private loadConfig(): Config {
    try {
      const saved = localStorage.getItem(CONFIG_STORAGE_KEY)
      if (saved !== null && saved.length > 0) {
        return JSON.parse(saved) as Config
      }
    } catch (error) {
      console.error("Failed to load config from localStorage:", error)
    }
    return {
      entries: [],
      variables: []
    }
  }

  private updateConfig(updater: (config: Draft<Config>) => void): void {
    this.config = produce(this.config, updater)
    this.entriesCache.reset()
    this.variablesCache.reset()
    this.saveConfig()
  }

  addEntry(): void {
    const oldIds = this.config.entries
      .map(e => e.id.match(/^entry_(\d+)$/))
      .filter(m => m !== null)
      .map(m => Number(m[1]))

    const newId = oldIds.length > 0
      ? `entry_${Math.max(...oldIds) + 1}`
      : "entry_1"

    this.updateConfig(config => {
      config.entries.push({
        id: newId,
        name: "",
        xpath: "",
        interval: 1000
      })
    })

    this.bot.entries.reset(newId)
  }

  updateEntry(id: string, updates: Partial<EntryConfig>): void {
    const entryIndex = this.indexOf(id, this.config.entries)
    if (entryIndex !== undefined) {
      this.updateConfig(config => {
        config.entries[entryIndex] = {
          ...config.entries[entryIndex],
          ...updates
        }
      })
      this.bot.entries.reset(id)
    }
  }

  removeEntry(id: string): void {
    const entryIndex = this.indexOf(id, this.config.entries)
    if (entryIndex !== undefined) {
      this.updateConfig(config => {
        config.entries.splice(entryIndex, 1)
      })
      this.bot.entries.reset(id)
    }
  }

  addVariable(): void {
    const oldIds = this.config.variables
      .map(v => v.id.match(/^var_(\d+)$/))
      .filter(m => m !== null)
      .map(m => Number(m[1]))

    const newId = oldIds.length > 0
      ? `var_${Math.max(...oldIds) + 1}`
      : "var_1"

    this.updateConfig(config => {
      config.variables.push({
        id: newId,
        name: "",
        xpath: "",
        regex: "",
        type: "number"
      })
    })

    this.bot.variables.reset(newId)
  }

  updateVariable(id: string, updates: Partial<VariableConfig>): void {
    const variableIndex = this.indexOf(id, this.config.variables)
    if (variableIndex !== undefined) {
      this.updateConfig(config => {
        config.variables[variableIndex] = {
          ...config.variables[variableIndex],
          ...updates
        }
      })
      this.bot.variables.reset(id)
    }
  }

  removeVariable(id: string): void {
    const variableIndex = this.indexOf(id, this.config.variables)
    if (variableIndex !== undefined) {
      this.updateConfig(config => {
        config.variables.splice(variableIndex, 1)
      })
      this.bot.variables.reset(id)
    }
  }

  reorderVariables(orderedIds: string[]): void {
    this.updateConfig(config => {
      config.variables.sort((a, b) => {
        const aIndex = orderedIds.indexOf(a.id)
        const bIndex = orderedIds.indexOf(b.id)
        return aIndex - bIndex
      })
    })
  }

  private indexOf(id: string, array: readonly { readonly id: string }[]): number | undefined {
    const result = array.findIndex(e => e.id === id)
    if (result === -1) {
      return undefined
    }
    return result
  }
}
