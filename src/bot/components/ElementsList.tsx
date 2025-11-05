import { ElementRow } from "./ElementRow"
import { useConfig } from "../logic/ConfigManager.ts"
import { ReorderableList } from "./ReorderableList.tsx"
import { useDispatch } from "../BotManagerContext.tsx"
import { useLocateElement } from "./ElementLocator.tsx"
import { initialElementXPath } from "./GenerateElementXPath.ts"

export function ElementsList() {
  const dispatch = useDispatch()

  const elements = useConfig(c => c.elements)

  const locateElement = useLocateElement(element => {
    const xpath = initialElementXPath(element)
    const nameMatch = element.innerText.match(/[a-zA-Z ]+/g)
    const name = nameMatch && nameMatch.length > 0 ? nameMatch[0].trim() : ""
    dispatch.config.addElement(xpath, name)
  }, [])

  return (
    <div id="elements">
      <ReorderableList
        rowIdPrefix="elem"
        handleReorder={dispatch.config.reorderElements}
        addButtonLabel="Add Element"
        addButtonOnClick={locateElement}
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
