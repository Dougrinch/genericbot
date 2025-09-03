import { vi } from "vitest"

export async function advanceBy(ms: number) {
  vi.advanceTimersByTime(ms)
  vi.advanceTimersToNextFrame()
}
