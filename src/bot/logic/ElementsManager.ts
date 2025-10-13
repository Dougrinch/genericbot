import { type BotManager } from "./BotManager.ts"
import { useBotObservable } from "../BotManagerContext.tsx"
import { type Observable } from "rxjs"
import type { ElementConfig } from "./Config.ts"
import { type Result, switchMapResult } from "../../utils/Result.ts"


export function useElementValue(id: string): Result<HTMLElement[]> {
  return useBotObservable(m => m.elements.value(id), [id])
}


export class ElementsManager {
  private readonly bot: BotManager

  constructor(botState: BotManager) {
    this.bot = botState
  }

  value(id: string): Observable<Result<HTMLElement[]>> {
    return this.bot.config.element(id)
      .pipe(
        switchMapResult(element => this.elementValue(element))
      )
  }

  private elementValue(element: ElementConfig): Observable<Result<HTMLElement[]>> {
    return this.bot.xPathSubscriptionManager
      .elements(element.xpath, element.includeInvisible, element.allowMultiple)
  }
}
