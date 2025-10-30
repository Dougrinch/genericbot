import css from "./Game.css?inline"
import { GameLoop } from "./GameLoop.tsx"
import { GamePanel } from "./GamePanel.tsx"
import { ClickCanvas } from "./ClickCanvas.tsx"
import { useEffect, useState } from "react"

export function Game() {
  const [cssState, setCssState] = useState<HTMLStyleElement | null>(null)

  useEffect(() => {
    const style = document.createElement("style")
    style.innerHTML = css
    document.head.appendChild(style)

    setCssState(style)
    return () => {
      document.head.removeChild(style)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [css])

  if (cssState === null) {
    return null
  }

  return (
    <GameLoop>
      <GamePanel />
      <ClickCanvas />
    </GameLoop>
  )
}

export default Game
