import { describe, expect, test } from "vitest"
import { toIdentifier } from "../../src/utils/Identifiers.ts"

describe("Identifiers", () => {
  test("simple test", () => {
    expect(toIdentifier("buy")).toEqual("buy")
    expect(toIdentifier("Buy")).toEqual("buy")
    expect(toIdentifier("Buy Gnome")).toEqual("buyGnome")
    expect(toIdentifier("WIN GAME")).toEqual("winGame")
    expect(toIdentifier("createBuilding")).toEqual("createBuilding")
    expect(toIdentifier("reset1Button")).toEqual("reset1Button")
  })
})
