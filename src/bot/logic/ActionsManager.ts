import { type BotManager, dispatch, useActionsManager } from "./BotManager.ts"
import type { ActionConfig } from "./Config.ts"
import type { ElementInfo, Result } from "./XPathSubscriptionManager.ts"


export function usePillStatus(id: string): PillValue | undefined {
  return useActionsManager(am => am.getPillValue(id))
}

export function useActionValue(id: string): ActionValue | undefined {
  return useActionsManager(am => am.getActionValue(id))
}


type ActionData = {
  unsubscribe: () => void
  elements?: HTMLElement[]
  timerId?: number
  pillValue: PillValue
  actionValue: ActionValue
}

type PillValue = {
  isRunning: boolean
  status: "stopped" | "running" | "auto-stopped" | "waiting"
}

type ActionValue = {
  statusLine: string
  statusType: "warn" | "ok" | "err"
  elementsInfo: ElementInfo[]
}


export class ActionsManager {
  private readonly bot: BotManager
  private readonly actions: Map<string, ActionData>

  constructor(botState: BotManager) {
    this.bot = botState
    this.actions = new Map()
  }

  getPillValue(id: string) {
    return this.actions.get(id)?.pillValue
  }

  getActionValue(id: string) {
    return this.actions.get(id)?.actionValue
  }

  init() {
    this.resetAll()
  }

  close() {
    for (const action of this.actions.values()) {
      action.unsubscribe()
      this.stop(action)
    }
    this.actions.clear()
  }

  resetAll() {
    const uniqueIds = new Set<string>()
    for (const action of this.bot.config.getConfig().actions.values()) {
      uniqueIds.add(action.id)
    }
    for (const id of this.actions.keys()) {
      uniqueIds.add(id)
    }

    for (const id of uniqueIds) {
      this.reset(id)
    }
  }

  reset(id: string) {
    const data = this.actions.get(id)
    if (data) {
      data.unsubscribe()
      this.stop(data)
      this.actions.delete(id)
    }

    const action = this.bot.config.getAction(id)
    if (action) {
      const { unsubscribe, elements } = this.bot.xPathSubscriptionManager.subscribeOnElements(action.xpath, {
        onUpdate: element => dispatch.actions.handleUpdate(action.id, element)
      }, action.allowMultiple)

      this.actions.set(id, {
        unsubscribe,
        elements: elements.ok ? elements.value : undefined,
        pillValue: {
          isRunning: false,
          status: "stopped"
        },
        actionValue: {
          statusType: elements.ok ? "ok" : elements.severity,
          statusLine: elements.ok ? "" : elements.error,
          elementsInfo: elements.elementsInfo
        },
        timerId: undefined
      })
    }
  }

  handleUpdate(id: string, elements: Result<HTMLElement[]>): void {
    const data = this.actions.get(id)
    if (!data) {
      throw Error(`ActionData ${id} not found`)
    }

    data.elements = elements.ok ? elements.value : undefined
    data.pillValue = this.buildPillValue(data)
    data.actionValue = {
      statusType: elements.ok ? "ok" : elements.severity,
      statusLine: elements.ok ? "" : elements.error,
      elementsInfo: elements.elementsInfo
    }
  }

  toggle(id: string) {
    const data = this.actions.get(id)
    if (!data) {
      throw Error(`ActionData ${id} not found`)
    }

    if (data.pillValue.isRunning) {
      this.stop(data)
    } else {
      const action = this.bot.config.getAction(id)
      if (!action) {
        throw Error(`Action ${id} not found`)
      }

      this.start(action, data)
    }
  }

  private start(action: ActionConfig, data: ActionData) {
    data.timerId = setTimeout(() => {
      dispatch.actions.handleTick(action.id, action.interval)
    }, 0)
    data.pillValue = this.buildPillValue(data)
  }

  handleTick(id: string, interval: number) {
    const data = this.actions.get(id)
    if (!data) {
      throw Error(`ActionData ${id} not found`)
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
      dispatch.actions.handleTick(id, interval)
    }, interval)
  }

  private stop(data: ActionData) {
    if (data.timerId !== undefined) {
      clearInterval(data.timerId)
      data.timerId = undefined
    }
    data.pillValue = this.buildPillValue(data)
  }

  private buildPillValue(data: ActionData): PillValue {
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
