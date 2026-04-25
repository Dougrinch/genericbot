import { expect } from "vitest"
import { firstValueFrom } from "rxjs"
import { BotManager } from "../../src/bot/logic/BotManager.ts"
import type { ActionConfig, Config } from "../../src/bot/logic/Config.ts"
import { CONFIG_STORAGE_KEY } from "../../src/bot/logic/ConfigManager.ts"
import type { CompilationResult } from "../../src/bot/script/ScriptCompiler.ts"
import type { Action } from "../../src/bot/logic/ActionsManager.ts"

type ScriptCompilationTestUtils = {
  elements?: string[]
  variables?: string[]
  script: string
  expected: string
  usedFunctions?: string[]
  usedVariables?: string[]
}

type CompiledScriptAction = Action & {
  readonly compilationResult: CompilationResult
}

export async function expectScriptCompilation(testCase: ScriptCompilationTestUtils): Promise<void> {
  const bot = createBotManager()

  seedElements(bot, testCase.elements ?? [])
  seedVariables(bot, testCase.variables ?? [])

  const result = await firstValueFrom(bot.scriptActionFactory.runnableScript(scriptAction(testCase.script)))

  if (!result.ok) {
    throw new Error(result.error)
  }

  const compilation = (result.value as CompiledScriptAction).compilationResult

  expect(normalizeCode(compiledBlockContent(compilation.code))).toEqual(normalizeCode(testCase.expected))
  if (testCase.usedFunctions !== undefined) {
    expect(Array.from(compilation.usedFunctions)).toEqual(testCase.usedFunctions)
  }
  if (testCase.usedVariables !== undefined) {
    expect(Array.from(compilation.usedVariables)).toEqual(testCase.usedVariables)
  }
}

function createBotManager(): BotManager {
  resetConfigStorage()
  return new BotManager()
}

function resetConfigStorage(): void {
  installTestLocalStorage()

  const config: Config = {
    actions: [],
    variables: [],
    elements: []
  }

  const serializedConfig = JSON.stringify(config)
  localStorage.clear()
  localStorage.setItem(CONFIG_STORAGE_KEY, serializedConfig)
  localStorage.setItem(CONFIG_STORAGE_KEY + "_" + window.location.href, serializedConfig)
}

function installTestLocalStorage(): void {
  const currentStorage = globalThis.localStorage as Partial<Storage> | undefined
  const hasStorageMethods = typeof currentStorage?.clear === "function"
    && typeof currentStorage.getItem === "function"
    && typeof currentStorage.removeItem === "function"
    && typeof currentStorage.setItem === "function"

  if (hasStorageMethods) {
    return
  }

  const storedValues = new Map<string, string>()
  const storage = {
    get length() {
      return storedValues.size
    },
    clear() {
      storedValues.clear()
    },
    getItem(key: string) {
      return storedValues.get(key) ?? null
    },
    key(index: number) {
      return Array.from(storedValues.keys())[index] ?? null
    },
    removeItem(key: string) {
      storedValues.delete(key)
    },
    setItem(key: string, value: string) {
      storedValues.set(key, value)
    }
  } as Storage

  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: storage
  })
}

function seedElements(bot: BotManager, elementNames: string[]): void {
  for (const [index, elementName] of elementNames.entries()) {
    const id = `elem_${index + 1}`
    bot.config.addElement()
    bot.config.updateElement(id, {
      id,
      name: elementName,
      xpath: `//*[@data-test-element='${index + 1}']`,
      allowMultiple: false,
      includeInvisible: true
    })
  }
}

function seedVariables(bot: BotManager, variableNames: string[]): void {
  for (const [index, variableName] of variableNames.entries()) {
    const id = `var_${index + 1}`
    bot.config.addVariable()
    bot.config.updateVariable(id, {
      id,
      name: variableName,
      elementType: "xpath",
      xpath: `//*[@data-test-variable='${index + 1}']`,
      element: "",
      regex: "",
      type: "number"
    })
  }
}

function scriptAction(script: string): ActionConfig {
  return {
    id: "action_1",
    name: "Custom script",
    type: "script",
    xpath: "",
    script,
    element: "",
    periodic: false,
    interval: 100,
    allowMultiple: false
  }
}

function normalizeCode(code: string): string {
  return code
    .split("\n")
    .map(line => line.replace(/^\s+/, ""))
    .join("\n")
    .trim()
}

function compiledBlockContent(code: string): string {
  const lines = code.split("\n")
  return lines.slice(1, -1).join("\n")
}
