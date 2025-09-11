import { type Config, type EntryConfig, initialBotConfig, type VariableConfig } from "./Config.ts"
import { type BotManager, useConfigManager } from "./BotManager.ts"
import { produce } from "immer"


export function useConfig(): Config
export function useConfig<T>(selector: (state: Config) => T): T
export function useConfig<T>(selector?: (state: Config) => T): T | Config {
  return useConfigManager(cm => selector ? selector(cm.getConfig()) : cm.getConfig())
}


export class ConfigManager {
  private readonly bot: BotManager
  private config: Config

  constructor(botState: BotManager) {
    this.bot = botState
    this.config = initialBotConfig()
  }

  getConfig(): Config {
    return this.config
  }

  reset(): void {
    this.config = initialBotConfig()
    this.bot.variables.resetAll()
  }

  addEntry(): void {
    this.config = produce(this.config, config => {
      const oldIds = Array.from(config.entries.values())
        .map(e => e.id.match(/^entry_(\d+)$/))
        .filter(m => m !== null)
        .map(m => Number(m[1]))

      const newId = oldIds.length > 0
        ? `entry_${Math.max(...oldIds) + 1}`
        : "entry_1"

      config.entries.set(newId, {
        id: newId,
        name: "",
        xpath: "",
        interval: 1000
      })
    })
  }

  updateEntry(id: string, updates: Partial<EntryConfig>): void {
    this.config = produce(this.config, config => {
      const currentEntry = config.entries.get(id)
      if (currentEntry) {
        config.entries.set(id, {
          ...currentEntry,
          ...updates
        })
      }
    })
  }

  removeEntry(id: string): void {
    this.config = produce(this.config, config => {
      config.entries.delete(id)
    })
  }

  addVariable(): void {
    const oldIds = Array.from(this.config.variables.values())
      .map(v => v.id.match(/^var_(\d+)$/))
      .filter(m => m !== null)
      .map(m => Number(m[1]))

    const newId = oldIds.length > 0
      ? `var_${Math.max(...oldIds) + 1}`
      : "var_1"

    this.config = produce(this.config, config => {
      config.variables.set(newId, {
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
    const currentVariable = this.config.variables.get(id)
    if (currentVariable) {
      this.config = produce(this.config, config => {
        config.variables.set(id, {
          ...currentVariable,
          ...updates
        })
      })
      this.bot.variables.reset(id)
    }
  }

  removeVariable(id: string): void {
    this.config = produce(this.config, config => {
      config.variables.delete(id)
    })
    this.bot.variables.reset(id)
  }

  reorderVariables(orderedIds: string[]): void {
    this.config = produce(this.config, config => {
      // Reorder variables according to the provided order
      const reorderedVariables = new Map<string, VariableConfig>()
      for (const id of orderedIds) {
        const variable = config.variables.get(id)
        if (variable) {
          reorderedVariables.set(id, variable)
        }
      }

      // Replace the variable array with the reordered one
      config.variables = reorderedVariables
    })
  }
}
