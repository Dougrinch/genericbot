import { useEffect } from "react"
import { EntriesList } from "./EntriesList"
import { VariablesList } from "./VariablesList"
import { ButtonsList } from "./ButtonsList"

interface ConfigWrapperProps {
  isVisible: boolean
  onClose: () => void
  onHotReload: () => void
}

export function ConfigWrapper({ isVisible, onClose, onHotReload }: ConfigWrapperProps) {
  useEffect(() => {
    if (!isVisible) {
      return
    }

    let active = true

    const handleKeyEvent = (e: KeyboardEvent) => {
      if (active) {
        e.stopPropagation()
      }
    }

    document.addEventListener("keydown", handleKeyEvent, { capture: true })
    document.addEventListener("keyup", handleKeyEvent, { capture: true })
    document.addEventListener("keypress", handleKeyEvent, { capture: true })

    return () => {
      active = false
      document.removeEventListener("keydown", handleKeyEvent, { capture: true })
      document.removeEventListener("keyup", handleKeyEvent, { capture: true })
      document.removeEventListener("keypress", handleKeyEvent, { capture: true })
    }
  }, [isVisible])

  return (
    <div className="config-wrapper" hidden={!isVisible}>
      <div className="config-tab">
        <div className="config-section">
          <div className="tab-header">Buttons</div>
          <ButtonsList />
        </div>
        <div className="config-section">
          <div className="tab-header">Variables</div>
          <VariablesList />
        </div>
        <div className="config-section">
          <div className="tab-header">Automation Entries</div>
          <EntriesList />
        </div>
        <div className="config-section">
          <div className="config-actions">
            <button onClick={onHotReload}>Hot Reload</button>
            <button>Refresh</button>
            <button onClick={onClose}>✕ Close</button>
          </div>
        </div>
      </div>
    </div>
  )
}
