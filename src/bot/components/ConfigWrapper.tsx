import { useEffect } from "react"
import { ActionsList } from "./ActionsList"
import { VariablesList } from "./VariablesList"
import { ElementsList } from "./ElementsList"

interface ConfigWrapperProps {
  outerRoot: HTMLElement
  isVisible: boolean
  onClose: () => void
  onHotReload: () => void
  onMinimize: () => void
}

export function ConfigWrapper({ outerRoot, isVisible, onClose, onHotReload, onMinimize }: ConfigWrapperProps) {
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

    outerRoot.addEventListener("keydown", handleKeyEvent)
    outerRoot.addEventListener("keyup", handleKeyEvent)
    outerRoot.addEventListener("keypress", handleKeyEvent)

    return () => {
      active = false
      outerRoot.removeEventListener("keydown", handleKeyEvent)
      outerRoot.removeEventListener("keyup", handleKeyEvent)
      outerRoot.removeEventListener("keypress", handleKeyEvent)
    }
  }, [isVisible, outerRoot])

  return (
    <div className="config-wrapper" hidden={!isVisible}>
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
            <button onClick={onClose}>✕ Close</button>
            <button onClick={onHotReload}>↻ Hot Reload</button>
            <button onClick={onMinimize}>▾ Minimize</button>
          </div>
        </div>
      </div>
    </div>
  )
}
