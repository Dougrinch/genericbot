import { configure } from "vitest-browser-react/pure"
import { afterEach, beforeAll, beforeEach } from "vitest"
import { enrichLocator } from "./locator.ts"
import { installCustomLocators } from "./helpers.ts"
import { dispatch } from "../../src/bot/ConfigContext.ts"
import { installCustomMatchers } from "./matchers.ts"

configure({
  reactStrictMode: true
})

beforeAll(() => {
  // eslint-disable-next-line
  debugger
  enrichLocator()
  installCustomLocators()
  installCustomMatchers()
})

beforeEach(() => {
  dispatch({ type: "reset" })
})

afterEach(() => {
  for (const config of document.getElementsByClassName("config-wrapper")) {
    config.scrollTo(0, 0)
  }
})
