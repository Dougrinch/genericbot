import type { BotManager } from "../logic/BotManager.ts"
import { asContext, type CompilationResult, compile, type Context } from "./ScriptCompiler.ts"
import type { FunctionDescriptor, ScriptExternals, VariableDescriptor } from "./ScriptExternals.ts"
import { useBotObservable } from "../BotManagerContext.tsx"
import type { ActionConfig, ElementConfig, VariableConfig } from "../logic/Config.ts"
import { toIdentifier } from "../../utils/Identifiers.ts"
import { parser } from "./generated/script.ts"
import { lint } from "./ScriptLinter.ts"
import { BehaviorSubject, combineLatestWith, type Observable } from "rxjs"
import { map } from "rxjs/operators"
import { ok, type Result } from "../../utils/Result.ts"
import { shared } from "../../utils/observables/Shared.ts"
import type { Action } from "../logic/ActionsManager.ts"

export function useScriptExtensions(): ScriptExternals {
  return useBotObservable(m => m.scriptActionFactory.scriptExternals(), [])
}

type Extensions = {
  functions: FunctionExtension[]
  variables: VariableExtension[]

  scriptExternals: ScriptExternals
}

type Descriptor = {
  name: string
}

type ValueExtension<D extends Descriptor, V> = {
  desc: D
  value?: V
  valueSubscription?: () => ValueSubscription<V>
}

type FunctionExtension = ValueExtension<FunctionDescriptor, ExtensionFunctionValue>
type VariableExtension = ValueExtension<VariableDescriptor, ExtensionVariableValue>

// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
type ExtensionFunctionValue = Function
type ExtensionVariableValue = () => unknown

type ValueSubscription<T> = {
  value: T
  stop(): void
}

export class ScriptActionFactory {
  private readonly bot: BotManager

  constructor(botState: BotManager) {
    this.bot = botState
  }

  private buildExtensions(elementConfigs: readonly ElementConfig[], variableConfigs: readonly VariableConfig[]): Extensions {
    const functions: FunctionExtension[] = [...staticFunctionExtensions]
    const variables: VariableExtension[] = []

    for (const element of elementConfigs) {
      functions.push(this.elementExtension(element))
    }

    for (const variable of variableConfigs) {
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

  scriptExternals(): Observable<ScriptExternals> {
    return this.extensions()
      .pipe(
        map(e => e.scriptExternals)
      )
  }

  @shared
  private extensions(): Observable<Extensions> {
    return this.bot.config.variables()
      .pipe(
        combineLatestWith(this.bot.config.elements()),
        map(([v, e]) => this.buildExtensions(e, v))
      )
  }

  runnableScript(action: ActionConfig): Observable<Result<Action>> {
    return this.extensions()
      .pipe(
        map(extensions => {
          const tree = parser.parse(action.script)
          const lintResult = lint(tree, action.script, extensions.scriptExternals)
          const compilationResult = compile(lintResult)
          if (!compilationResult.ok) {
            return compilationResult
          }
          const contextFactory = (signal: AbortSignal) => this.createContext(compilationResult.value, extensions, signal)
          const result: Action = {
            async run(signal: AbortSignal): Promise<void> {
              const context = contextFactory(signal)
              try {
                return await compilationResult.value.function(context.context)
              } finally {
                context.stop()
              }
            },
            periodic: action.periodic,
            interval: action.interval
          }
          return ok(result)
        })
      )
  }

  private createContext(compilationResult: CompilationResult, extensions: Extensions, signal: AbortSignal): {
    context: Context
    stop: () => void
  } {
    const context = asContext({})
    const subscriptions: ValueSubscription<unknown>[] = []

    function hasOwn<T extends object, K extends keyof T>(obj: T, key: K): obj is T & Required<Pick<T, K>> {
      return Object.hasOwn(obj, key)
    }

    function add(extension: ValueExtension<Descriptor, unknown>) {
      if (hasOwn(extension, "valueSubscription") && hasOwn(extension, "value")) {
        throw Error(`Only one of valueFactory/value is allowed. Function: ${extension.desc.name}`)
      }

      if (hasOwn(extension, "valueSubscription")) {
        const subscription = extension.valueSubscription()
        subscriptions.push(subscription)
        Object.defineProperty(context, extension.desc.name, {
          value: subscription.value
        })
      } else {
        Object.defineProperty(context, extension.desc.name, {
          value: extension.value
        })
      }
    }

    for (const func of extensions.functions) {
      if (compilationResult.usedFunctions.has(func.desc.name)) {
        add(func)
      }
    }

    for (const variable of extensions.variables) {
      if (compilationResult.usedVariables.has(variable.desc.name)) {
        add(variable)
      }
    }

    Object.defineProperty(context, "signal", {
      value: signal
    })

    return {
      context,
      stop: () => {
        for (const factory of subscriptions) {
          factory.stop()
        }
      }
    }
  }

  private variableExtension(variable: VariableConfig): VariableExtension {
    return {
      desc: {
        name: toIdentifier(variable.name),
        async: false
      },
      valueSubscription: () => {
        return this.createValueSubscription(
          this.bot.variables.value(variable.id),
          get => () => {
            const result = get()
            return result.ok ? result.value : undefined
          }
        )
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
      valueSubscription: () => {
        return this.createValueSubscription(
          this.bot.elements.value(element.id),
          get => async () => {
            const result = get()
            const elements = result.ok ? result.value : undefined
            if (elements) {
              for (const e of elements) {
                e.click()
              }
              await new Promise(resolve => setTimeout(resolve, 0))
            }
          }
        )
      }
    }
  }

  private createValueSubscription<T, V>(observable: Observable<T>, f: (get: () => T) => V): ValueSubscription<V> {
    const UNSET = {}
    const subject = new BehaviorSubject<T | typeof UNSET>(UNSET)
    const subscription = observable.subscribe(subject)
    return {
      value: f(() => {
        const value = subject.value
        if (value === UNSET) {
          throw Error("Value must be calculated")
        }
        return value as T
      }),
      stop: () => subscription.unsubscribe()
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
        reject(signal.reason)
        return
      }

      let id: ReturnType<typeof setTimeout> | null = null

      function onAbort() {
        clearTimeout(id!)
        signal.removeEventListener("abort", onAbort)
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
