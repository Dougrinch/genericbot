import type { ActionConfig } from "../logic/Config.ts"
import { useDispatch } from "../BotManagerContext.tsx"
import { usePillStatus } from "../logic/ActionsManager.ts"
import { useConfig } from "../logic/ConfigManager.ts"

interface PillsRowProps {
  onToggleConfig: () => void
  isMinimized: boolean
}

export function PillsRow({ onToggleConfig, isMinimized }: PillsRowProps) {
  const actions = useConfig(c => c.actions)

  return (
    <div className="actions">
      {!isMinimized && (
        <div className="pill-row">
          {actions.map(action => (
            <ActionPill key={action.id} action={action} />
          ))}
        </div>
      )}
      <div className="icons">
        <button
          className="icon"
          onClick={onToggleConfig}
        >
          {isMinimized ? "▴" : "⚙️"}
        </button>
      </div>
    </div>
  )
}

function ActionPill({ action }: { action: ActionConfig }) {
  const dispatch = useDispatch()

  const actionId = action.id
  const pillStatus = usePillStatus(actionId)
  const isRunning = pillStatus?.isRunning
  const status = pillStatus?.status

  const displayName = action.name !== "" ? action.name : "Unnamed"
  const canRun = true

  const handleClick = () => {
    if (!canRun) return
    dispatch.actions.toggle(actionId)
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
