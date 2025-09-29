import { ElementSubscriptionManager } from "./ElementSubscriptionManager.ts"
import { findElementsByXPath, type Try } from "../../utils/xpath.ts"

type XPathSubscription = {
  readonly xpath: string
  readonly callbacks: Callback[]

  error?: string
  severity?: "warn" | "err"
  elements: Map<HTMLElement, ResolvedElement>
}

type ResolvedElement = {
  element: HTMLElement
  unsubscribeFromElement: () => void

  innerText: string
  isVisible: boolean
}

type Callback = {
  type: "innerText"
  includeInvisible: boolean
  onUpdate: (innerText: Result<string>) => void
} | {
  type: "element"
  includeInvisible: boolean
  onUpdate: (element: Result<HTMLElement>) => void
} | {
  type: "elements"
  includeInvisible: boolean
  onUpdate: (element: Result<HTMLElement[]>) => void
}

export type InnerTextChangeCallback = {
  onUpdate: (innerText: Result<string>) => void
}

export type ElementChangeCallback = {
  onUpdate: (element: Result<HTMLElement>) => void
}

export type ElementsChangeCallback = {
  onUpdate: (elements: Result<HTMLElement[]>) => void
}

export type InnerTextSubscribeResult = {
  unsubscribe: () => void
  innerText: Result<string>
}

export type ElementSubscribeResult = {
  unsubscribe: () => void
  element: Result<HTMLElement>
}

export type ElementsSubscribeResult = {
  unsubscribe: () => void
  elements: Result<HTMLElement[]>
}

export type Result<T> = {
  ok: true
  value: T
  elementsInfo: ElementInfo[]
} | {
  ok: false
  error: string
  severity: "warn" | "err"
  elementsInfo: ElementInfo[]
}

export type ElementInfo = {
  element: HTMLElement
  isVisible: boolean
}

export class XPathSubscriptionManager {
  private readonly subscriptions: Map<string, XPathSubscription> = new Map()
  private rootObserver?: MutationObserver
  private readonly elementSubscriptionManager = new ElementSubscriptionManager()

  init(): void {
    this.rootObserver = new MutationObserver(mutations => {
      for (const mutation of mutations) {
        if (mutation.addedNodes.length > 0) {
          this.handleUnresolved()
          return
        }
      }
    })
    this.rootObserver.observe(document.body, {
      childList: true,
      subtree: true
    })

    this.elementSubscriptionManager.init()
  }

  close() {
    for (const subscription of this.subscriptions.values()) {
      this.stopSubscription(subscription)
    }
    this.subscriptions.clear()
    this.elementSubscriptionManager.close()
    this.rootObserver?.disconnect()
    this.rootObserver = undefined
  }

  private handleUnresolved() {
    for (const subscription of this.subscriptions.values()) {
      this.handleAdded(subscription)
    }
  }

  subscribeOnElement(xpath: string, includeInvisible: boolean, callback: ElementChangeCallback): ElementSubscribeResult {
    const { subscription, unsubscribe } = this.subscribe(xpath, {
      type: "element",
      includeInvisible,
      onUpdate: callback.onUpdate
    })

    return {
      unsubscribe,
      element: this.buildElement(subscription, includeInvisible)
    }
  }

  subscribeOnElements(xpath: string, includeInvisible: boolean, callback: ElementsChangeCallback, allowMultiple: boolean = true): ElementsSubscribeResult {
    if (allowMultiple) {
      const { subscription, unsubscribe } = this.subscribe(xpath, {
        type: "elements",
        includeInvisible,
        onUpdate: callback.onUpdate
      })

      return {
        unsubscribe,
        elements: this.buildElements(subscription, includeInvisible)
      }
    } else {
      const { unsubscribe, element } = this.subscribeOnElement(xpath, includeInvisible, {
        onUpdate: e => callback.onUpdate(asArray(e))
      })

      return {
        unsubscribe,
        elements: asArray(element)
      }
    }
  }

  subscribeOnInnerText(xpath: string, includeInvisible: boolean, callback: InnerTextChangeCallback): InnerTextSubscribeResult {
    const { subscription, unsubscribe } = this.subscribe(xpath, {
      type: "innerText",
      includeInvisible,
      onUpdate: callback.onUpdate
    })

    return {
      unsubscribe,
      innerText: this.buildInnerText(subscription, includeInvisible)
    }
  }

  private subscribe(xpath: string, callback: Callback): { subscription: XPathSubscription, unsubscribe: () => void } {
    let subscription = this.subscriptions.get(xpath)
    if (subscription) {
      subscription.callbacks.push(callback)
    } else {
      subscription = {
        xpath,
        callbacks: [callback],
        elements: new Map()
      }
      this.subscriptions.set(xpath, subscription)
      this.revalidateSubscription(subscription)
    }

    return {
      subscription,
      unsubscribe: () => {
        this.unsubscribe(subscription, callback)
      }
    }
  }

  private unsubscribe(subscription: XPathSubscription, callback: Callback) {
    const index = subscription.callbacks.indexOf(callback)
    if (index !== -1) {
      subscription.callbacks.splice(index, 1)
    }

    if (subscription.callbacks.length === 0) {
      this.stopSubscription(subscription)
      this.subscriptions.delete(subscription.xpath)
    }
  }

  private revalidateSubscription(subscription: XPathSubscription) {
    const xpathResult = findElementsByXPath(subscription.xpath)
    if (!this.isChanged(subscription, xpathResult)) {
      return { updated: false }
    }

    if (xpathResult.ok) {
      subscription.error = undefined
      subscription.severity = undefined

      for (const oldElement of subscription.elements.keys()) {
        if (!xpathResult.value.includes(oldElement)) {
          this.stopSubscription(subscription, oldElement)
        }
      }

      for (const newElement of xpathResult.value) {
        if (!subscription.elements.has(newElement)) {
          this.startSubscription(subscription, newElement)
        }
      }
    } else {
      subscription.error = xpathResult.error
      subscription.severity = xpathResult.severity
      this.stopSubscription(subscription)
    }

    return { updated: true }
  }

  private isChanged(subscription: XPathSubscription, xpathResult: Try<HTMLElement[]>): boolean {
    if (!xpathResult.ok && xpathResult.error === subscription.error) {
      return false
    } else if (xpathResult.ok
      && xpathResult.value.length === subscription.elements.size
      && xpathResult.value.every(e => subscription.elements.has(e))) {
      return false
    }
    return true
  }

  private startSubscription(subscription: XPathSubscription, element: HTMLElement) {
    const { unsubscribe, initial } = this.elementSubscriptionManager.subscribe(element, {
      onRemove: () => { this.handleRemove(subscription, element) },
      onInnerTextChange: innerText => { this.handleInnerTextChange(subscription, element, innerText) },
      onIsVisibleChange: isVisible => { this.handleVisibilityChange(subscription, element, isVisible) },
      onStyleAttributeChange: () => { this.handleStyleAttributeChange(subscription) }
    })

    subscription.elements.set(element, {
      element: element,
      unsubscribeFromElement: unsubscribe,
      innerText: initial.innerText,
      isVisible: initial.isVisible
    })
  }

  private stopSubscription(subscription: XPathSubscription, element?: HTMLElement) {
    if (element) {
      subscription.elements.get(element)?.unsubscribeFromElement()
      subscription.elements.delete(element)
    } else {
      for (const element of subscription.elements.values()) {
        element.unsubscribeFromElement()
      }
      subscription.elements.clear()
    }
  }

  private handleAdded(subscription: XPathSubscription) {
    const { updated } = this.revalidateSubscription(subscription)
    if (updated) {
      this.runCallbacks(subscription)
    }
  }

  private handleRemove(subscription: XPathSubscription, element: HTMLElement) {
    subscription.elements.delete(element)
    this.runCallbacks(subscription)
  }

  private handleInnerTextChange(subscription: XPathSubscription, element: HTMLElement, innerText: string) {
    subscription.elements.get(element)!.innerText = innerText
    this.runCallbacks(subscription, true)
  }

  private handleVisibilityChange(subscription: XPathSubscription, element: HTMLElement, isVisible: boolean) {
    subscription.elements.get(element)!.isVisible = isVisible
    this.runCallbacks(subscription)
  }

  private handleStyleAttributeChange(subscription: XPathSubscription) {
    const { updated } = this.revalidateSubscription(subscription)
    if (updated) {
      this.runCallbacks(subscription)
    }
  }

  private runCallbacks(subscription: XPathSubscription, onlyContent: boolean = false) {
    const innerText = lazy(() => this.buildInnerText(subscription, false))
    const element = lazy(() => this.buildElement(subscription, false))
    const elements = lazy(() => this.buildElements(subscription, false))

    const invisibleInnerText = lazy(() => this.buildInnerText(subscription, true))
    const invisibleElement = lazy(() => this.buildElement(subscription, true))
    const invisibleElements = lazy(() => this.buildElements(subscription, true))

    subscription.callbacks.forEach(c => {
      if (c.type === "innerText") {
        if (c.includeInvisible) {
          c.onUpdate(invisibleInnerText.value)
        } else {
          c.onUpdate(innerText.value)
        }
      } else if (c.type === "element" && !onlyContent) {
        if (c.includeInvisible) {
          c.onUpdate(invisibleElement.value)
        } else {
          c.onUpdate(element.value)
        }
      } else if (c.type === "elements" && !onlyContent) {
        if (c.includeInvisible) {
          c.onUpdate(invisibleElements.value)
        } else {
          c.onUpdate(elements.value)
        }
      }
    })
  }

  private buildInnerText(subscription: XPathSubscription, includeInvisible: boolean): Result<string> {
    return this.buildSingleValue(subscription, includeInvisible, e => e.innerText)
  }

  private buildElement(subscription: XPathSubscription, includeInvisible: boolean): Result<HTMLElement> {
    return this.buildSingleValue(subscription, includeInvisible, e => e.element)
  }

  private buildElements(subscription: XPathSubscription, includeInvisible: boolean): Result<HTMLElement[]> {
    if (subscription.error !== undefined) {
      return {
        ok: false,
        error: subscription.error,
        severity: subscription.severity ?? "warn",
        elementsInfo: this.buildElementsInfo(subscription)
      }
    }

    return {
      ok: true,
      value: Array.from(subscription.elements.values())
        .filter(e => e.isVisible || includeInvisible)
        .map(e => e.element),
      elementsInfo: this.buildElementsInfo(subscription)
    }
  }

  private buildSingleValue<T>(subscription: XPathSubscription, includeInvisible: boolean, value: (element: ResolvedElement) => T): Result<T> {
    if (subscription.elements.size === 0) {
      return {
        ok: false,
        error: subscription.error ?? "XPath matched 0 elements.",
        severity: subscription.severity ?? "warn",
        elementsInfo: this.buildElementsInfo(subscription)
      }
    } else if (subscription.elements.size > 1) {
      return {
        ok: false,
        error: subscription.error ?? `XPath matched ${subscription.elements.size} elements (need exactly 1).`,
        severity: subscription.severity ?? "warn",
        elementsInfo: this.buildElementsInfo(subscription)
      }
    }

    const element = subscription.elements.values().next().value!

    if (!element.isVisible && !includeInvisible) {
      return {
        ok: false,
        error: "Element hidden",
        severity: "warn",
        elementsInfo: this.buildElementsInfo(subscription)
      }
    }

    return {
      ok: true,
      value: value(element),
      elementsInfo: this.buildElementsInfo(subscription)
    }
  }

  buildElementsInfo(subscription: XPathSubscription) {
    return Array.from(subscription.elements.values())
      .map(e => ({
        element: e.element,
        isVisible: e.isVisible
      }))
  }
}

function asArray(t: Result<HTMLElement>): Result<HTMLElement[]> {
  if (!t.ok) {
    return t
  } else {
    return {
      ok: true,
      value: [t.value],
      elementsInfo: t.elementsInfo
    }
  }
}

function lazy<T>(f: () => T): { value: T } {
  let value: T | null = null
  return {
    get value() {
      if (value === null) {
        value = f()
      }
      return value
    }
  }
}
