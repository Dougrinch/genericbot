import './Game.css'
import { GameLoop } from "./GameLoop.tsx";
import { GamePanel } from "./GamePanel.tsx";

export function Game() {
  return (
    <GameLoop>
      <GamePanel/>
    </GameLoop>
  )
}

export default Game
