import { afterEach, beforeEach, vi } from "vitest";

beforeEach(function () {
  vi.useFakeTimers()
})

afterEach(function () {
  vi.useRealTimers()
})
