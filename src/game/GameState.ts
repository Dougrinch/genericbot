import type { Draft, Immutable } from "immer"
import type { Action } from "../utils/mutableStateReducer.ts"

export type GameState = Immutable<{
  gold: number
  gnomes: number
  snowWhites: number
}>

export function initialGameState(): GameState {
  return {
    gold: 0,
    gnomes: 0,
    snowWhites: 0
  }
}

export type GameEvent = Action<typeof gameUpdaters>

export const gameUpdaters = {
  dig(game: Draft<GameState>) {
    game.gold += 1
  },
  buyGnome(game: Draft<GameState>) {
    const price = getGnomePrice(game)
    if (game.gold >= price) {
      game.gold -= price
      game.gnomes += 1
    }
  },
  buySnowWhite(game: Draft<GameState>) {
    const price = getSnowWhitePrice(game)
    if (game.gold >= price) {
      game.gnomes -= price
      game.snowWhites += 1
    }
  },
  tick(game: Draft<GameState>, action: { dt: number }) {
    const totalIncome = game.gnomes + (game.snowWhites * 10)
    if (totalIncome > 0) {
      game.gold += totalIncome * (action.dt! / 1000)
    }
  }
}

export const getGnomePrice = (game: GameState) => 10 + (game.gnomes * 5)
export const getSnowWhitePrice = (game: GameState) => 7 + game.snowWhites
