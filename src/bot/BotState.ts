import type { Draft, Immutable } from "immer";
import { type Actions } from "../utils/mutableStateReducer.ts";

export type BotState = Immutable<{
  enabled: boolean;
}>

export function initialBotState(): BotState {
  return {
    enabled: false
  }
}

export type BotEvent = Actions<typeof botUpdaters>

export const botUpdaters = {
  buttonClicked(state: Draft<BotState>) {
    state.enabled = !state.enabled
  },
}
