import { type BotManager, dispatch, useEntriesManager } from "./BotManager.ts"
import type { EntryConfig } from "./Config.ts"
import type { Try } from "../../utils/xpath.ts"


export function useEntryStatus(id: string): [boolean | undefined, "stopped" | "running" | "auto-stopped" | "waiting" | undefined] {
  return useEntriesManager(em => {
    const value = em.getValue(id)
    return [value?.isRunning, value?.status]
  })
}


type EntryData = {
  unsubscribe: () => void
  element?: HTMLElement
  timerId?: number
  value: EntryValue
}

type EntryValue = {
  isRunning: boolean
  status: "stopped" | "running" | "auto-stopped" | "waiting"
}


export class EntriesManager {
  private readonly bot: BotManager
  private readonly entries: Map<string, EntryData>

  constructor(botState: BotManager) {
    this.bot = botState
    this.entries = new Map()
  }

  getValue(id: string) {
    return this.entries.get(id)?.value
  }

  init() {
    this.resetAll()
  }

  close() {
    for (const entry of this.entries.values()) {
      this.stop(entry)
    }
    this.entries.clear()
  }

  resetAll() {
    const uniqueIds = new Set<string>()
    for (const entry of this.bot.config.getConfig().entries.values()) {
      uniqueIds.add(entry.id)
    }
    for (const id of this.entries.keys()) {
      uniqueIds.add(id)
    }

    for (const id of uniqueIds) {
      this.reset(id)
    }
  }

  reset(id: string) {
    const data = this.entries.get(id)
    if (data) {
      data.unsubscribe()
      this.stop(data)
      this.entries.delete(id)
    }

    const entry = this.bot.config.getConfig().entries.get(id)
    if (entry) {
      const { unsubscribe, element } = this.bot.xPathSubscriptionManager.subscribeOnElement(entry.xpath, {
        onUpdate: element => dispatch.entries.handleUpdate(id, element)
      })

      this.entries.set(id, {
        unsubscribe,
        element: element.ok ? element.value : undefined,
        value: {
          isRunning: false,
          status: "stopped"
        }
      })
    }
  }

  handleUpdate(id: string, element: Try<HTMLElement>): void {
    const data = this.entries.get(id)
    if (!data) {
      throw Error(`EntryData ${id} not found`)
    }

    data.element = element.ok ? element.value : undefined
  }

  toggle(id: string) {
    const data = this.entries.get(id)
    if (!data) {
      throw Error(`EntryData ${id} not found`)
    }

    if (data.value.isRunning) {
      this.stop(data)
    } else {
      const entry = this.bot.config.getConfig().entries.get(id)
      if (!entry) {
        throw Error(`Entry ${id} not found`)
      }

      this.start(entry, data)
    }
  }

  private start(entry: EntryConfig, data: EntryData) {
    data.value.isRunning = true
    data.value.status = "running"

    data.timerId = setTimeout(() => {
      dispatch.entries.handleTick(entry.id, entry.interval)
    }, 0)
  }

  handleTick(id: string, interval: number) {
    const data = this.entries.get(id)
    if (!data) {
      throw Error(`EntryData ${id} not found`)
    }

    if (data.element) {
      data.element.click()
      data.value.status = "running"
    } else {
      data.value.status = "waiting"
    }

    data.timerId = setTimeout(() => {
      dispatch.entries.handleTick(id, interval)
    }, interval)
  }

  private stop(data: EntryData) {
    if (data.timerId !== undefined) {
      clearInterval(data.timerId)
      data.timerId = undefined
    }
    data.value.isRunning = false
    data.value.status = "stopped"
  }
}
