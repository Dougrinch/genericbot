import { describe, expect, test } from "vitest"
import { type Action, createMutableStateReducer } from "../../src/utils/mutableStateReducer.ts"

type State = { v: string }

const api = {
  doA(state: State): void {
    state.v = "doA()"
  },
  doB(state: State, payload: { n: number }): void {
    state.v = `doB(${JSON.stringify(payload)})`
  },
  doC(state: State, payload: { s: string, n: number }): void {
    state.v = `doC(${JSON.stringify(payload)})`
  }
}

describe("reducer", () => {
  test("just works", async () => {
    const reducer = createMutableStateReducer(api)

    function check(action: Action<typeof api>) {
      const oldState = { v: "old" }
      const newState = reducer(oldState, action)
      expect(oldState.v).toBe("old")
      expect(newState.v).toMatch(new RegExp(`^${action.type}\\(.*`))
    }

    check({ type: "doA" })
    check({ type: "doB", n: 123 })
    check({ type: "doC", s: "hi", n: 5 })
  })
})
