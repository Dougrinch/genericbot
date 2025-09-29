import { type ActionConfig, type Config, type ElementConfig, type VariableConfig } from "./Config.ts"
import { type BotManager } from "./BotManager.ts"
import { type Draft, produce } from "immer"
import { useConfigManager } from "../BotManagerContext.tsx"


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

  private readonly actionsCache = new IdCache(() => this.config.actions)
  private readonly variablesCache = new IdCache(() => this.config.variables)
  private readonly elementsCache = new IdCache(() => this.config.elements)

  constructor(botState: BotManager) {
    this.bot = botState
    this.config = this.loadConfig()
  }

  getConfig(): Config {
    return this.config
  }

  getAction(id: string): ActionConfig | undefined {
    return this.actionsCache.get(id)
  }

  getVariable(id: string): VariableConfig | undefined {
    return this.variablesCache.get(id)
  }

  getElement(id: string): ElementConfig | undefined {
    return this.elementsCache.get(id)
  }

  reload() {
    this.config = this.loadConfig()
    this.actionsCache.reset()
    this.variablesCache.reset()
    this.elementsCache.reset()
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
        return this.fixCompatibility(JSON.parse(saved) as Config)
      }
    } catch (error) {
      console.error("Failed to load config from localStorage:", error)
    }
    return {
      actions: [],
      variables: [],
      elements: []
    }
  }

  private fixCompatibility(oldConfig: Config): Config {
    return produce(oldConfig, config => {
      if (config.actions === undefined) {
        config.actions = []

        const configWithOldEntries = config as Partial<{ entries: ActionConfig[] }>
        if (configWithOldEntries.entries) {
          for (const entry of configWithOldEntries.entries) {
            config.actions.push({
              ...entry,
              id: "action_" + entry.id.slice(5)
            })
          }
        }
      }

      for (const action of config.actions) {
        if (action.type === undefined) {
          action.type = "xpath"
        }
        if (action.script === undefined) {
          action.script = ""
        }
      }

      if (config.elements === undefined) {
        config.elements = []

        const configWithOldButtons = config as Partial<{ buttons: ElementConfig[] }>
        if (configWithOldButtons.buttons) {
          for (const button of configWithOldButtons.buttons) {
            config.elements.push({
              ...button,
              id: "elem" + button.id.slice(3)
            })
          }
        }
      }
    })
  }

  private updateConfig(updater: (config: Draft<Config>) => void): void {
    this.config = produce(this.config, updater)
    this.actionsCache.reset()
    this.variablesCache.reset()
    this.elementsCache.reset()
    this.saveConfig()
  }

  addAction(): void {
    const oldIds = this.config.actions
      .map(a => a.id.match(/^action_(\d+)$/))
      .filter(m => m !== null)
      .map(m => Number(m[1]))

    const newId = oldIds.length > 0
      ? `action_${Math.max(...oldIds) + 1}`
      : "action_1"

    this.updateConfig(config => {
      config.actions.push({
        id: newId,
        name: "",
        type: "xpath",
        xpath: "",
        script: "",
        interval: 1000,
        allowMultiple: false
      })
    })

    this.bot.actions.reset(newId)
  }

  updateAction(id: string, updates: Partial<ActionConfig>): void {
    const actionIndex = this.indexOf(id, this.config.actions)
    if (actionIndex !== undefined) {
      this.updateConfig(config => {
        config.actions[actionIndex] = {
          ...config.actions[actionIndex],
          ...updates
        }
      })
      this.bot.actions.reset(id)
    }
  }

  removeAction(id: string): void {
    const actionIndex = this.indexOf(id, this.config.actions)
    if (actionIndex !== undefined) {
      this.updateConfig(config => {
        config.actions.splice(actionIndex, 1)
      })
      this.bot.actions.reset(id)
    }
  }

  reorderActions(orderedIds: string[]): void {
    this.updateConfig(config => {
      config.actions.sort((a, b) => {
        const aIndex = orderedIds.indexOf(a.id)
        const bIndex = orderedIds.indexOf(b.id)
        return aIndex - bIndex
      })
    })
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

  addElement(): void {
    const oldIds = this.config.elements
      .map(e => e.id.match(/^elem_(\d+)$/))
      .filter(m => m !== null)
      .map(m => Number(m[1]))

    const newId = oldIds.length > 0
      ? `elem_${Math.max(...oldIds) + 1}`
      : "elem_1"

    this.updateConfig(config => {
      config.elements.push({
        id: newId,
        name: "",
        xpath: "",
        allowMultiple: false
      })
    })

    this.bot.elements.reset(newId)
  }

  updateElement(id: string, updates: Partial<ElementConfig>): void {
    const elementIndex = this.indexOf(id, this.config.elements)
    if (elementIndex !== undefined) {
      this.updateConfig(config => {
        config.elements[elementIndex] = {
          ...config.elements[elementIndex],
          ...updates
        }
      })
      this.bot.elements.reset(id)
    }
  }

  removeElement(id: string): void {
    const elementIndex = this.indexOf(id, this.config.elements)
    if (elementIndex !== undefined) {
      this.updateConfig(config => {
        config.elements.splice(elementIndex, 1)
      })
      this.bot.elements.reset(id)
    }
  }

  reorderElements(orderedIds: string[]): void {
    this.updateConfig(config => {
      config.elements.sort((a, b) => {
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
