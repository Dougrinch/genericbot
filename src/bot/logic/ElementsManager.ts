import { type BotManager, dispatch, useElementsManager } from "./BotManager.ts"
import type { ElementInfo, Result } from "./XPathSubscriptionManager.ts"


export function useElementValue(id: string): ElementValue | undefined {
  return useElementsManager(em => em.getValue(id))
}


type ElementData = {
  unsubscribe: () => void
  value: ElementValue
}

export type ElementValue = {
  value: HTMLElement[] | undefined
  statusLine: string
  statusType: "warn" | "ok" | "err"
  elementsInfo: ElementInfo[]
}


export class ElementsManager {
  private readonly bot: BotManager
  private readonly elements: Map<string, ElementData>

  constructor(botState: BotManager) {
    this.bot = botState
    this.elements = new Map()
  }

  getValue(id: string) {
    return this.elements.get(id)?.value
  }

  init(): void {
    this.resetAll()
  }

  close() {
    for (const element of this.elements.values()) {
      element.unsubscribe()
    }
    this.elements.clear()
  }

  resetAll(): void {
    const uniqueIds = new Set<string>()
    for (const element of this.bot.config.getConfig().elements.values()) {
      uniqueIds.add(element.id)
    }
    for (const id of this.elements.keys()) {
      uniqueIds.add(id)
    }

    for (const id of uniqueIds) {
      this.reset(id)
    }
  }

  reset(id: string) {
    const data = this.elements.get(id)
    if (data) {
      data.unsubscribe()
      this.elements.delete(id)
    }

    const element = this.bot.config.getElement(id)
    if (element) {
      const { unsubscribe, elements } = this.bot.xPathSubscriptionManager.subscribeOnElements(element.xpath, {
        onUpdate: elements => dispatch.elements.handleUpdate(id, elements)
      }, element.allowMultiple)

      this.elements.set(id, {
        unsubscribe,
        value: this.buildElementValue(elements)
      })
    }
  }

  handleUpdate(id: string, elements: Result<HTMLElement[]>): void {
    const element = this.bot.config.getElement(id)
    if (!element) {
      throw Error(`Element ${id} not found`)
    }

    const data = this.elements.get(id)
    if (!data) {
      throw Error(`ElementData ${id} not found`)
    }

    data.value = this.buildElementValue(elements)
  }

  private buildElementValue(elements: Result<HTMLElement[]>): ElementValue {
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
