import { cleanup, configure } from "vitest-browser-react/pure"
import { afterEach, beforeAll, beforeEach } from "vitest"
import { enrichLocator } from "./locator.ts"
import { installCustomLocators } from "./helpers.ts"

configure({
  reactStrictMode: true
})

beforeAll(() => {
  enrichLocator()
  installCustomLocators()
})

beforeEach(() => {
  cleanup()
})

afterEach(() => {
  for (const config of document.getElementsByClassName("config-wrapper")) {
    config.scrollTo(0, 0)
  }
})
