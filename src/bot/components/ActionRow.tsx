import type { EntryConfig } from "../logic/Config.ts"
import { dispatch } from "../logic/BotManager.ts"
import { usePillStatus } from "../logic/EntriesManager.ts"
import { useConfig } from "../logic/ConfigManager.ts"

interface ActionRowProps {
  onToggleConfig: () => void
}

export function ActionRow({ onToggleConfig }: ActionRowProps) {
  const entries = useConfig(c => c.entries)

  return (
    <div className="actions">
      <div className="pill-row">
        {entries.map(entry => (
          <EntryPill key={entry.id} entry={entry} />
        ))}
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

function EntryPill({ entry }: { entry: EntryConfig }) {
  const entryId = entry.id
  const pillStatus = usePillStatus(entryId)
  const isRunning = pillStatus?.isRunning
  const status = pillStatus?.status

  const displayName = entry.name !== "" ? entry.name : "Unnamed"
  const canRun = true

  const handleClick = () => {
    if (!canRun) return
    dispatch.entries.toggle(entryId)
  }

  const getStatusIcon = () => {
    if (status === "auto-stopped") return "⛔"
    if (status === "waiting") return "⏳"
    return (isRunning ?? false) ? "⏸" : "▶"
  }

  const className = [
    "pill",
    !canRun ? "disabled" : "",
    (isRunning ?? false) ? "running" : "",
    status === "auto-stopped" ? "autostopped" : "",
    status === "waiting" ? "waiting" : ""
  ].filter(Boolean).join(" ")

  return (
    <button
      className={className}
      onClick={handleClick}
      style={{ pointerEvents: canRun ? "auto" : "none" }}
    >
      {getStatusIcon()} {displayName}
    </button>
  )
}
