import { ElementSubscriptionManager } from "./ElementSubscriptionManager.ts"
import { findElementByXPath, type Try } from "../../utils/xpath.ts"

type XPathSubscription = {
  readonly xpath: string

  error?: string
  severity?: "warn" | "err"
  element?: HTMLElement
  unsubscribeFromElement?: () => void

  innerText?: string
  isVisible?: boolean

  readonly callbacks: Callback[]
}

type Callback = {
  type: "innerText"
  onUpdate: (innerText: Try<string>) => void
} | {
  type: "element"
  onUpdate: (element: Try<HTMLElement>) => void
}

type InnerTextChangeCallback = {
  onUpdate: (innerText: Try<string>) => void
}

type ElementChangeCallback = {
  onUpdate: (element: Try<HTMLElement>) => void
}

type InnerTextSubscribeResult = {
  unsubscribe: () => void
  innerText: Try<string>
}

type ElementSubscribeResult = {
  unsubscribe: () => void
  element: Try<HTMLElement>
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
      if (!subscription.element) {
        this.startSubscription(subscription)
        // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
        if (subscription.element) {
          this.handleAdded(subscription)
        }
      }
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
    if (!subscription) {
      subscription = {
        xpath,
        callbacks: []
      }
      this.subscriptions.set(xpath, subscription)
    }

    subscription.callbacks.push(callback)

    if (!subscription.element) {
      this.startSubscription(subscription)
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

  private startSubscription(subscription: XPathSubscription) {
    const xpathResult = findElementByXPath(subscription.xpath)
    if (xpathResult.ok) {
      subscription.element = xpathResult.value
      subscription.error = undefined
      subscription.severity = undefined
      const { unsubscribe, initial } = this.elementSubscriptionManager.subscribe(xpathResult.value, {
        onRemove: () => { this.handleRemove(subscription) },
        onInnerTextChange: innerText => { this.handleInnerTextChange(subscription, innerText) },
        onIsVisibleChange: isVisible => { this.handleVisibilityChange(subscription, isVisible) }
      })
      subscription.unsubscribeFromElement = unsubscribe
      subscription.innerText = initial.innerText
      subscription.isVisible = initial.isVisible
    } else {
      subscription.element = undefined
      subscription.unsubscribeFromElement = undefined
      subscription.error = xpathResult.error
      subscription.severity = xpathResult.severity
    }
  }

  private stopSubscription(subscription: XPathSubscription) {
    subscription.unsubscribeFromElement?.()
    subscription.unsubscribeFromElement = undefined
    subscription.element = undefined
    subscription.error = undefined
    subscription.severity = undefined
  }

  private handleAdded(subscription: XPathSubscription) {
    this.runCallbacks(subscription)
  }

  private handleRemove(subscription: XPathSubscription) {
    subscription.element = undefined
    this.runCallbacks(subscription)
  }

  private handleInnerTextChange(subscription: XPathSubscription, innerText: string) {
    subscription.innerText = innerText
    this.runCallbacks(subscription, true)
  }

  private handleVisibilityChange(subscription: XPathSubscription, isVisible: boolean) {
    subscription.isVisible = isVisible
    this.runCallbacks(subscription)
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
    return this.buildValue(subscription, s => s.innerText!)
  }

  private buildElement(subscription: XPathSubscription): Try<HTMLElement> {
    return this.buildValue(subscription, s => s.element!)
  }

  private buildValue<T>(subscription: XPathSubscription, value: (s: XPathSubscription) => T): Try<T> {
    if (!subscription.element) {
      return {
        ok: false,
        error: subscription.error ?? "Element not resolved",
        severity: subscription.severity ?? "warn"
      }
    }

    if (subscription.isVisible !== true) {
      return {
        ok: false,
        error: "Element hidden",
        severity: "warn"
      }
    }

    return {
      ok: true,
      value: value(subscription)
    }
  }
}
