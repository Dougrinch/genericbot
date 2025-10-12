import { type ActionConfig, type Config, type ElementConfig, type VariableConfig } from "./Config.ts"
import { type BotManager } from "./BotManager.ts"
import { type Draft, produce } from "immer"
import { useBotObservable } from "../BotManagerContext.tsx"
import { BehaviorSubject, Observable } from "rxjs"
import { distinctUntilChanged, map } from "rxjs/operators"


export function useConfig(): Config
export function useConfig<T>(selector: (state: Config) => T): T
export function useConfig<T>(selector?: (state: Config) => T): T | Config {
  const config = useBotObservable(m => m.config.config(), [])
  return selector ? selector(config) : config
}


class Cache<T extends { readonly id: string, readonly name: string }> {
  private readonly elements: () => readonly T[]

  constructor(elements: () => readonly T[]) {
    this.elements = elements
  }

  private readonly cache = new Map<keyof T, Map<string, { v: T } | "empty">>()

  get(id: string): T | undefined {
    return this.getBy("id", id)
  }

  getByName(name: string) {
    return this.getBy("name", name)
  }

  getBy<K extends keyof T>(keyType: K, key: string): T | undefined {
    let cache = this.cache.get(keyType)
    if (cache === undefined) {
      cache = new Map()
      this.cache.set(keyType, cache)
    }

    const cached = cache.get(key)
    if (cached === "empty") {
      return undefined
    }
    if (cached !== undefined) {
      return cached.v
    }

    const element = this.elements().find(e => e[keyType] === key)
    if (element) {
      cache.set(key, { v: element })
      return element
    } else {
      cache.set(key, "empty")
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

  private readonly configSubject: BehaviorSubject<Config>

  private readonly actionsCache = new Cache(() => this.getConfig().actions)

  constructor(botState: BotManager) {
    this.bot = botState
    this.configSubject = new BehaviorSubject<Config>(loadConfig())
  }

  getConfig(): Config {
    return this.configSubject.value
  }

  config(): Observable<Config> {
    return this.configSubject
  }

  variables(): Observable<VariableConfig[]> {
    return this.config()
      .pipe(
        map(c => c.variables as VariableConfig[]),
        distinctUntilChanged()
      )
  }

  elements(): Observable<ElementConfig[]> {
    return this.config()
      .pipe(
        map(c => c.elements as ElementConfig[]),
        distinctUntilChanged()
      )
  }

  getAction(id: string): ActionConfig | undefined {
    return this.actionsCache.get(id)
  }

  action(id: string): Observable<ActionConfig | undefined> {
    return this.config().pipe(
      map(c => c.actions.find(v => v.id === id)),
      distinctUntilChanged()
    )
  }

  variable(id: string): Observable<VariableConfig | undefined> {
    return this.config().pipe(
      map(c => c.variables.find(v => v.id === id)),
      distinctUntilChanged()
    )
  }

  element(id: string): Observable<ElementConfig | undefined> {
    return this.config().pipe(
      map(c => c.elements.find(v => v.id === id)),
      distinctUntilChanged()
    )
  }

  private updateConfig(updater: (config: Draft<Config>) => void): void {
    const newConfig = produce(this.getConfig(), updater)
    saveConfig(newConfig)
    this.actionsCache.reset()
    this.configSubject.next(newConfig)
  }

  addAction(): void {
    const oldIds = this.getConfig().actions
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
        type: "script",
        xpath: "",
        script: "",
        periodic: false,
        interval: 100,
        allowMultiple: false
      })
    })

    this.bot.actions.reset(newId)
  }

  updateAction(id: string, updates: Partial<ActionConfig>): void {
    const actionIndex = this.indexOf(id, this.getConfig().actions)
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
    const actionIndex = this.indexOf(id, this.getConfig().actions)
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
    const oldIds = this.getConfig().variables
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
        elementType: "xpath",
        xpath: "",
        element: "",
        regex: "",
        type: "number"
      })
    })
  }

  updateVariable(id: string, updates: Partial<VariableConfig>): void {
    const variableIndex = this.indexOf(id, this.getConfig().variables)
    if (variableIndex !== undefined) {
      this.updateConfig(config => {
        config.variables[variableIndex] = {
          ...config.variables[variableIndex],
          ...updates
        }
      })
    }
  }

  removeVariable(id: string): void {
    const variableIndex = this.indexOf(id, this.getConfig().variables)
    if (variableIndex !== undefined) {
      this.updateConfig(config => {
        config.variables.splice(variableIndex, 1)
      })
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
    const oldIds = this.getConfig().elements
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
  }

  updateElement(id: string, updates: Partial<ElementConfig>): void {
    const elementIndex = this.indexOf(id, this.getConfig().elements)
    if (elementIndex !== undefined) {
      this.updateConfig(config => {
        config.elements[elementIndex] = {
          ...config.elements[elementIndex],
          ...updates
        }
      })
    }
  }

  removeElement(id: string): void {
    const elementIndex = this.indexOf(id, this.getConfig().elements)
    if (elementIndex !== undefined) {
      this.updateConfig(config => {
        config.elements.splice(elementIndex, 1)
      })
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

function loadConfig(): Config {
  try {
    const saved = localStorage.getItem(CONFIG_STORAGE_KEY)
    if (saved !== null && saved.length > 0) {
      return fixCompatibility(JSON.parse(saved) as Config)
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

function saveConfig(config: Config): void {
  try {
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config))
  } catch (error) {
    console.error("Failed to save config to localStorage:", error)
  }
}

function fixCompatibility(oldConfig: Config): Config {
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
      if (action.periodic === undefined) {
        action.periodic = true
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

    for (const variable of config.variables) {
      if (variable.elementType === undefined) {
        variable.elementType = "xpath"
      }
      if (variable.element === undefined) {
        variable.element = ""
      }
    }
  })
}
