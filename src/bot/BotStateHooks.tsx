import { createMutableStateReducer } from "../utils/mutableStateReducer.ts"
import { type BotState, type Config, initialBotState, stateUpdaters } from "./BotState.ts"

import { createStore } from "../utils/Store.ts"
import type { Draft } from "immer"
import type { MarkImmutable } from "../utils/immutables.ts"

const store = createStore(createMutableStateReducer(stateUpdaters), () => {
  return initialBotState() as Draft<BotState>
})

export function useConfig(): MarkImmutable<Config>
export function useConfig<T>(selector: (state: MarkImmutable<Config>) => T): T
export function useConfig<T>(selector?: (state: MarkImmutable<Config>) => T): T | MarkImmutable<Config> {
  return store.useStoreState(bs => selector ? selector(bs.config) : bs.config)
}

export function useVariableValue(id: string): number | string | undefined {
  return store.useStoreState(bs => bs.variables.get(id)?.value)
}

export function useVariableData(id: string) {
  return store.useStoreState(bs => ([
    bs.variables.get(id)?.statusLine,
    bs.variables.get(id)?.statusType
  ]))
}

export const dispatch = store.dispatch
