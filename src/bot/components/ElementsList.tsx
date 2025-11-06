import { ElementRow } from "./ElementRow"
import { useConfig } from "../logic/ConfigManager.ts"
import { ReorderableList } from "./ReorderableList.tsx"
import { useDispatch } from "../BotManagerContext.tsx"

export function ElementsList() {
  const dispatch = useDispatch()

  const elements = useConfig(c => c.elements)

  return (
    <div id="elements">
      <ReorderableList
        rowIdPrefix="elem"
        handleReorder={dispatch.config.reorderElements}
        addButtonLabel="Add Element"
        addButtonOnClick={dispatch.config.addElement}
      >
        {elements.map((element, index) => (
          <ElementRow
            key={element.id}
            index={index}
            element={element}
          />
        ))}
      </ReorderableList>
    </div>
  )
}
