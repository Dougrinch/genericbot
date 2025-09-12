import { cleanup, configure } from "vitest-browser-react/pure"
import { afterEach, beforeAll, beforeEach, vi } from "vitest"
import { enrichLocator } from "./locator.ts"
import { installCustomLocators } from "./helpers.tsx"
import { installCustomMatchers } from "./matchers.ts"
import { page } from "@vitest/browser/context"
import { dispatch } from "../../src/bot/logic/BotManager.ts"
import { dispatch as gameDispatch } from "../../src/game/GameStateContext.ts"

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
  cleanup()
  vi.useFakeTimers()
  vi.resetModules()
  vi.resetAllMocks()

  document.head.innerHTML = ""
  document.body.innerHTML = "<div id=\"root\"></div>"

  dispatch.resetConfig()
  gameDispatch({ type: "reset" })
})

afterEach(() => {
  page.getBySelector(".config-wrapper").query()?.scrollTo(0, 0)
  vi.useRealTimers()
})
