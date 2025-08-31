import { createMutableStateReducer } from "../utils/mutableStateReducer.ts";
import { create } from "zustand/react";
import { redux } from "zustand/middleware";
import { type BotEvent, type BotState, botUpdaters, initialBotState } from "./BotState.ts";

export const useBot = create(redux(
  createMutableStateReducer(botUpdaters),
  initialBotState()
));

export function useBotState(): BotState;
export function useBotState<T>(selector: (state: BotState) => T): T;
export function useBotState<T>(selector?: (state: BotState) => T): T | BotState {
  return useBot(selector || (s => s as T | BotState))
}

export function useDispatch(): (event: BotEvent) => void {
  return useBot(s => s.dispatch)
}
