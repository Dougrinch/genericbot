import { describe, expect, test } from "vitest"
import { createManagerStore } from "../../src/utils/ManagerStore.ts"
import type { Config, VariableConfig } from "../../src/bot/logic/Config.ts"

class BotState {
  configManager: ConfigManager = new ConfigManager(this)
  variablesManager: VariablesManager = new VariablesManager(this)
  config: Config = {} as Config
}

class ConfigManager {
  private state: BotState
  private variableUpdates: [string, Partial<VariableConfig>][] = []

  constructor(state: BotState) {
    this.state = state
  }

  update(id: string, updates: Partial<VariableConfig>): void {
    this.variableUpdates.push([id, updates])
  }

  getCombinedUpdates(id: string): Partial<VariableConfig> {
    let result = {}
    for (const [id2, updates] of this.variableUpdates) {
      if (id2 === id) {
        result = { ...result, ...updates }
      }
    }
    return result
  }

  clear(): void {
    this.variableUpdates = []
  }
}

class VariablesManager {
  private state: BotState

  constructor(state: BotState) {
    this.state = state
  }

  clear(): void {
    this.state.configManager.clear()
  }
}

describe("ManagerStore", () => {
  test("dispatch works", () => {
    const state = new BotState()
    const { dispatch } = createManagerStore(() => state)
    dispatch.configManager.update("var_1", { name: "A" })
    expect(state.configManager.getCombinedUpdates("var_1")).toStrictEqual({ name: "A" })
    dispatch.variablesManager.clear()
    expect(state.configManager.getCombinedUpdates("var_1")).toStrictEqual({})
  })
})
