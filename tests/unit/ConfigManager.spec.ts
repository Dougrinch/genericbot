import { beforeEach, describe, expect, test } from "vitest"
import { firstValueFrom } from "rxjs"
import { CONFIG_STORAGE_KEY, ConfigManager } from "../../src/bot/logic/ConfigManager.ts"


describe("ConfigManager number separators", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  test("adds separator defaults to legacy variables", async () => {
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify({
      actions: [],
      elements: [],
      variables: [{
        id: "var_1",
        name: "Legacy",
        elementType: "xpath",
        xpath: "//strong",
        element: "",
        regex: "",
        type: "number"
      }]
    }))

    const manager = new ConfigManager()
    const config = await firstValueFrom(manager.config())

    expect(config.variables[0].decimalSeparator).toBe(".")
    expect(config.variables[0].thousandsSeparator).toBe(",")
  })

  test("uses separator defaults for new variables", async () => {
    const manager = new ConfigManager()
    manager.addVariable()
    const config = await firstValueFrom(manager.config())

    expect(config.variables[0].decimalSeparator).toBe(".")
    expect(config.variables[0].thousandsSeparator).toBe(",")
  })
})
