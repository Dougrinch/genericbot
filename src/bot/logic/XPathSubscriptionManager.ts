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
  onUpdate: (innerText: Try<string>) => void
} | {
  type: "element"
  onUpdate: (element: Try<HTMLElement>) => void
} | {
  type: "elements"
  onUpdate: (element: Try<HTMLElement[]>) => void
}

export type InnerTextChangeCallback = {
  onUpdate: (innerText: Try<string>) => void
}

export type ElementChangeCallback = {
  onUpdate: (element: Try<HTMLElement>) => void
}

export type ElementsChangeCallback = {
  onUpdate: (elements: Try<HTMLElement[]>) => void
}

export type InnerTextSubscribeResult = {
  unsubscribe: () => void
  innerText: Try<string>
}

export type ElementSubscribeResult = {
  unsubscribe: () => void
  element: Try<HTMLElement>
}

export type ElementsSubscribeResult = {
  unsubscribe: () => void
  elements: Try<HTMLElement[]>
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

  subscribeOnElement(xpath: string, callback: ElementChangeCallback): ElementSubscribeResult {
    const { subscription, unsubscribe } = this.subscribe(xpath, {
      type: "element",
      onUpdate: callback.onUpdate
    })

    return {
      unsubscribe,
      element: this.buildElement(subscription)
    }
  }

  subscribeOnElements(xpath: string, callback: ElementsChangeCallback, allowMultiple: boolean = true): ElementsSubscribeResult {
    if (allowMultiple) {
      const { subscription, unsubscribe } = this.subscribe(xpath, {
        type: "elements",
        onUpdate: callback.onUpdate
      })

      return {
        unsubscribe,
        elements: this.buildElements(subscription)
      }
    } else {
      const { unsubscribe, element } = this.subscribeOnElement(xpath, {
        onUpdate: e => callback.onUpdate(asArray(e))
      })

      return {
        unsubscribe,
        elements: asArray(element)
      }
    }
  }

  subscribeOnInnerText(xpath: string, callback: InnerTextChangeCallback): InnerTextSubscribeResult {
    const { subscription, unsubscribe } = this.subscribe(xpath, {
      type: "innerText",
      onUpdate: callback.onUpdate
    })

    return {
      unsubscribe,
      innerText: this.buildInnerText(subscription)
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
    const innerText = this.buildInnerText(subscription)
    const element = this.buildElement(subscription)
    subscription.callbacks.forEach(c => {
      if (c.type === "innerText") {
        c.onUpdate(innerText)
      } else if (c.type === "element" && !onlyContent) {
        c.onUpdate(element)
      }
    })
  }

  private buildInnerText(subscription: XPathSubscription): Try<string> {
    return this.buildSingleValue(subscription, e => e.innerText)
  }

  private buildElement(subscription: XPathSubscription): Try<HTMLElement> {
    return this.buildSingleValue(subscription, e => e.element)
  }

  private buildElements(subscription: XPathSubscription): Try<HTMLElement[]> {
    if (subscription.error !== undefined) {
      return {
        ok: false,
        error: subscription.error,
        severity: subscription.severity ?? "warn"
      }
    }

    return {
      ok: true,
      value: Array.from(subscription.elements.values())
        .filter(e => e.isVisible)
        .map(e => e.element)
    }
  }

  private buildSingleValue<T>(subscription: XPathSubscription, value: (element: ResolvedElement) => T): Try<T> {
    if (subscription.elements.size === 0) {
      return {
        ok: false,
        error: subscription.error ?? "XPath matched 0 elements.",
        severity: subscription.severity ?? "warn"
      }
    } else if (subscription.elements.size > 1) {
      return {
        ok: false,
        error: subscription.error ?? `XPath matched ${subscription.elements.size} elements (need exactly 1).`,
        severity: subscription.severity ?? "warn"
      }
    }

    const element = subscription.elements.values().next().value!

    if (!element.isVisible) {
      return {
        ok: false,
        error: "Element hidden",
        severity: "warn"
      }
    }

    return {
      ok: true,
      value: value(element)
    }
  }
}

function asArray(t: Try<HTMLElement>): Try<HTMLElement[]> {
  if (!t.ok) {
    return t
  } else {
    return {
      ok: true,
      value: [t.value]
    }
  }
}
