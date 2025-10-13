import type { VariableConfig } from "./Config.ts"
import { type BotManager } from "./BotManager.ts"
import { element, singleElement } from "./ElementsObserver.ts"
import { useBotObservable } from "../BotManagerContext.tsx"
import { type Observable } from "rxjs"
import { error, flatMapResult, ok, type Result, switchMapResult } from "../../utils/Result.ts"
import { innerTextResult } from "../../utils/observables/InnerText.ts"


export function useVariableValue(id: string): Result<VariableValue> {
  return useBotObservable(m => m.variables.value(id), [id])
}

export type VariableValue = number | string


export class VariablesManager {
  private readonly bot: BotManager

  constructor(botState: BotManager) {
    this.bot = botState
  }

  value(id: string): Observable<Result<VariableValue>> {
    return this.bot.config.variable(id)
      .pipe(
        switchMapResult(v => this.variableValue(v))
      )
  }

  private variableValue(variable: VariableConfig): Observable<Result<VariableValue>> {
    return this.locateElement(variable)
      .pipe(
        innerTextResult(),
        flatMapResult(innerText => this.evaluateVariableValue(variable, innerText))
      )
  }

  private locateElement(variable: VariableConfig): Observable<Result<HTMLElement>> {
    if (variable.elementType === "xpath") {
      return element(variable.xpath, false)
    } else if (variable.elementType === "element") {
      return this.bot.elements.value(variable.element)
        .pipe(singleElement())
    } else {
      throw new Error("Unknown variable elementType")
    }
  }

  private evaluateVariableValue(variable: VariableConfig, innerText: string): Result<VariableValue> {
    let textValue = innerText
    if (variable.regex) {
      try {
        const match = new RegExp(variable.regex).exec(textValue)
        if (match) {
          textValue = match[1] !== undefined ? match[1] : match[0]
        } else {
          return error(`No match for regex ${variable.regex}`, "warn")
        }
      } catch (e) {
        return error(e instanceof Error ? e.message : String(e), "err")
      }
    }

    return ok(variable.type === "number" ? Number(textValue) : textValue)
  }
}
