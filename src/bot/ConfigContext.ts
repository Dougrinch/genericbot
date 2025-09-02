import { createMutableStateReducer } from "../utils/mutableStateReducer.ts"
import { type Config, configUpdaters, initialBotState } from "./Config.ts"

import { createStore } from "../utils/Store.ts"
import type { Draft } from "immer"

const store = createStore(createMutableStateReducer(configUpdaters), () => {
  return initialBotState() as Draft<Config>
})

export function useConfig(): Config
export function useConfig<T>(selector: (state: Config) => T): T
export function useConfig<T>(selector?: (state: Config) => T): T | Config {
  return store.useStoreState(selector)
}

export const dispatch = store.dispatch
