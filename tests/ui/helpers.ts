import { vi } from "vitest"
import { locators } from "@vitest/browser/context"

// eslint-disable-next-line
export async function advanceBy(ms: number) {
  vi.advanceTimersByTime(ms)
  vi.advanceTimersToNextFrame()
}

export function installCustomLocators() {
  locators.extend({
    getVariableRow(name: string): string {
      return `div.variable-list-item:has(span:has-text("${name}"))`
    },
    getBySelector(selectors: string): string {
      return selectors
    }
  })
}

declare module "@vitest/browser/context" {
  interface LocatorSelectors {
    getVariableRow(name: string): Locator
    getBySelector(selectors: string): Locator
  }
}
