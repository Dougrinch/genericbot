import { useEffect } from "react"
import { EntriesList } from "./EntriesList"
import { VariablesList } from "./VariablesList"

interface ConfigWrapperProps {
  isVisible: boolean
}

export function ConfigWrapper({ isVisible }: ConfigWrapperProps) {
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
        <div className="tab-header">Variables</div>
        <VariablesList />
      </div>
      <div className="config-tab">
        <div className="tab-header">Automation Entries</div>
        <EntriesList />
        <div className="config-actions">
          <button>Hot Reload</button>
          <button>Refresh</button>
          <button>✕ Close</button>
        </div>
      </div>
    </div>
  )
}
