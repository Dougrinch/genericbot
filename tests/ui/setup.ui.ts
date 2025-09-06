import { configure } from "vitest-browser-react/pure"
import { afterEach, beforeAll, beforeEach } from "vitest"
import { enrichLocator } from "./locator.ts"
import { installCustomLocators } from "./helpers.ts"
import { dispatch } from "../../src/bot/BotStateContext.ts"
import { installCustomMatchers } from "./matchers.ts"
import { page } from "@vitest/browser/context"

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
  page.getBySelector(".config-wrapper").element().scrollTo(0, 0)
})
