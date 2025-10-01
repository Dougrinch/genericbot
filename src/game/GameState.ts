import type { Draft, Immutable } from "immer"

export type GameState = Immutable<{
  gold: number
  gnomes: number
  snowWhites: number

  income: number
  realIncome: number
  oldGold: number
  uncountedMs: number
}>

export function initialGameState(): GameState {
  return {
    gold: 0,
    gnomes: 0,
    snowWhites: 0,
    income: 0,
    realIncome: 0,
    oldGold: 0,
    uncountedMs: 0
  }
}

export const gameUpdaters = {
  reset(game: Draft<GameState>) {
    Object.assign(game, initialGameState())
  },
  resetGold(game: Draft<GameState>) {
    game.gold = 0
  },
  dig(game: Draft<GameState>) {
    game.gold += 1
  },
  buyGnome(game: Draft<GameState>) {
    const price = getGnomePrice(game)
    if (game.gold >= price) {
      game.gold -= price
      game.gnomes += 1
      game.income = getIncome(game)
    }
  },
  buySnowWhite(game: Draft<GameState>) {
    const price = getSnowWhitePrice(game)
    if (game.gnomes >= price) {
      game.gnomes -= price
      game.snowWhites += 1
      game.income = getIncome(game)
    }
  },
  tick(game: Draft<GameState>, action: { dt: number }) {
    if (game.income > 0) {
      game.gold += game.income * (action.dt / 1000)
    }
    game.uncountedMs += action.dt
    if (game.uncountedMs > 100) {
      game.realIncome = Math.floor((game.gold - game.oldGold) * 1000 / game.uncountedMs)
      game.uncountedMs = 0
      game.oldGold = game.gold
    }
  }
}

function getIncome(game: GameState) {
  return game.gnomes + (game.snowWhites * 10)
}

export const getGnomePrice = (game: GameState) => 10 + (game.gnomes * 5)
export const getSnowWhitePrice = (game: GameState) => 7 + game.snowWhites
