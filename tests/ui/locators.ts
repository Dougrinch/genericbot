import { type Assertion, expect, vi } from "vitest"
import { type Promisify, waitForPromisify } from "./promisify.ts"
import { type Locator, page } from "@vitest/browser/context"

export function element(
  locator: Locator,
  sel?: (es: Element[]) => Element,
  opts: Parameters<typeof vi.waitFor>[1] = { interval: 0 }
): Promisify<Assertion<Element>> {
  if (sel) {
    return waitForPromisify(() => expect(sel(locator.elements())), opts)
  } else {
    return waitForPromisify(() => expect(locator.element()), opts)
  }
}

export function elements(
  locator: Locator,
  opts: Parameters<typeof vi.waitFor>[1] = { interval: 0 }
): Promisify<Assertion<Element[]>> {
  return waitForPromisify(() => expect(locator.elements()), opts)
}

export function enrichLocator() {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const locatorPrototype = Object.getPrototypeOf(page.getByText(""))

  Object.defineProperty(locatorPrototype, "clickN", {
    async value(this: Locator, n: number): Promise<void> {
      for (let i = 0; i < n; i++) {
        await this.click()
      }
    }
  })

  Object.defineProperty(locatorPrototype, "expect", {
    value(this: Locator): Promisify<Assertion<Element>> {
      return element(this)
    }
  })
}

declare module "@vitest/browser/context" {
  interface Locator {
    clickN(n: number): Promise<void>
    expect(): Promisify<Assertion<Element>>
  }
}
