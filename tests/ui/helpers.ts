import { vi } from "vitest"

// eslint-disable-next-line
export async function advanceBy(ms: number) {
  vi.advanceTimersByTime(ms)
  vi.advanceTimersToNextFrame()
}
