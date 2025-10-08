import { describe, expect, test } from "vitest"
import { toIdentifier } from "../../src/utils/Identifiers.ts"

describe("Identifiers", () => {
  test("simple test", () => {
    expect(toIdentifier("buy")).toEqual("buy")
    expect(toIdentifier("Buy")).toEqual("buy")
    expect(toIdentifier("WIN")).toEqual("win")
    expect(toIdentifier("Buy Gnome")).toEqual("buyGnome")
    expect(toIdentifier("WIN GAME")).toEqual("winGame")
    expect(toIdentifier("createBuilding")).toEqual("createBuilding")
    expect(toIdentifier("reset1ButtonCOOL")).toEqual("reset1ButtonCool")
    expect(toIdentifier("reset1COOLButton")).toEqual("reset1CoolButton")
    expect(toIdentifier("Go to Microworld")).toEqual("goToMicroworld")
  })
})
