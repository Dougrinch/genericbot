import { describe, expect, test } from "vitest"
import { pressKey } from "../../src/bot/script/Keyboard.ts"


describe("pressKey", () => {
  test("dispatches a complete keyboard press with a standard letter code", () => {
    const events: KeyboardEvent[] = []
    const listener = (event: KeyboardEvent) => events.push(event)
    document.addEventListener("keydown", listener)
    document.addEventListener("keyup", listener)

    pressKey("w")

    document.removeEventListener("keydown", listener)
    document.removeEventListener("keyup", listener)
    expect(events.map(event => event.type)).toEqual(["keydown", "keyup"])
    expect(events.map(event => event.key)).toEqual(["w", "w"])
    expect(events.map(event => event.code)).toEqual(["KeyW", "KeyW"])
  })

  test("keeps an explicit non-letter key as its code", () => {
    let code = ""
    const listener = (event: KeyboardEvent) => {
      code = event.code
    }
    document.addEventListener("keydown", listener)

    pressKey("ArrowUp")

    document.removeEventListener("keydown", listener)
    expect(code).toBe("ArrowUp")
  })
})
