interface ActionRowProps {
  onToggleConfig: () => void
}

export function ActionRow({ onToggleConfig }: ActionRowProps) {
  return (
    <div className="actions">
      <div className="pill-row">
        <button className="pill running">⏸ Test Entry</button>
        <button className="pill disabled">▶ Disabled Entry</button>
      </div>
      <div className="icons">
        <button
          className="icon"
          title="Configuration"
          onClick={onToggleConfig}
        >
          ⚙️
        </button>
      </div>
    </div>
  )
}
