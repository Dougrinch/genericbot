import { type BotManager, dispatch, useEntriesManager } from "./BotManager.ts"
import type { EntryConfig } from "./Config.ts"
import type { Try } from "../../utils/xpath.ts"


export function usePillStatus(id: string): [boolean | undefined, "stopped" | "running" | "auto-stopped" | "waiting" | undefined] {
  return useEntriesManager(em => {
    const value = em.getPillValue(id)
    return [value?.isRunning, value?.status]
  })
}

export function useEntryValue(id: string): [string | undefined, "warn" | "ok" | "err" | undefined] {
  return useEntriesManager(em => {
    const value = em.getEntryValue(id)
    return [value?.statusLine, value?.statusType]
  })
}


type EntryData = {
  unsubscribe: () => void
  elements?: HTMLElement[]
  timerId?: number
  pillValue: PillValue
  entryValue: EntryValue
}

type PillValue = {
  isRunning: boolean
  status: "stopped" | "running" | "auto-stopped" | "waiting"
}

type EntryValue = {
  statusLine: string
  statusType: "warn" | "ok" | "err"
}


export class EntriesManager {
  private readonly bot: BotManager
  private readonly entries: Map<string, EntryData>

  constructor(botState: BotManager) {
    this.bot = botState
    this.entries = new Map()
  }

  getPillValue(id: string) {
    return this.entries.get(id)?.pillValue
  }

  getEntryValue(id: string) {
    return this.entries.get(id)?.entryValue
  }

  init() {
    this.resetAll()
  }

  close() {
    for (const entry of this.entries.values()) {
      entry.unsubscribe()
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

    const entry = this.bot.config.getEntry(id)
    if (entry) {
      const { unsubscribe, elements } = this.bot.xPathSubscriptionManager.subscribeOnElements(entry.xpath, {
        onUpdate: element => dispatch.entries.handleUpdate(entry.id, element)
      }, entry.allowMultiple)

      this.entries.set(id, {
        unsubscribe,
        elements: elements.ok ? elements.value : undefined,
        pillValue: {
          isRunning: false,
          status: "stopped"
        },
        entryValue: {
          statusType: elements.ok ? "ok" : elements.severity,
          statusLine: elements.ok ? "" : elements.error
        },
        timerId: undefined
      })
    }
  }

  handleUpdate(id: string, element: Try<HTMLElement[]>): void {
    const data = this.entries.get(id)
    if (!data) {
      throw Error(`EntryData ${id} not found`)
    }

    data.elements = element.ok ? element.value : undefined
    data.pillValue = this.buildPillValue(data)
    data.entryValue = {
      statusType: element.ok ? "ok" : element.severity,
      statusLine: element.ok ? "" : element.error
    }
  }

  toggle(id: string) {
    const data = this.entries.get(id)
    if (!data) {
      throw Error(`EntryData ${id} not found`)
    }

    if (data.pillValue.isRunning) {
      this.stop(data)
    } else {
      const entry = this.bot.config.getEntry(id)
      if (!entry) {
        throw Error(`Entry ${id} not found`)
      }

      this.start(entry, data)
    }
  }

  private start(entry: EntryConfig, data: EntryData) {
    data.timerId = setTimeout(() => {
      dispatch.entries.handleTick(entry.id, entry.interval)
    }, 0)
    data.pillValue = this.buildPillValue(data)
  }

  handleTick(id: string, interval: number) {
    const data = this.entries.get(id)
    if (!data) {
      throw Error(`EntryData ${id} not found`)
    }

    if (data.elements) {
      for (const element of data.elements) {
        element.click()
      }
      data.pillValue.status = "running"
    } else {
      data.pillValue.status = "waiting"
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
    data.pillValue = this.buildPillValue(data)
  }

  private buildPillValue(data: EntryData): PillValue {
    if (data.timerId === undefined) {
      return {
        isRunning: false,
        status: "stopped"
      }
    } else {
      return {
        isRunning: true,
        status: data.elements ? "running" : "waiting"
      }
    }
  }
}
