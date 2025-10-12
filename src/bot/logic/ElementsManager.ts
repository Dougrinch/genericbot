import { type BotManager } from "./BotManager.ts"
import type { ElementInfo, Result } from "./XPathSubscriptionManager.ts"
import { useBotObservable } from "../BotManagerContext.tsx"
import { type Observable, of } from "rxjs"
import type { ElementConfig } from "./Config.ts"
import { map, switchMap } from "rxjs/operators"


export function useElementValue(id: string): ElementValue | undefined {
  return useBotObservable(m => m.elements.value(id), [id])
}


export type ElementValue = {
  value: HTMLElement[] | undefined
  statusLine: string
  statusType: "warn" | "ok" | "err"
  elementsInfo: ElementInfo[]
}


export class ElementsManager {
  private readonly bot: BotManager

  constructor(botState: BotManager) {
    this.bot = botState
  }

  value(id: string): Observable<ElementValue | undefined> {
    return this.bot.config.element(id)
      .pipe(
        switchMap(element => {
          if (element) {
            return this.elementValue(element)
          } else {
            return of(undefined)
          }
        })
      )
  }

  private elementValue(element: ElementConfig): Observable<ElementValue> {
    return this.bot.xPathSubscriptionManager
      .elements(element.xpath, element.includeInvisible, element.allowMultiple)
      .pipe(map(e => this.buildElementValue(e)))
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
