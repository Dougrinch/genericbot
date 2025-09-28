import { type Assertion, expect } from "vitest"
import { type Promisify, waitForPromisify } from "./waits.ts"
import { type Locator, page } from "@vitest/browser/context"

export function element(
  locator: Locator, sel?: (es: Element[]) => Element
): Promisify<Assertion<Element>> {
  if (sel) {
    return waitForPromisify(() => expect(sel(locator.elements())))
  } else {
    return waitForPromisify(chain => {
      if (chain.length === 2 && chain[0].key === "not" && chain[1].key === "toBeInTheDocument") {
        return expect(locator.query()) as Assertion<Element>
      } else {
        return expect(locator.element())
      }
    })
  }
}

export function elements(locator: Locator): Promisify<Assertion<Element[]>> {
  return waitForPromisify(() => expect(locator.elements()))
}

export type ProtoOf<T> = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [K in keyof T as T[K] extends (...args: any) => any ? K : never]?: T[K] extends (...a: infer A) => infer R
    ? (this: T, ...a: A) => R
    : never;
}

export function enrichLocator() {
  const locatorPrototype = Object.getPrototypeOf(page.getByText("")) as ProtoOf<Locator>

  Object.defineProperty(locatorPrototype, "clickN", {
    configurable: false,
    writable: false,
    async value(this: Locator, n: number): Promise<void> {
      for (let i = 0; i < n; i++) {
        await this.click()
      }
    }
  })

  Object.defineProperty(locatorPrototype, "expect", {
    configurable: false,
    writable: false,
    value(this: Locator): Promisify<Assertion<Element>> {
      return element(this)
    }
  })

  Object.defineProperty(locatorPrototype, "expectMany", {
    configurable: false,
    writable: false,
    value(this: Locator): Promisify<Assertion<Element[]>> {
      return elements(this)
    }
  })

  const originalClick = locatorPrototype["click"]!
  Object.defineProperty(locatorPrototype, "click", {
    configurable: false,
    writable: false,
    async value(this: Locator): Promise<void> {
      await this.expect().toBeVisible()
      return originalClick.apply(this)
    }
  })

  const originalFill = locatorPrototype["fill"]!
  Object.defineProperty(locatorPrototype, "fill", {
    configurable: false,
    writable: false,
    async value(this: Locator, text: string): Promise<void> {
      await this.expect().toBeVisible()
      return originalFill.apply(this, [text])
    }
  })
}

declare module "@vitest/browser/context" {
  interface Locator {
    clickN(n: number): Promise<void>
    expect(): Promisify<Assertion<Element>>
    expectMany(): Promisify<Assertion<Element[]>>
  }
}
