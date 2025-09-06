import { dispatch } from "../BotStateContext.ts"

interface ActionRowProps {
  onToggleConfig: () => void
}

export function ActionRow({ onToggleConfig }: ActionRowProps) {
  return (
    <div className="actions">
      <div className="pill-row">
        <button className="pill running" onClick={() => dispatch({ type: "reset" })}>⏸ Reset Config</button>
        <button className="pill disabled">▶ Disabled Entry</button>
      </div>
      <div className="icons">
        <button
          className="icon"
          onClick={onToggleConfig}
        >
          ⚙️
        </button>
      </div>
    </div>
  )
}
