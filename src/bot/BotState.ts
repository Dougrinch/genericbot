import { type Draft, enableMapSet, type Immutable } from "immer"
import { findElementByXPath } from "../utils/xpath.ts"

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

    updateVariableValue(botState, newId)
  },

  updateVariable(botState: Draft<BotState>, action: { id: string, updates: Partial<VariableConfig> }): void {
    const config = botState.config

    const i = indexOf(config.variables, action.id)
    if (i !== null) {
      config.variables[i] = {
        ...config.variables[i],
        ...action.updates
      }

      updateVariableValue(botState, action.id)
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
  }
}

function updateVariableValue(botState: Draft<BotState>, id: string) {
  const i = indexOf(botState.config.variables, id)
  if (!i) {
    throw Error(`Variable ${id} not found`)
  }

  const variable = botState.config.variables[i]
  const data = getVariablesData(botState, id)

  try {
    const element = findElementByXPath(variable.xpath)
    let textValue = element.innerText
    if (variable.regex) {
      const match = new RegExp(variable.regex).exec(textValue)
      if (match) {
        textValue = match[1] !== undefined ? match[1] : match[0]
      }
    }

    if (variable.type == "number") {
      data.value = Number(textValue)
    } else {
      data.value = textValue
    }
  } catch (e) {
    data.value = undefined
    console.error(e)
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
