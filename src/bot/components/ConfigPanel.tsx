import { useEffect, useRef } from "react"
import { ActionsList } from "./ActionsList"
import { VariablesList } from "./VariablesList"
import { ElementsList } from "./ElementsList"
import { CoordinateLocatorButton } from "./CoordinateLocatorButton.tsx"

interface ConfigWrapperProps {
  onClose: () => void
  onHotReload: () => void
  onMinimize: () => void
}

export function ConfigPanel({ onClose, onHotReload, onMinimize }: ConfigWrapperProps) {
  const configRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const config = configRef.current!

    let active = true

    const handleKeyEvent = (e: KeyboardEvent) => {
      if (active) {
        e.stopPropagation()
      }
    }

    config.addEventListener("keydown", handleKeyEvent)
    config.addEventListener("keyup", handleKeyEvent)
    config.addEventListener("keypress", handleKeyEvent)

    return () => {
      active = false
      config.removeEventListener("keydown", handleKeyEvent)
      config.removeEventListener("keyup", handleKeyEvent)
      config.removeEventListener("keypress", handleKeyEvent)
    }
  }, [])

  return (
    <div className="config-wrapper" ref={configRef}>
      <div className="config-tab">
        <div className="config-content-scrollable">
          <div className="config-section">
            <div className="tab-header">Elements</div>
            <ElementsList />
          </div>
          <div className="config-section">
            <div className="tab-header">Variables</div>
            <VariablesList />
          </div>
          <div className="config-section">
            <div className="tab-header">Actions</div>
            <ActionsList />
          </div>
        </div>
        <div className="config-footer">
          <div className="config-actions">
            <CoordinateLocatorButton />
            <button onClick={onClose}>✕ Close</button>
            <button onClick={onHotReload}>↻ Hot Reload</button>
            <button onClick={onMinimize}>▾ Minimize</button>
          </div>
        </div>
      </div>
    </div>
  )
}
