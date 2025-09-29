import { ActionRow } from "./ActionRow.tsx"
import { useConfig } from "../logic/ConfigManager.ts"
import { ReorderableList } from "./ReorderableList.tsx"
import { dispatch } from "../logic/BotManager.ts"

export function ActionsList() {
  const actions = useConfig(c => c.actions)

  return (
    <ReorderableList
      rowIdPrefix="action"
      handleReorder={dispatch.config.reorderActions}
      addButtonLabel="Add Action"
      addButtonOnClick={() => dispatch.config.addAction()}
    >
      {actions.map((action, index) => (
        <ActionRow
          key={action.id}
          index={index}
          action={action}
        />
      ))}
    </ReorderableList>
  )
}
