import { expect, onTestFinished, vi } from "vitest"
import { firstValueFrom } from "rxjs"
import { BotManager } from "../../src/bot/logic/BotManager.ts"
import type { ActionConfig, Config } from "../../src/bot/logic/Config.ts"
import { CONFIG_STORAGE_KEY } from "../../src/bot/logic/ConfigManager.ts"
import type { Action } from "../../src/bot/logic/ActionsManager.ts"
import { pageElements, pageVariables, TestPage } from "./scriptTestPage.ts"

/**
 * Runs a real script action against a real DOM. `runScript` starts the script
 * and hands back a handle; the test then checks it, changes the page, and moves
 * its clock, exactly where the script is parked:
 *
 * ```ts
 * const s = await runScript(`
 *   waitFor(bonus)
 *   click(bonus)
 * `)
 *
 * await s.expectRunning()               // parked in waitFor
 * expect(s.page.counter("bonus")).toBe(0)
 *
 * s.page.addButton("bonus")             // change the page mid-script
 *
 * await s.expectCompleted()
 * expect(s.page.counter("bonus")).toBe(1)
 * ```
 *
 * ## How time works
 *
 * Only `setTimeout` is faked, so the script's own clock (`wait`, and the tick
 * `click` yields on) is under the test's control via `advance`, while anything
 * the bot schedules on other timers keeps running on the real clock. That split
 * is what makes "check, change the page, check again" land where the script is
 * parked: an awaited call drives the script as far as it can go without time
 * passing, and no further.
 *
 * Page changes reach a script within one macrotask, so no waiting is involved:
 * variables re-read on a MutationObserver, and showing or hiding an element
 * goes through the elements pipeline's unthrottled visibility path.
 */

const DEFAULT_TIMEOUT_MS = 2000
const MAX_SETTLE_ROUNDS = 500

/** How long to let an aborted script unwind before restoring the real clock. */
const STOP_TIMEOUT_MS = 250

export type RunScriptOptions = {
  /** Puts the page into a particular state before the script starts. */
  page?: (page: TestPage) => void
  /** How long to wait, in real time, for the script to finish. */
  timeoutMs?: number
}

/**
 * Renders the shared page, compiles the script and starts it. Cleanup is
 * registered automatically, so a test never has to tear anything down.
 */
export async function runScript(script: string, options: RunScriptOptions = {}): Promise<ScriptRun> {
  // Faking only setTimeout keeps the script's clock under test control while
  // leaving the observer throttle (a setInterval) running on real time.
  // useFakeTimers is a no-op while a clock is installed, which would silently
  // drop `toFake`, so always start from real timers.
  vi.useRealTimers()
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] })

  let page: TestPage
  let bot: BotManager
  try {
    page = TestPage.render()
    options.page?.(page)
    seedConfig({
      actions: [],
      elements: pageElements,
      variables: pageVariables
    })
    bot = new BotManager()
  } catch (failure) {
    vi.useRealTimers()
    throw failure
  }

  const run = new ScriptRun(page, options.timeoutMs ?? DEFAULT_TIMEOUT_MS)
  onTestFinished(() => run.stop())

  const compiled = await firstValueFrom(bot.scriptActionFactory.runnableScript(scriptActionConfig(script)))
  if (!compiled.ok) {
    throw new Error(`Script did not compile.\n${compiled.error}`)
  }

  run.launch(compiled.value)
  await run.settle()
  return run
}

type RunStatus = "running" | "completed" | "failed"

export class ScriptRun {
  /** The page the script is running against. Read it, change it, click it. */
  readonly page: TestPage

  private readonly timeoutMs: number
  private readonly controller = new AbortController()
  private readonly log: unknown[] = []
  private readonly observer: MutationObserver
  private readonly consoleLog: typeof console.log

  private status: RunStatus = "running"
  private failure: unknown = undefined
  private stopped = false
  private mutations = 0

  constructor(page: TestPage, timeoutMs: number) {
    this.page = page
    this.timeoutMs = timeoutMs

    this.consoleLog = console.log
    console.log = (...args: unknown[]) => {
      this.log.push(args.length === 1 ? args[0] : args)
    }

    // Counts page changes so settle() can tell "still working" from "parked".
    this.observer = new MutationObserver(() => {
      this.mutations += 1
    })
    this.observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      characterData: true
    })
  }

  launch(action: Action): void {
    action.run(this.controller.signal).then(
      () => {
        this.status = "completed"
      },
      (reason: unknown) => {
        this.status = "failed"
        this.failure = reason
      }
    )
  }

  /** Everything the script has passed to `print` so far, in order. */
  printed(): unknown[] {
    return [...this.log]
  }

  /** Fails unless the script is still parked, waiting for time or the page. */
  async expectRunning(): Promise<void> {
    await this.settle()
    expect(this.status, `script should still be running, ${this.detail()}`).toBe("running")
  }

  /** Waits for the script to finish, and fails if it does not. */
  async expectCompleted(): Promise<void> {
    await this.waitUntilFinished()
    expect(this.status, `script should have completed, ${this.detail()}`).toBe("completed")
  }

  /** Waits for the script to fail, optionally checking the reason. */
  async expectFailed(reason?: string | RegExp): Promise<void> {
    await this.waitUntilFinished()
    expect(this.status, `script should have failed, ${this.detail()}`).toBe("failed")
    if (reason !== undefined) {
      expect(this.failureMessage()).toMatch(reason)
    }
  }

  /** Moves the script's clock forward, releasing any `wait` that is due. */
  async advance(ms: number): Promise<void> {
    await this.settle()
    vi.advanceTimersByTime(ms)
    await this.settle()
  }

  /** Aborts the script the way stopping an action would. */
  abort(): void {
    this.controller.abort("Stopped")
  }

  /**
   * Drives the script as far as it can go without the clock moving, then stops.
   *
   * Each round crosses a real macrotask boundary, which drains the microtask
   * queue completely - including the chain a long `repeat` keeps spawning - so
   * "the script did not progress" means it genuinely cannot, rather than that
   * it merely ran out of turns. MutationObserver delivers on the same queue, so
   * page changes land too.
   */
  async settle(): Promise<void> {
    let stable = 0
    for (let round = 0; round < MAX_SETTLE_ROUNDS && stable < 2; round++) {
      const before = this.signature()
      await yieldToEventLoop()
      vi.advanceTimersByTime(0)
      await yieldToEventLoop()
      stable = this.signature() === before ? stable + 1 : 0
    }
  }

  /**
   * Unwinds the run. Aborting only unblocks `wait`/`waitFor`, so give whatever
   * is left on the queue a bounded chance to finish: restoring the real clock
   * under a script that is still going would let it run on into the next test.
   */
  async stop(): Promise<void> {
    if (this.stopped) {
      return
    }
    this.stopped = true

    this.controller.abort("Stopped")

    // Driving the script needs our clock. A second run in the same test puts
    // the real one back when it stops, and stops happen in reverse order.
    const deadline = Date.now() + STOP_TIMEOUT_MS
    while (this.status === "running" && Date.now() < deadline && vi.isFakeTimers()) {
      await this.settle()
      if (this.status !== "running") {
        break
      }
      await realDelay(5)
    }
    this.observer.disconnect()
    console.log = this.consoleLog
    vi.useRealTimers()
    document.body.innerHTML = ""
  }

  private async waitUntilFinished(): Promise<void> {
    const deadline = Date.now() + this.timeoutMs
    while (this.status === "running") {
      await this.settle()
      if (this.status !== "running" || Date.now() >= deadline) {
        return
      }
      await realDelay(5)
    }
  }

  private failureMessage(): string {
    return this.failure instanceof Error ? this.failure.message : String(this.failure)
  }

  private detail(): string {
    const state = this.status === "failed" ? `but it failed with: ${this.failureMessage()}` : `but it is ${this.status}`
    return `${state}\n  counters: ${JSON.stringify(this.page.counters())}\n  printed: ${JSON.stringify(this.log)}`
  }

  private signature(): string {
    return `${vi.getTimerCount()}|${this.mutations}|${this.status}|${this.log.length}`
  }
}

function scriptActionConfig(script: string): ActionConfig {
  return {
    id: "action_1",
    name: "Script under test",
    type: "script",
    xpath: "",
    script,
    element: "",
    periodic: false,
    interval: 100,
    allowMultiple: false
  }
}

function seedConfig(config: Config): void {
  const serialized = JSON.stringify(config)
  localStorage.clear()
  localStorage.setItem(CONFIG_STORAGE_KEY, serialized)
  localStorage.setItem(`${CONFIG_STORAGE_KEY}_${window.location.href}`, serialized)
}

const setImmediateFn = (globalThis as { setImmediate?: (callback: () => void) => unknown }).setImmediate

/**
 * Hands control back to the event loop. Crossing a macrotask boundary is what
 * guarantees the microtask queue is empty on the other side.
 */
function yieldToEventLoop(): Promise<void> {
  return new Promise(resolve => {
    if (setImmediateFn !== undefined) {
      setImmediateFn(resolve)
      return
    }
    const id = setInterval(() => {
      clearInterval(id)
      resolve()
    }, 0)
  })
}

/**
 * A real delay. It goes through `setInterval` on purpose: that is the one timer
 * the harness never fakes, so this keeps working no matter when the module was
 * imported relative to `vi.useFakeTimers`.
 */
function realDelay(ms: number): Promise<void> {
  return new Promise(resolve => {
    const id = setInterval(() => {
      clearInterval(id)
      resolve()
    }, ms)
  })
}
