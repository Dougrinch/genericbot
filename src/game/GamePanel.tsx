import { getGnomePrice, getSnowWhitePrice } from "./GameState.ts"
import { dispatch, useGame } from "./GameStateContext.ts"

export function GamePanel() {
  return (
    <div className="game-panel">
      <div className="game-header">
        <GameTopPanel />
        <h1>Gnome Gold Mine</h1>
      </div>
      <div className="game-buttons">
        <DigButton />
        <BuyGnomeButton />
        <BuySnowWhiteButton />
      </div>
    </div>
  )
}

function GameTopPanel() {
  const state = useGame()
  return (
    <div className="game-stats">
      <div className="game-stats-left">
        <div>Income: {state.gnomes + (state.snowWhites * 10)}/sec</div>
        <div>Gnomes: {state.gnomes}</div>
        <div>Snow Whites: {state.snowWhites}</div>
      </div>
      <div className="game-stats-center">
        <div>Gold: {Math.floor(state.gold)}</div>
      </div>
    </div>
  )
}

function DigButton() {
  return (
    <button onClick={() => dispatch({ type: "dig" })}>
      Dig for 1 Gold
    </button>
  )
}

function BuyGnomeButton() {
  const [price, enabled] = useGame(s => {
    const price = getGnomePrice(s)
    return [price, s.gold >= getGnomePrice(s)]
  })

  return (
    <button
      onClick={() => dispatch({ type: "buyGnome" })}
      disabled={!enabled}
      style={{
        opacity: enabled ? 1 : 0.5,
        cursor: enabled ? "pointer" : "not-allowed"
      }}
    >
      Buy Gnome ({price} gold)
    </button>
  )
}

function BuySnowWhiteButton() {
  const gnomes = useGame(s => s.gnomes)
  const price = useGame(s => getSnowWhitePrice(s))

  return (
    <button
      onClick={() => dispatch({ type: "buySnowWhite" })}
      disabled={gnomes < price}
      style={{
        opacity: gnomes < price ? 0.5 : 1,
        cursor: gnomes < price ? "not-allowed" : "pointer"
      }}
    >
      Buy Snow White ({price} gnomes)
    </button>
  )
}
