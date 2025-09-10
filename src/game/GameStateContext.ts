import { createMutableStateReducer } from "../utils/MutableStateReducer.ts"
import { type GameState, gameUpdaters, initialGameState } from "./GameState.ts"
import { createReducerStore } from "../utils/Store.ts"

const store = createReducerStore(createMutableStateReducer(gameUpdaters), initialGameState)

export const dispatch = store.dispatch

export function useGame(): GameState
export function useGame<T>(selector: (state: GameState) => T): T
export function useGame<T>(selector?: (state: GameState) => T): T | GameState {
  return store.useStoreState(gs => selector ? selector(gs) : gs)
}
