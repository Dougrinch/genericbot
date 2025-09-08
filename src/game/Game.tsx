import css from "./Game.css?inline"
import { GameLoop } from "./GameLoop.tsx"
import { GamePanel } from "./GamePanel.tsx"
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
  }, [])

  if (cssState === null) {
    return null
  }

  return (
    <GameLoop>
      <GamePanel />
    </GameLoop>
  )
}

export default Game
