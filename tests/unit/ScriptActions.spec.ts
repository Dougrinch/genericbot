import { describe, expect, test } from "vitest"
import { runScript } from "./scriptRunner.ts"

describe("ScriptActions", () => {
  test("repeat runs its body the given number of times", async () => {
    const s = await runScript(`
      repeat (3) {
        click(buttonA)
      }
    `)

    await s.expectCompleted()
    expect(s.page.counter("a")).toBe(3)
  })

  test("click acts on every element the name matches", async () => {
    const s = await runScript(`click(allButtons)`, { page: p => p.show("b") })

    await s.expectCompleted()
    expect(s.page.counters()).toEqual({ a: 1, b: 1 })
  })

  test("has is false while the element is not matched", async () => {
    const s = await runScript(`
      if (has(buttonA)) {
        print("before")
      }
      wait(100)
      if (has(buttonA)) {
        print("after")
      }
    `)

    expect(s.printed()).toEqual(["before"])
    s.page.hide("a")

    await s.advance(100)
    await s.expectCompleted()
    expect(s.printed()).toEqual(["before"])
  })

  test("a variable is re-read on every pass through a loop", async () => {
    const s = await runScript(`
      while (counterA < 3) {
        click(buttonA)
      }
      print("done")
    `)

    await s.expectCompleted()
    expect(s.page.counter("a")).toBe(3)
    expect(s.printed()).toEqual(["done"])
  })

  test("a variable picks up a change made while the script waits", async () => {
    const s = await runScript(`
      while (counterB < 3) {
        wait(100)
      }
      click(buttonA)
    `)

    await s.expectRunning()
    expect(s.page.counter("a")).toBe(0)

    s.page.setCounter("b", 3)

    await s.advance(100)
    await s.expectCompleted()
    expect(s.page.counter("a")).toBe(1)
  })

  test("wait suspends the script for the given delay", async () => {
    const s = await runScript(`
      click(buttonA)
      wait(500)
      click(buttonA)
    `)

    expect(s.page.counter("a")).toBe(1)
    await s.expectRunning()

    await s.advance(499)
    expect(s.page.counter("a")).toBe(1)

    await s.advance(1)
    await s.expectCompleted()
    expect(s.page.counter("a")).toBe(2)
  })

  test("waitFor suspends the script until the element shows up", async () => {
    const s = await runScript(`
      print("waiting")
      waitFor(buttonB)
      click(buttonB)
      print("clicked")
    `)

    await s.expectRunning()
    expect(s.printed()).toEqual(["waiting"])
    expect(s.page.counter("b")).toBe(0)

    s.page.show("b")

    await s.expectCompleted()
    expect(s.page.counter("b")).toBe(1)
    expect(s.printed()).toEqual(["waiting", "clicked"])
  })

  test("wait fails when the action is stopped", async () => {
    const s = await runScript(`
      wait(10000)
      click(buttonA)
    `)

    await s.expectRunning()
    s.abort()

    await s.expectFailed("Stopped")
    expect(s.page.counter("a")).toBe(0)
  })

  test("a loop that never touches the page still runs to the end", async () => {
    const s = await runScript(`
      val x = 0
      repeat (500) {
        x = x + 1
      }
      click(buttonA)
    `)

    // Nothing in this script can suspend it, so by the time control comes back
    // the whole loop has already run - checking before expectCompleted is what
    // makes that assertion mean something.
    expect(s.page.counter("a")).toBe(1)
    await s.expectCompleted()
  })

  test("a name the script does not declare is rejected before it runs", async () => {
    await expect(runScript(`click(noSuchElement)`))
      .rejects.toThrow(/Variable "noSuchElement" not declared/)
  })

  test("clicking something that is not an element fails at run time", async () => {
    const s = await runScript(`click(counterA)`)

    await s.expectFailed(/elements is not a function/)
    expect(s.page.counter("a")).toBe(0)
  })
})
