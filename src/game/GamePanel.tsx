import { getGnomePrice, getSnowWhitePrice } from "./GameState.ts"
import { dispatch, useGame } from "./GameStateContext.ts"

export function GamePanel() {
  return (
    <>
      <h1>Gnome Gold Mine</h1>
      <div className="card">
        <div style={{ marginBottom: "20px", fontSize: "18px" }}>
          <GameTopPanel />
        </div>

        <div style={{ marginBottom: "10px" }}>
          <DigButton />
        </div>

        <div style={{ marginBottom: "10px" }}>
          <BuyGnomeButton />
        </div>

        <div>
          <BuySnowWhiteButton />
        </div>
      </div>
    </>
  )
}

function GameTopPanel() {
  const state = useGame()
  return (
    <>
      <div>Gold: {Math.floor(state.gold)}</div>
      <div>Income Rate: {state.gnomes + (state.snowWhites * 10)} gold/second</div>
      <div>Gnomes: {state.gnomes}</div>
      <div>Snow Whites: {state.snowWhites}</div>
    </>
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
