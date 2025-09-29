import { VariableRow } from "./VariableRow"
import { useConfig } from "../logic/ConfigManager.ts"
import { ReorderableList } from "./ReorderableList.tsx"
import { useDispatch } from "../BotManagerContext.tsx"

export function VariablesList() {
  const dispatch = useDispatch()

  const variables = useConfig(c => c.variables)

  return (
    <div id="variables">
      <ReorderableList
        rowIdPrefix="var"
        handleReorder={dispatch.config.reorderVariables}
        addButtonLabel="Add Variable"
        addButtonOnClick={() => dispatch.config.addVariable()}
      >
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
