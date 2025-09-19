import { getGnomePrice, getSnowWhitePrice } from "./GameState.ts"
import { dispatch, useGame } from "./GameStateContext.ts"
import { useState } from "react"

export function GamePanel() {
  const [isGoldVisible, setIsGoldVisible] = useState(true)
  const [isGoldInTree, setIsGoldInTree] = useState(true)

  const [isBuyGnomeVisible, setIsBuyGnomeVisible] = useState(true)
  const [isBuyGnomeInTree, setIsBuyGnomeInTree] = useState(true)

  const goldStatus = !isGoldInTree
    ? "deleted"
    : !isGoldVisible
      ? "hidden"
      : "visible"

  const buyGnomeStatus = !isBuyGnomeInTree
    ? "deleted"
    : !isBuyGnomeVisible
      ? "hidden"
      : "visible"

  return (
    <div className="game-panel">
      <div className="game-header">
        <GameTopPanel isGoldVisible={isGoldVisible} isGoldInTree={isGoldInTree} />
        <h1>Gnome Gold Mine</h1>
      </div>
      <div className="game-buttons">
        <DigButton />
        {isBuyGnomeInTree && (
          <div hidden={!isBuyGnomeVisible}>
            <BuyGnomeButton />
          </div>
        )}
        <BuySnowWhiteButton />
      </div>
      <div className="control-panel">
        <div style={{ fontSize: "16px", fontWeight: "bold" }}>Gold Status: {goldStatus}</div>
        <button onClick={() => setIsGoldVisible(!isGoldVisible)}>{isGoldVisible ? "Hide" : "Show"} Gold</button>
        <button onClick={() => setIsGoldInTree(!isGoldInTree)}>{isGoldInTree ? "Delete" : "Add"} Gold</button>
        <button onClick={() => dispatch({ type: "resetGold" })}>Reset Gold</button>
        <div style={{ fontSize: "16px", fontWeight: "bold" }}>Buy Gnome Status: {buyGnomeStatus}</div>
        <button onClick={() => setIsBuyGnomeVisible(!isBuyGnomeVisible)}>{isBuyGnomeVisible ? "Hide" : "Show"} Buy Gnome</button>
        <button onClick={() => setIsBuyGnomeInTree(!isBuyGnomeInTree)}>{isBuyGnomeInTree ? "Delete" : "Add"} Buy Gnome</button>
      </div>
    </div>
  )
}

function GameTopPanel(props: { isGoldVisible: boolean, isGoldInTree: boolean }) {
  const state = useGame()
  return (
    <div className="game-stats">
      <div className="game-stats-left">
        <div>Income: {state.gnomes + (state.snowWhites * 10)}/sec</div>
        <div>Gnomes: {state.gnomes}</div>
        <div>Snow Whites: {state.snowWhites}</div>
      </div>
      {props.isGoldInTree && (
        <div className="game-stats-center">
          <div hidden={!props.isGoldVisible}>Gold: {Math.floor(state.gold)}</div>
        </div>
      )}
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
