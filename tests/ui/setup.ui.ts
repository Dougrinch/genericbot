import { cleanup, configure } from "vitest-browser-react/pure"
import { afterEach, beforeAll } from "vitest"
import { Locator } from "@vitest/browser/locator"

configure({
  reactStrictMode: true
})

beforeAll(() => {
  Object.defineProperty(Locator.prototype, "clickN", {
    async value(this: Locator, n: number) {
      for (let i = 0; i < n; i++) {
        await this.click()
      }
    }
  })
})

afterEach(() => {
  cleanup()
})


declare module "@vitest/browser/context" {
  interface Locator {
    clickN(n: number): Promise<void>
  }
}
