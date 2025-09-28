import { ButtonRow } from "./ButtonRow"
import { useConfig } from "../logic/ConfigManager.ts"
import { ReorderableList } from "./ReorderableList.tsx"
import { dispatch } from "../logic/BotManager.ts"

export function ButtonsList() {
  const buttons = useConfig(c => c.buttons)

  return (
    <div id="buttons">
      <ReorderableList
        rowIdPrefix="btn"
        handleReorder={dispatch.config.reorderButtons}
        addButtonLabel="Add Button"
        addButtonOnClick={() => dispatch.config.addButton()}
      >
        {buttons.map((button, index) => (
          <ButtonRow
            key={button.id}
            index={index}
            button={button}
          />
        ))}
      </ReorderableList>
    </div>
  )
}
