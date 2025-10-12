import { type BotManager } from "./BotManager.ts"
import type { ActionConfig } from "./Config.ts"
import type { ElementInfo, Result } from "./XPathSubscriptionManager.ts"
import { useActionsManager } from "../BotManagerContext.tsx"


export function usePillStatus(id: string): PillValue | undefined {
  return useActionsManager(am => am.getPillValue(id))
}

export function useActionValue(id: string): ActionValue | undefined {
  return useActionsManager(am => am.getActionValue(id))
}


type ActionData = {
  unsubscribe?: () => void
  elements?: HTMLElement[]
  timerId?: number
  controller?: AbortController
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
  elementsInfo?: ElementInfo[]
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
      action.unsubscribe?.()
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
      data.unsubscribe?.()
      this.stop(data)
      this.actions.delete(id)
    }

    const action = this.bot.config.getAction(id)
    if (action) {
      if (action.type === "xpath") {
        const { unsubscribe, elements } = this.bot.xPathSubscriptionManager.subscribeOnElements(action.xpath, true, {
          onUpdate: element => {
            this.handleUpdate(action.id, element)
            this.bot.notifyListeners()
          }
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
      } else if (action.type === "script") {
        this.actions.set(id, {
          pillValue: {
            isRunning: false,
            status: "stopped"
          },
          actionValue: {
            statusType: "ok",
            statusLine: ""
          },
          timerId: undefined
        })
      }
    }
  }

  private handleUpdate(id: string, elements: Result<HTMLElement[]>): void {
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
    this.requestNextTick(action, data, true)
    data.pillValue = this.buildPillValue(data)
  }

  private handleTick(id: string) {
    const data = this.actions.get(id)
    if (!data) {
      throw Error(`ActionData ${id} not found`)
    }
    const action = this.bot.config.getAction(id)
    if (!action) {
      throw Error(`Action ${id} not found`)
    }

    const controller = new AbortController()
    const promise = this.tryRunAction(action, data, controller.signal)
    if (promise != null) {
      data.controller = controller
      void promise.then(() => {
        data.controller = undefined
        if (action.periodic) {
          if (data.pillValue.isRunning) {
            this.requestNextTick(action, data)
          }
        } else {
          this.stop(data)
          this.bot.notifyListeners()
        }
      }, reason => {
        if (reason instanceof Error) {
          console.error(reason)
        }

        if (data.pillValue.isRunning) {
          this.stop(data)
          data.pillValue.status = "auto-stopped"
          this.bot.notifyListeners()
        }
      })
    } else {
      data.pillValue.status = "waiting"
      this.requestNextTick(action, data)
    }
  }

  private requestNextTick(action: ActionConfig, data: ActionData, immediate: boolean = false) {
    data.timerId = setTimeout(() => {
      this.handleTick(action.id)
      this.bot.notifyListeners()
    }, immediate ? 0 : action.interval)
  }

  private tryRunAction(action: ActionConfig, data: ActionData, signal: AbortSignal): Promise<void> | null {
    switch (action.type) {
      case "xpath": {
        if (data.elements) {
          for (const element of data.elements) {
            element.click()
          }
          return Promise.resolve()
        } else {
          return null
        }
      }
      case "script": {
        return this.bot.scriptRunner.run(action.script, signal)
      }
    }
  }

  private stop(data: ActionData) {
    if (data.timerId !== undefined) {
      clearInterval(data.timerId)
      data.timerId = undefined
      if (data.controller) {
        data.controller.abort("Stopped")
      }
      data.controller = undefined
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
        status: data.elements || !data.unsubscribe ? "running" : "waiting"
      }
    }
  }
}
