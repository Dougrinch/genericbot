import { enableMapSet } from "immer"
import { findElementByXPath } from "../utils/xpath.ts"
import { dispatch } from "./BotStateHooks.tsx"
import { markMutable, type MarkMutable } from "../utils/immutables.ts"

enableMapSet()

export type BotState = MarkMutable<{
  config: Config
  variables: Map<string, VariableData>
}>

export type Config = MarkMutable<{
  entries: Map<string, EntryConfig>
  variables: Map<string, VariableConfig>
}>

export type EntryConfig = MarkMutable<{
  id: string
  name: string
  xpath: string
  interval: number
  allowMultiple?: boolean
  updateEvery?: number
  condition?: string
}>

export type VariableConfig = MarkMutable<{
  id: string
  name: string
  xpath: string
  regex: string
  type: "number" | "string"
}>

export type VariableData = MarkMutable<{
  value?: number | string
  statusLine?: string
  statusType?: "warn" | "ok" | "err"
  element?: HTMLElement
  observers?: MutationObserver[]
}>

export function initialBotState(): BotState {
  return markMutable({
    config: initialBotConfig(),
    variables: new Map()
  })
}

function initialBotConfig(): Config {
  return markMutable({
    entries: new Map([
      ["entry_1", {
        id: "entry_1",
        name: "111",
        xpath: "//button[@id='click-me']",
        interval: 1000,
        allowMultiple: false,
        updateEvery: 1000,
        condition: ""
      }],
      ["entry_2", {
        id: "entry_2",
        name: "222",
        xpath: "//div[@class='collectible']",
        interval: 2000,
        allowMultiple: true,
        updateEvery: 1500,
        condition: "score > 100"
      }]
    ]),
    variables: new Map([
      ["var_1", {
        id: "var_1",
        name: "score",
        xpath: "//span[@id='score']",
        regex: "",
        type: "number"
      }],
      ["var_2", {
        id: "var_2",
        name: "lives",
        xpath: "//div[@class='lives']",
        regex: "(\\d+)",
        type: "number"
      }],
      ["var_3", {
        id: "var_3",
        name: "name",
        xpath: "//div[@id='name']",
        regex: "",
        type: "string"
      }],
      ["var_4", {
        id: "var_4",
        name: "Gold",
        xpath: "//div[starts-with(., 'Gold')][not(.//div[starts-with(., 'Gold')])]",
        regex: "Gold: (\\d+)",
        type: "number"
      }]
    ])
  })
}

export const stateUpdaters = {
  reset(botState: BotState): void {
    Object.assign(botState, initialBotState())
    resetVariables(botState)
  },

  init(botState: BotState): void {
    resetVariables(botState)
  },

  stop(botState: BotState): void {
    for (const data of botState.variables.values()) {
      clearObservers(data)
    }
  },

  addEntry(botState: BotState): void {
    const config = botState.config

    const oldIds = Array.from(config.entries.values())
      .map(e => e.id.match(/^entry_(\d+)$/))
      .filter(m => m !== null)
      .map(m => Number(m[1]))

    const newId = oldIds.length > 0
      ? `entry_${Math.max(...oldIds) + 1}`
      : "entry_1"

    config.entries.set(newId, markMutable({
      id: newId,
      name: "",
      xpath: "",
      interval: 1000
    }))
  },

  updateEntry(botState: BotState, action: { id: string, updates: Partial<EntryConfig> }): void {
    const config = botState.config
    const currentEntry = config.entries.get(action.id)
    if (currentEntry) {
      config.entries.set(action.id, {
        ...currentEntry,
        ...action.updates
      })
    }
  },

  removeEntry(botState: BotState, action: { id: string }): void {
    const config = botState.config
    config.entries.delete(action.id)
  },

  addVariable(botState: BotState): void {
    const config = botState.config

    const oldIds = Array.from(config.variables.values())
      .map(v => v.id.match(/^var_(\d+)$/))
      .filter(m => m !== null)
      .map(m => Number(m[1]))

    const newId = oldIds.length > 0
      ? `var_${Math.max(...oldIds) + 1}`
      : "var_1"

    config.variables.set(newId, markMutable({
      id: newId,
      name: "",
      xpath: "",
      regex: "",
      type: "number"
    }))

    resetVariable(botState, newId)
  },

  updateVariable(botState: BotState, action: { id: string, updates: Partial<VariableConfig> }): void {
    const config = botState.config
    const currentVariable = config.variables.get(action.id)
    if (currentVariable) {
      config.variables.set(action.id, {
        ...currentVariable,
        ...action.updates
      })

      resetVariable(botState, action.id)
    }
  },

  removeVariable(botState: BotState, action: { id: string }): void {
    const config = botState.config
    config.variables.delete(action.id)
    botState.variables.delete(action.id)
  },

  reorderVariables(botState: BotState, action: { orderedIds: string[] }): void {
    const config = botState.config

    // Reorder variables according to the provided order
    const reorderedVariables = new Map<string, VariableConfig>()
    for (const id of action.orderedIds) {
      const variable = config.variables.get(id)
      if (variable) {
        reorderedVariables.set(id, variable)
      }
    }

    // Replace the variable array with the reordered one
    config.variables = reorderedVariables
  },

  reevaluateVariable(botState: BotState, action: { id: string }): void {
    const variable = botState.config.variables.get(action.id)
    if (!variable) {
      throw Error(`Variable ${action.id} not found`)
    }
    const data = getVariablesData(botState, variable.id)

    evaluateVariableValue(variable, data)
  },

  resetVariable(botState: BotState, action: { id: string }): void {
    resetVariable(botState, action.id)
  }
}

function resetVariables(botState: BotState): void {
  for (const variable of botState.config.variables.values()) {
    resetVariable(botState, variable.id)
  }
}

function resetVariable(botState: BotState, id: string) {
  const variable = botState.config.variables.get(id)
  if (!variable) {
    throw Error(`Variable ${id} not found`)
  }
  const data = getVariablesData(botState, variable.id)

  const xpathResult = findElementByXPath(variable.xpath)
  if (xpathResult.ok) {
    data.element = markMutable(xpathResult.value)
    setupObservers(data, variable.id)
    evaluateVariableValue(variable, data)
  } else {
    data.element = undefined
    clearObservers(data)
    data.value = undefined
    data.statusType = "err"
    data.statusLine = xpathResult.error
  }
}

function evaluateVariableValue(variable: VariableConfig, data: VariableData) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const element = data.element as any as HTMLElement
  let textValue = element.innerText
  if (variable.regex) {
    const match = new RegExp(variable.regex).exec(textValue)
    if (match) {
      textValue = match[1] !== undefined ? match[1] : match[0]
    }
  }

  data.statusType = "ok"
  data.statusLine = ""

  if (variable.type === "number") {
    data.value = Number(textValue)
  } else {
    data.value = textValue
  }
}

function setupObservers(data: VariableData, id: string) {
  clearObservers(data)

  const observers = []

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let element = data.element as any as HTMLElement

  const observer = new MutationObserver(() => {
    dispatch({ type: "reevaluateVariable", id: id })
  })
  observers.push(markMutable(observer))
  observer.observe(element, {
    childList: true,
    characterData: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["style", "hidden", "class"]
  })

  while (element.parentElement != null) {
    const child = element
    const parent = element.parentElement
    element = element.parentElement

    const observer = new MutationObserver(mutations => {
      for (const mutation of mutations) {
        if (mutation.type === "attributes") {
          //TODO don't need to revaluate xpath, just handle visibility change
          dispatch({ type: "resetVariable", id: id })
          return
        } else if (mutation.type === "childList") {
          for (const removedNode of mutation.removedNodes) {
            if (removedNode === child) {
              //TODO what if the node comes back?
              dispatch({ type: "resetVariable", id: id })
              return
            }
          }
        }
      }
    })
    observers.push(markMutable(observer))
    observer.observe(parent, {
      attributes: true,
      childList: true,
      attributeFilter: ["style", "hidden", "class"]
    })
  }

  data.observers = observers
}

function clearObservers(data: VariableData) {
  if (data.observers) {
    for (const observer of data.observers) {
      observer.disconnect()
    }
    data.observers = []
  }
}

function getVariablesData(botState: BotState, id: string): VariableData {
  const result = botState.variables.get(id)
  if (result) {
    return result
  }
  const newData = markMutable({})
  botState.variables.set(id, newData)
  return newData
}
