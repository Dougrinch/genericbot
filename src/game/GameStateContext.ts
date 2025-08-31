import { createMutableStateReducer } from "../utils/mutableStateReducer.ts";
import { create } from "zustand/react";
import { redux } from "zustand/middleware";
import { type GameEvent, type GameState, gameUpdaters, initialGameState } from "./GameState.ts";

export const useGame = create(redux(
  createMutableStateReducer(gameUpdaters),
  initialGameState()
));

export function useGameState(): GameState {
  return useGame(s => s)
}

export function useDispatch(): (event: GameEvent) => void {
  return useGame(s => s.dispatch)
}
