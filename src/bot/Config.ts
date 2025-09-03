import type { Draft, Immutable } from "immer"

export type Config = Immutable<{
  entries: EntryConfig[]
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

export function initialBotState(): Config {
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
    ]
  }
}

export const configUpdaters = {
  reset(config: Draft<Config>): void {
    Object.assign(config, initialBotState())
  },

  addEntry(config: Draft<Config>): void {
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

  updateEntry(config: Draft<Config>, action: { id: string, updates: Partial<EntryConfig> }): void {
    const i = indexOf(config.entries, action.id)
    if (i !== null) {
      config.entries[i] = {
        ...config.entries[i],
        ...action.updates
      }
    }
  },

  removeEntry(config: Draft<Config>, action: { id: string }): void {
    const i = indexOf(config.entries, action.id)
    if (i !== null) {
      config.entries.splice(i, 1)
    }
  }
}

function indexOf(entries: { id: string }[], id: string): number | null {
  for (let i = 0; i < entries.length; i++) {
    if (entries[i].id === id)
      return i
  }
  return null
}
