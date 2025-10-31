import { createContext, type DependencyList, useCallback, useContext, useMemo, useRef } from "react"
import { BotManager } from "./logic/BotManager.ts"
import type { Dispatch } from "../utils/ManagerStore.ts"
import type { Observable } from "rxjs"
import { useObservable } from "../utils/observables/Hook.ts"


export function useBotObservable<T>(factory: (m: BotManager) => Observable<T>, deps: DependencyList): T {
  const manager = useBotManagerContext().manager

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const cachedFactory = useCallback(factory, deps)

  const observable = useMemo(() => {
    return cachedFactory(manager)
  }, [manager, cachedFactory])

  return useObservable(observable)
}

export function useDispatch(): Dispatch<BotManager> {
  return useBotManagerContext().dispatch
}


export type BotManagerContextData = {
  manager: BotManager
  get dispatch(): Dispatch<BotManager>
}

export const BotManagerContext = createContext<BotManagerContextData | null>(null)

export function useBotManagerContext() {
  const context = useContext(BotManagerContext)
  if (context === null) {
    throw new Error("useBotManagerContext must be used within a BotManagerContext")
  }
  return context
}

export function useBotManager(create: () => BotManager): BotManagerContextData {
  const botManagerRef = useRef<BotManager>(null)

  if (botManagerRef.current !== null) {
    botManagerRef.current.close()
  }

  botManagerRef.current = create()
  botManagerRef.current.init()

  return createBotManagerContext(botManagerRef.current)
}

function createBotManagerContext(manager: BotManager) {
  function buildDispatch(steps: string[] = []): Dispatch<BotManager> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new Proxy(function () {} as any as Dispatch<BotManager>, {
      get(_target, prop) {
        if (typeof prop !== "string") {
          throw new Error(`${String(prop)} (${typeof prop}) not supported`)
        }
        return buildDispatch([...steps, prop])
      },

      apply(_target, _thisArg, argArray) {
        let current = manager as object
        for (let i = 0; i < steps.length - 1; i++) {
          const step = steps[i] as keyof typeof current
          if (typeof current[step] !== "object") {
            throw new TypeError(`Tried to call non-object property "${String(step)}"`)
          }
          current = current[step]
        }
        const lastStep = steps[steps.length - 1] as keyof typeof current
        const func = current[lastStep]
        if (typeof func !== "function") {
          throw new TypeError(`Tried to call non-function property "${String(lastStep)}"`)
        }
        Reflect.apply(func, current, argArray)
      }
    })
  }

  return {
    manager,
    dispatch: buildDispatch()
  }
}
