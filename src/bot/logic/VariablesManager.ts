import type { VariableConfig } from "./Config.ts"
import { type BotManager } from "./BotManager.ts"
import type { ElementInfo, Result } from "./XPathSubscriptionManager.ts"
import { useBotObservable } from "../BotManagerContext.tsx"
import { map, switchMap } from "rxjs/operators"
import { type Observable, of, shareReplay } from "rxjs"


export function useVariableValue(id: string): VariableValue | undefined {
  return useBotObservable(m => m.variables.value(id), [id])
}

export type VariableValue = {
  value: number | string | undefined
  statusLine: string
  statusType: "warn" | "ok" | "err"
  elementsInfo: ElementInfo[]
}


export class VariablesManager {
  private readonly bot: BotManager

  constructor(botState: BotManager) {
    this.bot = botState
  }

  value(id: string): Observable<VariableValue | undefined> {
    return this.bot.config.variable(id)
      .pipe(
        switchMap(variable => {
          if (variable) {
            return this.variableValue(variable)
          } else {
            return of(undefined)
          }
        }),
        shareReplay(1)
      )
  }

  private variableValue(variable: VariableConfig): Observable<VariableValue> {
    return this.bot.xPathSubscriptionManager
      .innerText(variable.xpath, false)
      .pipe(map(v => this.buildValue(variable, v)))
  }

  private buildValue(variable: VariableConfig, innerText: Result<string>): VariableValue {
    if (innerText.ok) {
      return this.evaluateVariableValue(variable, innerText.value, innerText.elementsInfo)
    } else {
      return {
        value: undefined,
        statusType: innerText.severity,
        statusLine: innerText.error,
        elementsInfo: innerText.elementsInfo
      }
    }
  }

  private evaluateVariableValue(variable: VariableConfig, innerText: string, elementsInfo: ElementInfo[]): VariableValue {
    let textValue = innerText
    if (variable.regex) {
      try {
        const match = new RegExp(variable.regex).exec(textValue)
        if (match) {
          textValue = match[1] !== undefined ? match[1] : match[0]
        } else {
          return {
            value: undefined,
            statusType: "warn",
            statusLine: `No match for regex ${variable.regex}`,
            elementsInfo: elementsInfo
          }
        }
      } catch (error) {
        return {
          value: undefined,
          statusType: "err",
          statusLine: error instanceof Error ? error.message : String(error),
          elementsInfo: elementsInfo
        }
      }
    }

    return {
      value: variable.type === "number" ? Number(textValue) : textValue,
      statusType: "ok",
      statusLine: "",
      elementsInfo: elementsInfo
    }
  }
}
