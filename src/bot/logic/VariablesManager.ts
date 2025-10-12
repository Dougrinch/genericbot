import type { VariableConfig } from "./Config.ts"
import { type BotManager } from "./BotManager.ts"
import { type ElementInfo, innerTextResult, type Result } from "./XPathSubscriptionManager.ts"
import { useBotObservable } from "../BotManagerContext.tsx"
import { map, switchMap } from "rxjs/operators"
import { type Observable, of } from "rxjs"
import type { ElementValue } from "./ElementsManager.ts"


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
        })
      )
  }

  private variableValue(variable: VariableConfig): Observable<VariableValue> {
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

  private buildElement(element: ElementValue | undefined, id: string): Result<HTMLElement> {
    if (element) {
      if (!element.value) {
        return {
          ok: false,
          error: element.statusLine !== "" ? element.statusLine : `Missing element in ${id}`,
          severity: element.statusType !== "ok" ? element.statusType : "warn",
          elementsInfo: element.elementsInfo
        }
      } else if (element.value.length !== 1) {
        return {
          ok: false,
          error: element.statusLine !== "" ? element.statusLine : `Must be exactly one element in ${id}`,
          severity: element.statusType !== "ok" ? element.statusType : "warn",
          elementsInfo: element.elementsInfo
        }
      }
      return {
        ok: true,
        value: element.value[0],
        elementsInfo: element.elementsInfo
      }
    } else {
      return {
        ok: false,
        error: `Element ${id} not found`,
        severity: "err",
        elementsInfo: []
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
