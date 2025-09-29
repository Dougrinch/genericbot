import type { VariableConfig } from "./Config.ts"
import { type BotManager, dispatch, useVariablesManager } from "./BotManager.ts"
import type { ElementInfo, Result } from "./XPathSubscriptionManager.ts"


export function useVariableValue(id: string): VariableValue | undefined {
  return useVariablesManager(vm => vm.getValue(id))
}


type VariableData = {
  unsubscribe: () => void
  value: VariableValue
}

type VariableValue = {
  value: number | string | undefined
  statusLine: string
  statusType: "warn" | "ok" | "err"
  elementsInfo: ElementInfo[]
}


export class VariablesManager {
  private readonly bot: BotManager
  private readonly variables: Map<string, VariableData>

  constructor(botState: BotManager) {
    this.bot = botState
    this.variables = new Map()
  }

  getValue(id: string) {
    return this.variables.get(id)?.value
  }

  init(): void {
    this.resetAll()
  }

  close() {
    for (const variable of this.variables.values()) {
      variable.unsubscribe()
    }
    this.variables.clear()
  }

  resetAll(): void {
    const uniqueIds = new Set<string>()
    for (const variable of this.bot.config.getConfig().variables.values()) {
      uniqueIds.add(variable.id)
    }
    for (const id of this.variables.keys()) {
      uniqueIds.add(id)
    }

    for (const id of uniqueIds) {
      this.reset(id)
    }
  }

  reset(id: string) {
    const data = this.variables.get(id)
    if (data) {
      data.unsubscribe()
      this.variables.delete(id)
    }

    const variable = this.bot.config.getVariable(id)
    if (variable) {
      const { unsubscribe, innerText } = this.bot.xPathSubscriptionManager.subscribeOnInnerText(variable.xpath, false, {
        onUpdate: innerText => {
          dispatch.variables.handleUpdate(id, innerText)
        }
      })

      this.variables.set(id, {
        unsubscribe,
        value: this.tryEvaluateVariableValue(variable, innerText)
      })
    }
  }

  handleUpdate(id: string, innerText: Result<string>): void {
    const variable = this.bot.config.getVariable(id)
    if (!variable) {
      throw Error(`Variable ${id} not found`)
    }

    const data = this.variables.get(id)
    if (!data) {
      throw Error(`VariableData ${id} not found`)
    }

    data.value = this.tryEvaluateVariableValue(variable, innerText)
  }

  private tryEvaluateVariableValue(variable: VariableConfig, innerText: Result<string>): VariableValue {
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
