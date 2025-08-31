import { getGnomePrice, getSnowWhitePrice } from "./GameState.ts";
import { useShallow } from "zustand/react/shallow";
import { useDispatch, useGame, useGameState } from "./GameStateContext.ts";

export function GamePanel() {
  return (
    <>
      <h1>Gnome Gold Mine</h1>
      <div className="card">
        <div style={{ marginBottom: '20px', fontSize: '18px' }}>
          <GameTopPanel/>
        </div>

        <div style={{ marginBottom: '10px' }}>
          <DigButton/>
        </div>

        <div style={{ marginBottom: '10px' }}>
          <BuyGnomeButton/>
        </div>

        <div>
          <BuySnowWhiteButton/>
        </div>
      </div>
    </>
  )
}

function GameTopPanel() {
  const state = useGameState()
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
  const dispatch = useDispatch()

  return (
    <button onClick={() => dispatch({ type: 'dig' })}>
      Dig for 1 Gold
    </button>
  )
}

function BuyGnomeButton() {
  const [gold, price, dispatch] = useGame(useShallow(s => {
    return [Math.floor(s.gold), getGnomePrice(s), s.dispatch];
  }));

  return (
    <button
      onClick={() => dispatch({ type: 'buyGnome' })}
      disabled={gold < price}
      style={{
        opacity: gold < price ? 0.5 : 1,
        cursor: gold < price ? 'not-allowed' : 'pointer'
      }}
    >
      Buy Gnome ({price} gold)
    </button>
  )
}

function BuySnowWhiteButton() {
  const gnomes = useGame(s => s.gnomes)
  const price = useGame(s => getSnowWhitePrice(s))
  const dispatch = useDispatch()

  return (
    <button
      onClick={() => dispatch({ type: 'buySnowWhite' })}
      disabled={gnomes < price}
      style={{
        opacity: gnomes < price ? 0.5 : 1,
        cursor: gnomes < price ? 'not-allowed' : 'pointer'
      }}
    >
      Buy Snow White ({price} gnomes)
    </button>
  )
}
