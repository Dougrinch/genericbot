import { type BotManager } from "./BotManager.ts"
import { useBotObservable } from "../BotManagerContext.tsx"
import { type Observable, of } from "rxjs"
import type { ElementConfig } from "./Config.ts"
import { switchMap } from "rxjs/operators"
import type { Result } from "../../utils/Result.ts"


export function useElementValue(id: string): Result<HTMLElement[]> | undefined {
  return useBotObservable(m => m.elements.value(id), [id])
}


export class ElementsManager {
  private readonly bot: BotManager

  constructor(botState: BotManager) {
    this.bot = botState
  }

  value(id: string): Observable<Result<HTMLElement[]> | undefined> {
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

  private elementValue(element: ElementConfig): Observable<Result<HTMLElement[]>> {
    return this.bot.xPathSubscriptionManager
      .elements(element.xpath, element.includeInvisible, element.allowMultiple)
  }
}
