import type { VariableConfig } from "./Config.ts"
import { findElementByXPath } from "../../utils/xpath.ts"
import { type BotManager, dispatch, useVariablesManager } from "./BotManager.ts"


export function useVariableValue(id: string): [number | string | undefined, string | undefined, "warn" | "ok" | "err" | undefined] {
  return useVariablesManager(vm => {
    const value = vm.getValue(id)
    return [value.value, value.statusLine, value.statusType]
  })
}


type VariableData = {
  value?: number | string
  statusLine?: string
  statusType?: "warn" | "ok" | "err"
  element?: HTMLElement
  isVisible?: boolean
  observers?: MutationObserver[]
}

export class VariablesManager {
  private readonly bot: BotManager
  private readonly variables: Map<string, VariableData>
  private rootObserver?: MutationObserver

  constructor(botState: BotManager) {
    this.bot = botState
    this.variables = new Map()
  }

  getValue(id: string) {
    const data = this.variables.get(id)
    return {
      value: data?.value,
      statusLine: data?.statusLine,
      statusType: data?.statusType
    }
  }

  init(): void {
    this.resetAll()

    this.rootObserver = new MutationObserver(mutations => {
      for (const mutation of mutations) {
        if (mutation.addedNodes.length > 0) {
          dispatch.variables.resetNotFound()
          return
        }
      }
    })
    this.rootObserver.observe(document.body, {
      childList: true,
      subtree: true
    })
  }

  close() {
    this.clearAllObservers()
    this.rootObserver?.disconnect()
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

  resetNotFound() {
    for (const [id, data] of this.variables) {
      if (data.element === undefined) {
        this.reset(id)
      }
    }
  }

  reset(id: string) {
    const variable = this.bot.config.getConfig().variables.get(id)
    if (!variable) {
      const data = this.variables.get(id)
      if (data) {
        this.clearObservers(data)
        this.variables.delete(id)
      }
    } else {
      const data = this.getOrCreateData(id)

      const xpathResult = findElementByXPath(variable.xpath)
      if (xpathResult.ok) {
        data.element = xpathResult.value
        data.isVisible = data.element.checkVisibility()
        this.setupObservers(data, variable.id)
        this.evaluateVariableValue(variable, data)
      } else {
        data.element = undefined
        this.clearObservers(data)
        data.value = undefined
        data.statusType = "err"
        data.statusLine = xpathResult.error
      }
    }
  }

  updateVisibility(id: string): void {
    const data = this.getOrCreateData(id)

    const oldIsVisible = data.isVisible!
    data.isVisible = data.element!.checkVisibility()
    if (oldIsVisible !== data.isVisible) {
      this.reevaluateVariable(id)
    }
  }

  reevaluateVariable(id: string): void {
    const variable = this.bot.config.getConfig().variables.get(id)
    if (!variable) {
      throw Error(`Variable ${id} not found`)
    }
    const data = this.getOrCreateData(id)

    this.evaluateVariableValue(variable, data)
  }

  private evaluateVariableValue(variable: VariableConfig, data: VariableData) {
    if (data.isVisible !== true) {
      data.value = undefined
      data.statusType = "warn"
      data.statusLine = `Element hidden`
      return
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const element = data.element as any as HTMLElement
    let textValue = element.innerText
    if (variable.regex) {
      const match = new RegExp(variable.regex).exec(textValue)
      if (match) {
        textValue = match[1] !== undefined ? match[1] : match[0]
      } else {
        data.value = undefined
        data.statusType = "warn"
        data.statusLine = `No match for regex ${variable.regex}`
        return
      }
    }

    data.statusType = "ok"
    data.statusLine = ""

    if (variable.type === "number") {
      data.value = Number(textValue)
    } else {
      data.value = textValue
    }
  }

  private setupObservers(data: VariableData, id: string) {
    this.clearObservers(data)

    const observers = []

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let element = data.element as any as HTMLElement

    const observer = new MutationObserver(mutations => {
      for (const mutation of mutations) {
        if (mutation.type === "childList" || mutation.type === "characterData") {
          dispatch.variables.reevaluateVariable(id)
        } else if (mutation.type === "attributes") {
          dispatch.variables.updateVisibility(id)
        }
      }
    })
    observers.push(observer)
    observer.observe(element, {
      childList: true,
      characterData: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["style", "hidden", "class"]
    })

    while (element.parentElement != null) {
      const child = element
      const parent = element.parentElement
      element = element.parentElement

      const observer = new MutationObserver(mutations => {
        for (const mutation of mutations) {
          if (mutation.type === "attributes") {
            dispatch.variables.updateVisibility(id)
          } else if (mutation.type === "childList") {
            for (const removedNode of mutation.removedNodes) {
              if (removedNode === child) {
                dispatch.variables.reset(id)
                return
              }
            }
          }
        }
      })
      observers.push(observer)
      observer.observe(parent, {
        attributes: true,
        childList: true,
        attributeFilter: ["style", "hidden", "class"]
      })
    }

    data.observers = observers
  }

  private clearAllObservers() {
    for (const data of this.variables.values()) {
      this.clearObservers(data)
    }
  }

  private clearObservers(data: VariableData) {
    if (data.observers) {
      for (const observer of data.observers) {
        observer.disconnect()
      }
      data.observers = []
    }
  }

  private getOrCreateData(id: string): VariableData {
    const result = this.variables.get(id)
    if (result) {
      return result
    }
    const newData = {}
    this.variables.set(id, newData)
    return newData
  }
}
