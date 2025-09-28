import { type BotManager, dispatch, useButtonsManager } from "./BotManager.ts"
import type { ElementInfo, Result } from "./XPathSubscriptionManager.ts"


export function useButtonValue(id: string): ButtonValue | undefined {
  return useButtonsManager(bm => bm.getValue(id))
}


type ButtonData = {
  unsubscribe: () => void
  value: ButtonValue
}

export type ButtonValue = {
  value: HTMLElement[] | undefined
  statusLine: string
  statusType: "warn" | "ok" | "err"
  elementsInfo: ElementInfo[]
}


export class ButtonsManager {
  private readonly bot: BotManager
  private readonly buttons: Map<string, ButtonData>

  constructor(botState: BotManager) {
    this.bot = botState
    this.buttons = new Map()
  }

  getValue(id: string) {
    return this.buttons.get(id)?.value
  }

  init(): void {
    this.resetAll()
  }

  close() {
    for (const button of this.buttons.values()) {
      button.unsubscribe()
    }
    this.buttons.clear()
  }

  resetAll(): void {
    const uniqueIds = new Set<string>()
    for (const button of this.bot.config.getConfig().buttons.values()) {
      uniqueIds.add(button.id)
    }
    for (const id of this.buttons.keys()) {
      uniqueIds.add(id)
    }

    for (const id of uniqueIds) {
      this.reset(id)
    }
  }

  reset(id: string) {
    const data = this.buttons.get(id)
    if (data) {
      data.unsubscribe()
      this.buttons.delete(id)
    }

    const button = this.bot.config.getButton(id)
    if (button) {
      const { unsubscribe, elements } = this.bot.xPathSubscriptionManager.subscribeOnElements(button.xpath, {
        onUpdate: elements => dispatch.buttons.handleUpdate(id, elements)
      }, button.allowMultiple)

      this.buttons.set(id, {
        unsubscribe,
        value: this.buildButtonValue(elements)
      })
    }
  }

  handleUpdate(id: string, elements: Result<HTMLElement[]>): void {
    const button = this.bot.config.getButton(id)
    if (!button) {
      throw Error(`Button ${id} not found`)
    }

    const data = this.buttons.get(id)
    if (!data) {
      throw Error(`ButtonData ${id} not found`)
    }

    data.value = this.buildButtonValue(elements)
  }

  private buildButtonValue(elements: Result<HTMLElement[]>): ButtonValue {
    if (elements.ok) {
      return {
        value: elements.value,
        statusType: "ok",
        statusLine: "",
        elementsInfo: elements.elementsInfo
      }
    } else {
      return {
        value: undefined,
        statusType: elements.severity,
        statusLine: elements.error,
        elementsInfo: elements.elementsInfo
      }
    }
  }
}
