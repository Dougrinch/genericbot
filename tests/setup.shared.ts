import { afterEach, beforeEach, vi } from "vitest"

beforeEach(function () {
  vi.useFakeTimers()
  document.head.innerHTML = ""
  document.body.innerHTML = "<div id=\"root\"></div>"
})

afterEach(function () {
  vi.useRealTimers()
})
