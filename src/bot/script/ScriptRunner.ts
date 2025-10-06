import type { BotManager } from "../logic/BotManager.ts"
import { compile } from "./ScriptCompiler.ts"
import type { FunctionDescriptor, ScriptExternals, VariableDescriptor } from "./ScriptExternals.ts"
import { useBotManagerContext } from "../BotManagerContext.tsx"
import type { ElementConfig, VariableConfig } from "../logic/Config.ts"
import { toIdentifier } from "../../utils/identifiers.ts"
import { parser } from "./generated/script.ts"
import { lint } from "./ScriptLinter.ts"

export function useScriptExtensions(): ScriptExternals {
  return useBotManagerContext().useStoreState(bm => bm.scriptRunner.getScriptExtensions())
}

type Extensions = {
  functions: FunctionExtension[]
  variables: VariableExtension[]

  scriptExternals: ScriptExternals
}

type FunctionExtension = {
  desc: FunctionDescriptor
  value: unknown
}

type VariableExtension = {
  desc: VariableDescriptor
  value: unknown
}

export class ScriptRunner {
  private readonly bot: BotManager

  private variables: readonly VariableConfig[]
  private elements: readonly ElementConfig[]

  private extensions: Extensions

  constructor(botState: BotManager) {
    this.bot = botState
    this.variables = this.bot.config.getConfig().variables
    this.elements = this.bot.config.getConfig().elements
    this.extensions = this.buildExtensions()
  }

  private buildExtensions(): Extensions {
    const functions: FunctionExtension[] = [...staticFunctionExtensions]
    const variables: VariableExtension[] = []

    for (const element of this.elements.values()) {
      functions.push(this.elementExtension(element))
    }

    for (const variable of this.variables.values()) {
      variables.push(this.variableExtension(variable))
    }

    const scriptExtensions: ScriptExternals = {
      functions: new Map(functions.map(f => [f.desc.name, f.desc])),
      variables: new Map(variables.map(v => [v.desc.name, v.desc]))
    }

    return {
      functions, variables, scriptExternals: scriptExtensions
    }
  }

  private revalidate() {
    const newVariables = this.bot.config.getConfig().variables
    const newElements = this.bot.config.getConfig().elements
    if (newVariables !== this.variables || newElements !== this.elements) {
      this.variables = newVariables
      this.elements = newElements
      this.extensions = this.buildExtensions()
    }
  }

  getScriptExtensions() {
    this.revalidate()
    return this.extensions.scriptExternals
  }

  run(script: string, signal: AbortSignal): Promise<void> {
    this.revalidate()
    const tree = parser.parse(script)
    const lintResult = lint(tree, script, this.extensions.scriptExternals)
    const compilationResult = compile(lintResult)
    const context = this.createContext(signal)
    return compilationResult!.function(context)
  }

  private createContext(signal: AbortSignal) {
    const context = {}

    for (const func of this.extensions.functions) {
      Object.defineProperty(context, func.desc.name, {
        value: func.value
      })
    }

    for (const variable of this.extensions.variables) {
      Object.defineProperty(context, variable.desc.name, {
        value: variable.value
      })
    }

    Object.defineProperty(context, "signal", {
      value: signal
    })

    return context
  }

  private variableExtension(variable: VariableConfig): VariableExtension {
    return {
      desc: {
        name: toIdentifier(variable.name),
        async: false
      },
      value: () => {
        return this.bot.variables.getValue(variable.id)!.value
      }
    }
  }

  private elementExtension(element: ElementConfig): FunctionExtension {
    return {
      desc: {
        name: toIdentifier(element.name),
        async: true,
        arguments: []
      },
      value: async () => {
        const elements = this.bot.elements.getValue(element.id)?.value
        if (elements) {
          for (const e of elements) {
            e.click()
          }
          await new Promise(resolve => setTimeout(resolve, 0))
        }
      }
    }
  }
}

const staticFunctionExtensions: FunctionExtension[] = [{
  desc: {
    name: "repeat",
    async: true,
    arguments: [{
      name: "n",
      async: false,
      implicit: false
    }, {
      name: "f",
      async: true,
      implicit: false
    }],
    lastAsBlock: true
  },
  value: async function (n: number, f: (i: number) => Promise<void>) {
    for (let i = 0; i < n; i++) {
      await f(i)
    }
  }
}, {
  desc: {
    name: "wait",
    async: true,
    arguments: [{
      name: "ms",
      async: false,
      implicit: false
    }, {
      name: "signal",
      async: false,
      implicit: true
    }]
  },
  value: async function (ms: number, signal: AbortSignal): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (signal.aborted) {
        // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
        reject(signal.reason)
        return
      }

      let id: ReturnType<typeof setTimeout> | null = null

      function onAbort() {
        clearTimeout(id!)
        signal.removeEventListener("abort", onAbort)
        // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
        reject(signal.reason)
      }

      signal.addEventListener("abort", onAbort, { once: true })

      id = setTimeout(() => {
        signal.removeEventListener("abort", onAbort)
        resolve()
      }, ms)
    })
  }
}, {
  desc: {
    name: "print",
    async: false,
    arguments: [{
      name: "msg",
      async: false
    }]
  },
  value: function (msg: unknown) {
    console.log(msg)
  }
}]
