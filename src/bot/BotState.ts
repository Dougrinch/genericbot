import { type Draft, enableMapSet, type Immutable, type WritableDraft } from "immer"
import { findElementByXPath } from "../utils/xpath.ts"
import { dispatch } from "./BotStateContext.ts"

enableMapSet()

export type BotState = Immutable<{
  config: Config
  variables: Map<string, VariableData>
}>

export type Config = Immutable<{
  entries: EntryConfig[]
  variables: VariableConfig[]
}>

export type EntryConfig = Immutable<{
  id: string
  name: string
  xpath: string
  interval: number
  allowMultiple?: boolean
  updateEvery?: number
  condition?: string
}>

export type VariableConfig = Immutable<{
  id: string
  name: string
  xpath: string
  regex: string
  type: "number" | "string"
}>

export type VariableData = Immutable<{
  value?: number | string
  statusLine?: string
  statusType?: "warn" | "ok" | "err"
  element?: HTMLElement
  observers?: MutationObserver[]
}>

export function initialBotState(): BotState {
  return {
    config: initialBotConfig(),
    variables: new Map()
  }
}

function initialBotConfig(): Config {
  return {
    entries: [
      {
        id: "entry_1",
        name: "111",
        xpath: "//button[@id='click-me']",
        interval: 1000,
        allowMultiple: false,
        updateEvery: 1000,
        condition: ""
      },
      {
        id: "entry_2",
        name: "222",
        xpath: "//div[@class='collectible']",
        interval: 2000,
        allowMultiple: true,
        updateEvery: 1500,
        condition: "score > 100"
      }
    ],
    variables: [
      {
        id: "var_1",
        name: "score",
        xpath: "//span[@id='score']",
        regex: "",
        type: "number"
      },
      {
        id: "var_2",
        name: "lives",
        xpath: "//div[@class='lives']",
        regex: "(\\d+)",
        type: "number"
      },
      {
        id: "var_3",
        name: "name",
        xpath: "//div[@id='name']",
        regex: "",
        type: "string"
      },
      {
        id: "var_4",
        name: "Gold",
        xpath: "//div[starts-with(., 'Gold')][not(.//div[starts-with(., 'Gold')])]",
        regex: "Gold: (\\d+)",
        type: "number"
      }
    ]
  }
}

export const stateUpdaters = {
  reset(botState: Draft<BotState>): void {
    Object.assign(botState, initialBotState())
    resetVariables(botState)
  },

  init(botState: Draft<BotState>): void {
    resetVariables(botState)
  },

  addEntry(botState: Draft<BotState>): void {
    const config = botState.config

    const oldIds = config.entries
      .map(e => e.id.match(/^entry_(\d+)$/))
      .filter(m => m !== null)
      .map(m => Number(m[1]))

    const newId = oldIds.length > 0
      ? `entry_${Math.max(...oldIds) + 1}`
      : "entry_1"

    config.entries.push({
      id: newId,
      name: "",
      xpath: "",
      interval: 1000
    })
  },

  updateEntry(botState: Draft<BotState>, action: { id: string, updates: Partial<EntryConfig> }): void {
    const config = botState.config

    const i = indexOf(config.entries, action.id)
    if (i !== null) {
      config.entries[i] = {
        ...config.entries[i],
        ...action.updates
      }
    }
  },

  removeEntry(botState: Draft<BotState>, action: { id: string }): void {
    const config = botState.config

    const i = indexOf(config.entries, action.id)
    if (i !== null) {
      config.entries.splice(i, 1)
    }
  },

  addVariable(botState: Draft<BotState>): void {
    const config = botState.config

    const oldIds = config.variables
      .map(v => v.id.match(/^var_(\d+)$/))
      .filter(m => m !== null)
      .map(m => Number(m[1]))

    const newId = oldIds.length > 0
      ? `var_${Math.max(...oldIds) + 1}`
      : "var_1"

    config.variables.push({
      id: newId,
      name: "",
      xpath: "",
      regex: "",
      type: "number"
    })

    resetVariable(botState, newId)
  },

  updateVariable(botState: Draft<BotState>, action: { id: string, updates: Partial<VariableConfig> }): void {
    const config = botState.config

    const i = indexOf(config.variables, action.id)
    if (i !== null) {
      config.variables[i] = {
        ...config.variables[i],
        ...action.updates
      }

      resetVariable(botState, action.id)
    }
  },

  removeVariable(botState: Draft<BotState>, action: { id: string }): void {
    const config = botState.config

    const i = indexOf(config.variables, action.id)
    if (i !== null) {
      config.variables.splice(i, 1)
      botState.variables.delete(action.id)
    }
  },

  reorderVariables(botState: Draft<BotState>, action: { orderedIds: string[] }): void {
    const config = botState.config

    // Create a map of id to variable for fast lookup
    const variableMap = new Map<string, VariableConfig>()
    for (const variable of config.variables) {
      variableMap.set(variable.id, variable)
    }

    // Reorder variables according to the provided order
    const reorderedVariables: VariableConfig[] = []
    for (const id of action.orderedIds) {
      const variable = variableMap.get(id)
      if (variable) {
        reorderedVariables.push(variable)
      }
    }

    // Replace the variables array with the reordered one
    config.variables = reorderedVariables
  },

  reevaluateVariable(botState: Draft<BotState>, action: { id: string }): void {
    const i = indexOf(botState.config.variables, action.id)
    if (i === null) {
      throw Error(`Variable ${action.id} not found`)
    }

    const variable = botState.config.variables[i]
    const data = getVariablesData(botState, variable.id)

    evaluateVariableValue(variable, data)
  },

  resetVariable(botState: Draft<BotState>, action: { id: string }): void {
    resetVariable(botState, action.id)
  }
}

function resetVariables(botState: Draft<BotState>): void {
  for (const variable of botState.config.variables) {
    resetVariable(botState, variable.id)
  }
}

function resetVariable(botState: Draft<BotState>, id: string) {
  const i = indexOf(botState.config.variables, id)
  if (i === null) {
    throw Error(`Variable ${id} not found`)
  }

  const variable = botState.config.variables[i]
  const data = getVariablesData(botState, variable.id)

  const xpathResult = findElementByXPath(variable.xpath)
  if (xpathResult.ok) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data.element = xpathResult.value as any as WritableDraft<HTMLElement>
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

function evaluateVariableValue(variable: Draft<VariableConfig>, data: Draft<VariableData>) {
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

function setupObservers(data: Draft<VariableData>, id: string) {
  clearObservers(data)

  const observers = []

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let element = data.element as any as HTMLElement

  const observer = new MutationObserver(() => {
    dispatch({ type: "reevaluateVariable", id: id })
  })
  observers.push(observer)
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
    observers.push(observer)
    observer.observe(parent, {
      attributes: true,
      childList: true,
      attributeFilter: ["style", "hidden", "class"]
    })
  }

  data.observers = observers
}

function clearObservers(data: Draft<VariableData>) {
  if (data.observers) {
    for (const observer of data.observers) {
      observer.disconnect()
    }
    data.observers = []
  }
}

function getVariablesData(botState: Draft<BotState>, id: string): Draft<VariableData> {
  const result = botState.variables.get(id)
  if (result) {
    return result
  }
  const newData = {}
  botState.variables.set(id, newData)
  return newData
}

function indexOf(entries: readonly { id: string }[], id: string): number | null {
  for (let i = 0; i < entries.length; i++) {
    if (entries[i].id === id)
      return i
  }
  return null
}
