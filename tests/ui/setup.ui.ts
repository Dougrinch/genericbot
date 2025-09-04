import { cleanup, configure } from "vitest-browser-react/pure"
import { beforeAll, beforeEach } from "vitest"
import { enrichLocator } from "./locators.ts"

configure({
  reactStrictMode: true
})

beforeAll(() => {
  enrichLocator()
})

beforeEach(() => {
  cleanup()
})
