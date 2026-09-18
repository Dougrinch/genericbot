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

describe("ScriptActions: custom functions", () => {
  test("a custom function runs its body on every call", async () => {
    const s = await runScript(`
      fun clickA() {
        click(buttonA)
      }

      clickA()
      clickA()
    `)

    await s.expectCompleted()
    expect(s.page.counter("a")).toBe(2)
  })

  test("a custom function returns a value to its caller", async () => {
    const s = await runScript(`
      fun add(a, b) {
        return a + b
      }

      print(add(1, add(2, 3)))
    `)

    await s.expectCompleted()
    expect(s.printed()).toEqual([6])
  })

  test("an element passed as an argument is the one acted on", async () => {
    const s = await runScript(`
      fun clickTwice(target) {
        click(target)
        click(target)
      }

      clickTwice(buttonB)
    `, { page: p => p.show("b") })

    await s.expectCompleted()
    expect(s.page.counters()).toEqual({ a: 0, b: 2 })
  })

  test("an element returned by a custom function is the one acted on", async () => {
    const s = await runScript(`
      fun target() {
        return buttonA
      }

      click(target())
    `)

    await s.expectCompleted()
    expect(s.page.counter("a")).toBe(1)
  })

  test("a parameter is local to the call, so the caller's value is untouched", async () => {
    const s = await runScript(`
      fun bump(n) {
        n = n + 1
        return n
      }

      val x = 1
      print(bump(x))
      print(x)
    `)

    await s.expectCompleted()
    expect(s.printed()).toEqual([2, 1])
  })

  test("a custom function reads a variable at call time, not at declaration time", async () => {
    const s = await runScript(`
      fun done() {
        return counterA >= 3
      }

      while (!done()) {
        click(buttonA)
      }
      print("done")
    `)

    await s.expectCompleted()
    expect(s.page.counter("a")).toBe(3)
    expect(s.printed()).toEqual(["done"])
  })

  test("a custom function suspends its caller while it waits", async () => {
    const s = await runScript(`
      fun clickTwice() {
        click(buttonA)
        wait(100)
        click(buttonA)
      }

      clickTwice()
      print("after")
    `)

    await s.expectRunning()
    expect(s.page.counter("a")).toBe(1)
    expect(s.printed()).toEqual([])

    await s.advance(100)
    await s.expectCompleted()
    expect(s.page.counter("a")).toBe(2)
    expect(s.printed()).toEqual(["after"])
  })

  test("a custom function waiting on the page resumes when it shows up", async () => {
    const s = await runScript(`
      fun clickWhenReady(target) {
        waitFor(target)
        click(target)
      }

      clickWhenReady(buttonB)
      print("clicked")
    `)

    await s.expectRunning()
    expect(s.page.counter("b")).toBe(0)

    s.page.show("b")

    await s.expectCompleted()
    expect(s.page.counter("b")).toBe(1)
    expect(s.printed()).toEqual(["clicked"])
  })

  test("a custom function calls itself until its base case", async () => {
    const s = await runScript(`
      fun countdown(n) {
        if (n > 0) {
          print(n)
          countdown(n - 1)
        }
      }

      countdown(3)
    `)

    await s.expectCompleted()
    expect(s.printed()).toEqual([3, 2, 1])
  })

  test("a custom function can drive a built-in block", async () => {
    const s = await runScript(`
      fun clickTimes(n) {
        repeat (n) {
          click(buttonA)
        }
      }

      clickTimes(3)
    `)

    await s.expectCompleted()
    expect(s.page.counter("a")).toBe(3)
  })

  test("a nested function is callable inside the one declaring it", async () => {
    const s = await runScript(`
      fun outer() {
        fun inner() {
          click(buttonA)
        }

        inner()
        inner()
      }

      outer()
    `)

    await s.expectCompleted()
    expect(s.page.counter("a")).toBe(2)
  })

  test("stopping the action fails the caller through the custom function", async () => {
    const s = await runScript(`
      fun slow() {
        wait(10000)
        click(buttonA)
      }

      slow()
    `)

    await s.expectRunning()
    s.abort()

    await s.expectFailed("Stopped")
    expect(s.page.counter("a")).toBe(0)
  })

  test("a failure inside a custom function surfaces from the call", async () => {
    const s = await runScript(`
      fun clickValue(value) {
        click(value)
      }

      clickValue(counterA)
    `)

    await s.expectFailed(/elements is not a function/)
    expect(s.page.counter("a")).toBe(0)
  })
})
