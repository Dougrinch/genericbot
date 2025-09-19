import type { SubscriptionInitialValues } from "../../utils/Subscription.ts"

type ElementSubscription = {
  readonly element: HTMLElement

  observers?: MutationObserver[]

  innerText?: string
  isVisible?: boolean

  readonly callbacks: ElementSubscriptionCallback[]
}

export type ElementSubscriptionCallback = { onRemove: () => void } & Partial<{
  onInnerTextChange: (innerText: string) => void
  onIsVisibleChange: (isVisible: boolean) => void
}>

type ElementSubscribeResult<T> = {
  unsubscribe: () => void
  initial: SubscriptionInitialValues<T>
}

export class ElementSubscriptionManager {
  private readonly subscriptions: Map<HTMLElement, ElementSubscription> = new Map()

  init() {
  }

  close() {
    for (const subscription of this.subscriptions.values()) {
      this.clearObservers(subscription)
    }
    this.subscriptions.clear()
  }

  subscribe<C extends ElementSubscriptionCallback>(
    element: HTMLElement,
    callback: C
  ): ElementSubscribeResult<C> {
    let subscription = this.subscriptions.get(element)
    if (!subscription) {
      subscription = {
        element,
        callbacks: []
      }
      this.subscriptions.set(element, subscription)
    }

    subscription.callbacks.push(callback)

    let resetObservers = false
    if (callback.onIsVisibleChange && subscription.isVisible === undefined) {
      subscription.isVisible = element.checkVisibility()
      resetObservers = true
    }
    if (callback.onInnerTextChange && subscription.innerText === undefined) {
      subscription.innerText = element.innerText
      resetObservers = true
    }

    if (resetObservers) {
      this.clearObservers(subscription)
    }
    if (!subscription.observers) {
      this.setupObservers(subscription)
    }

    return {
      unsubscribe: () => this.unsubscribe(subscription, callback),
      initial: {
        innerText: subscription.innerText,
        isVisible: subscription.isVisible
      }
    } as ElementSubscribeResult<C>
  }

  private unsubscribe(subscription: ElementSubscription, callback: ElementSubscriptionCallback) {
    const index = subscription.callbacks.indexOf(callback)
    if (index !== -1) {
      subscription.callbacks.splice(index, 1)
    }

    if (subscription.callbacks.length === 0) {
      this.clearObservers(subscription)
      this.subscriptions.delete(subscription.element)
    }
  }

  private setupObservers(subscription: ElementSubscription) {
    const observers = []

    let element = subscription.element

    if (subscription.isVisible !== undefined || subscription.innerText !== undefined) {
      const observer = new MutationObserver(mutations => {
        for (const mutation of mutations) {
          if (mutation.type === "childList" || mutation.type === "characterData") {
            this.handleInnerTextChange(subscription)
          } else if (mutation.type === "attributes") {
            this.handleVisibilityChange(subscription)
          }
        }
      })
      observers.push(observer)
      observer.observe(element, {
        childList: subscription.innerText !== undefined,
        characterData: subscription.innerText !== undefined,
        subtree: subscription.innerText !== undefined,
        attributes: subscription.isVisible !== undefined,
        ...((subscription.isVisible !== undefined)
          ? { attributeFilter: ["style", "hidden", "class"] }
          : {})
      })
    }

    while (element.parentElement != null) {
      const child = element
      const parent = element.parentElement
      element = element.parentElement

      const observer = new MutationObserver(mutations => {
        for (const mutation of mutations) {
          if (mutation.type === "attributes") {
            this.handleVisibilityChange(subscription)
          } else if (mutation.type === "childList") {
            for (const removedNode of mutation.removedNodes) {
              if (removedNode === child) {
                this.handleRemove(subscription)
                return
              }
            }
          }
        }
      })
      observers.push(observer)
      observer.observe(parent, {
        childList: true,
        attributes: subscription.isVisible !== undefined,
        ...((subscription.isVisible !== undefined)
          ? { attributeFilter: ["style", "hidden", "class"] }
          : {})
      })
    }

    subscription.observers = observers
  }

  private clearObservers(subscription: ElementSubscription) {
    subscription.observers?.forEach(o => o.disconnect())
    subscription.observers = undefined
  }

  private handleInnerTextChange(subscription: ElementSubscription) {
    const innerText = subscription.element.innerText
    if (innerText !== subscription.innerText) {
      subscription.innerText = innerText
      subscription.callbacks.forEach(c => c.onInnerTextChange?.(innerText))
    }
  }

  private handleVisibilityChange(subscription: ElementSubscription) {
    const isVisible = subscription.element.checkVisibility()
    if (isVisible !== subscription.isVisible) {
      subscription.isVisible = isVisible
      subscription.callbacks.forEach(c => c.onIsVisibleChange?.(isVisible))
    }
  }

  private handleRemove(subscription: ElementSubscription) {
    this.clearObservers(subscription)
    this.subscriptions.delete(subscription.element)
    subscription.callbacks.forEach(c => c.onRemove())
  }
}
