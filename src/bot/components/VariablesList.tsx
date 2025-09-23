import { VariableRow } from "./VariableRow"
import { useConfig } from "../logic/ConfigManager.ts"
import { ReorderableList } from "./ReorderableList.tsx"
import { dispatch } from "../logic/BotManager.ts"

export function VariablesList() {
  const variables = useConfig(c => c.variables)

  return (
    <div id="variables">
      <ReorderableList rowIdPrefix="var" handleReorder={dispatch.config.reorderVariables}>
        {variables.map((variable, index) => (
          <VariableRow
            key={variable.id}
            index={index}
            variable={variable}
          />
        ))}
      </ReorderableList>
    </div>
  )
}
