import { EntriesList } from "./EntriesList"
import { VariablesList } from "./VariablesList"

interface ConfigWrapperProps {
  isVisible: boolean
}

export function ConfigWrapper({ isVisible }: ConfigWrapperProps) {
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
