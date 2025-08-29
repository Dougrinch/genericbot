import { afterEach, beforeEach, vi } from "vitest";
import { configure } from "vitest-browser-react/pure";

beforeEach(function () {
  vi.useFakeTimers()
  document.body.innerHTML = '<div id="root"></div>'
})

afterEach(function () {
  vi.useRealTimers()
})

configure({
  reactStrictMode: true,
})
