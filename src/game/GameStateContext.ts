import { createMutableStateReducer } from "../utils/mutableStateReducer.ts"
import { type GameState, gameUpdaters, initialGameState } from "./GameState.ts"
import { createStore } from "../utils/Store.ts"

const store = createStore(createMutableStateReducer(gameUpdaters), initialGameState)

export const dispatch = store.dispatch

export function useGame(): GameState
export function useGame<T>(selector: (state: GameState) => T): T
export function useGame<T>(selector?: (state: GameState) => T): T {
  return store.useStoreState(selector)
}
