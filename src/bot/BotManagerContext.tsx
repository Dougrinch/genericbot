import { createContext, useContext, useEffect, useMemo, useRef, useSyncExternalStore } from "react"
import { BotManager } from "./logic/BotManager.ts"
import { type Dispatch } from "../utils/ManagerStore.ts"
import type { ConfigManager } from "./logic/ConfigManager.ts"
import type { VariablesManager } from "./logic/VariablesManager.ts"
import type { ActionsManager } from "./logic/ActionsManager.ts"
import type { ElementsManager } from "./logic/ElementsManager.ts"
import { useGetSnapshot } from "../utils/Store.ts"


export function useConfigManager<T>(selector: (cm: ConfigManager) => T): T {
  return useBotManagerContext().useStoreState(bm => selector(bm.config))
}

export function useVariablesManager<T>(selector: (vm: VariablesManager) => T): T {
  return useBotManagerContext().useStoreState(bm => selector(bm.variables))
}

export function useActionsManager<T>(selector: (am: ActionsManager) => T): T {
  return useBotManagerContext().useStoreState(bm => selector(bm.actions))
}

export function useElementsManager<T>(selector: (em: ElementsManager) => T): T {
  return useBotManagerContext().useStoreState(bm => selector(bm.elements))
}


export function useDispatch(): Dispatch<BotManager> {
  return useBotManagerContext().dispatch
}


export const BotManagerContext = createContext<BotManagerContextData | null>(null)

function useBotManagerContext() {
  const context = useContext(BotManagerContext)
  if (context === null) {
    throw new Error("useBotManagerContext must be used within a BotManagerContext")
  }
  return context
}

type BotManagerContextData = {
  useStoreState<T>(selector: (bm: BotManager) => T): T
  get dispatch(): Dispatch<BotManager>
}


export function useBotManager(): BotManagerContextData {
  const botManagerRef = useRef<BotManager | null>(null)

  if (botManagerRef.current === null) {
    botManagerRef.current = new BotManager()
    botManagerRef.current.init()
  }

  useEffect(() => {
    return () => {
      botManagerRef.current?.close()
      botManagerRef.current = null
    }
  }, [])

  const botManager = botManagerRef.current

  return useMemo(() => createBotManagerContext(botManager), [botManager])
}

function createBotManagerContext(manager: BotManager) {
  return {
    useStoreState: function <T>(selector: (bm: BotManager) => T): T {
      return useSyncExternalStore(onChange => manager.subscribe(onChange), useGetSnapshot(() => selector(manager)))
    },

    get dispatch(): Dispatch<BotManager> {
      function build(steps: string[]) {
        return new Proxy(function () {}, {
          get(_target, prop) {
            if (typeof prop !== "string") {
              throw new Error(`${String(prop)} (${typeof prop}) not supported`)
            }
            return build([...steps, prop])
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
            manager.notifyListeners()
          }
        })
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return build([]) as any as Dispatch<BotManager>
    }
  }
}
