import { EntriesList } from "./EntriesList"
import { VariablesList } from "./VariablesList"
import { dispatch } from "../ConfigContext.ts"

interface ConfigWrapperProps {
  isVisible: boolean
}

export function ConfigWrapper({ isVisible }: ConfigWrapperProps) {
  return (
    <div className="config-wrapper" hidden={!isVisible}>
      <div className="config-tab">
        <div className="tab-header">Variables</div>
        <VariablesList />
        <div className="config-actions">
          <button onClick={() => { dispatch({ type: "addVariable" }) }}>+ Add Variable</button>
        </div>
      </div>
      <div className="config-tab">
        <div className="tab-header">Automation Entries</div>
        <EntriesList />
        <div className="config-actions">
          <button title="Reload AutoClick from clipboard">Hot Reload</button>
          <button title="Rebind all entries and refresh matches">Refresh</button>
          <button onClick={() => { dispatch({ type: "addEntry" }) }}>+ Add Entry</button>
          <button title="Close AutoClick widget">✕ Close</button>
        </div>
      </div>
    </div>
  )
}
