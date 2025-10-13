import type { VariableConfig } from "./Config.ts"
import { type BotManager } from "./BotManager.ts"
import { innerTextResult } from "./XPathSubscriptionManager.ts"
import { useBotObservable } from "../BotManagerContext.tsx"
import { map, switchMap } from "rxjs/operators"
import { type Observable, of } from "rxjs"
import { error, flatMapResult, ok, type Result } from "../../utils/Result.ts"


export function useVariableValue(id: string): Result<VariableValue> | undefined {
  return useBotObservable(m => m.variables.value(id), [id])
}

export type VariableValue = number | string


export class VariablesManager {
  private readonly bot: BotManager

  constructor(botState: BotManager) {
    this.bot = botState
  }

  value(id: string): Observable<Result<VariableValue> | undefined> {
    return this.bot.config.variable(id)
      .pipe(
        switchMap(variable => {
          if (variable) {
            return this.variableValue(variable)
          } else {
            return of(undefined)
          }
        })
      )
  }

  private variableValue(variable: VariableConfig): Observable<Result<VariableValue>> {
    if (variable.elementType === "xpath") {
      return this.bot.xPathSubscriptionManager
        .innerText(variable.xpath, false)
        .pipe(map(v => this.buildValue(variable, v)))
    } else if (variable.elementType === "element") {
      return this.bot.elements.value(variable.element)
        .pipe(
          map(e => this.buildElement(e, variable.element)),
          innerTextResult(),
          map(v => this.buildValue(variable, v))
        )
    } else {
      throw new Error("Unknown variable elementType")
    }
  }

  private buildValue(variable: VariableConfig, innerText: Result<string>): Result<VariableValue> {
    if (innerText.ok) {
      return flatMapResult(innerText, text => this.evaluateVariableValue(variable, text))
    } else {
      return innerText
    }
  }

  private buildElement(element: Result<HTMLElement[]> | undefined, id: string): Result<HTMLElement> {
    if (element) {
      return flatMapResult(element, elements => {
        if (elements.length !== 1) {
          return error(`Must be exactly one element in ${id}`, "warn")
        } else {
          return ok(elements[0])
        }
      })
    } else {
      return error(`Element ${id} not found`, "err")
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
