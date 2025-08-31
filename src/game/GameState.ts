import type { Draft, Immutable } from "immer";
import { type Actions } from "../utils/mutableStateReducer.ts";

export type GameState = Immutable<{
  gold: number;
  gnomes: number;
  snowWhites: number;
}>

export function initialGameState(): GameState {
  return {
    gold: 0,
    gnomes: 0,
    snowWhites: 0
  }
}

export type GameEvent = Actions<typeof gameUpdaters>

export const gameUpdaters = {
  dig(state: Draft<GameState>) {
    state.gold += 1
  },
  buyGnome(state: Draft<GameState>) {
    const price = getGnomePrice(state)
    if (state.gold >= price) {
      state.gold -= price
      state.gnomes += 1
    }
  },
  buySnowWhite(state: Draft<GameState>) {
    const price = getSnowWhitePrice(state)
    if (state.gold >= price) {
      state.gnomes -= price
      state.snowWhites += 1
    }
  },
  tick(state: Draft<GameState>, action: { dt: number }) {
    const totalIncome = state.gnomes + (state.snowWhites * 10)
    if (totalIncome > 0) {
      state.gold += totalIncome * (action.dt! / 1000)
    }
  },
}

export const getGnomePrice = (state: GameState) => 10 + (state.gnomes * 5)
export const getSnowWhitePrice = (state: GameState) => 7 + state.snowWhites
