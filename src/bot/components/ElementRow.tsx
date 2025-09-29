import * as React from "react"
import { memo } from "react"
import type { ElementConfig } from "../logic/Config.ts"
import { useElementValue } from "../logic/ElementsManager.ts"
import { useDispatch } from "../BotManagerContext.tsx"
import { ReorderableRow } from "./ReorderableRow.tsx"
import { FoundElementsList } from "./FoundElementsList.tsx"
import { HoverableElementHighlighter } from "./HoverableElementHighlighter.tsx"

interface ElementRowProps {
  element: ElementConfig
  index: number
}

export const ElementRow = memo((props: ElementRowProps) => {
  const dispatch = useDispatch()

  const element = props.element

  const elementValue = useElementValue(element.id)
  const elements = elementValue?.value
  const statusLine = elementValue?.statusLine
  const statusType = elementValue?.statusType

  function handleInputChange(field: keyof ElementConfig): (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void {
    return e => {
      const value = e.target.type === "checkbox"
        ? (e.target as HTMLInputElement).checked
        : e.target.type === "number"
          ? Number(e.target.value) || 0
          : e.target.value

      dispatch.config.updateElement(element.id, { [field]: value })
    }
  }

  const value = elements !== undefined
    ? (elements.length === 1
      ? "1 element"
      : `${elements.length} elements`)
    : "(not resolved)"

  return (
    <ReorderableRow
      id={element.id}
      index={props.index}
      name={element.name}
      value={(
        <HoverableElementHighlighter elements={elements ?? []}>
          <span className="variable-current-value">
            {value}
          </span>
        </HoverableElementHighlighter>
      )}
      handleRemove={dispatch.config.removeElement}
      askOnRemove={element.xpath.length > 0}
      fields={(
        <>
          <label className="label" htmlFor={`elem-name-${element.id}`}>Name</label>
          <input
            type="text"
            id={`elem-name-${element.id}`}
            placeholder="Element name"
            value={element.name}
            onChange={handleInputChange("name")}
          />

          <label className="label" htmlFor={`elem-xpath-${element.id}`}>XPath</label>
          <textarea
            id={`elem-xpath-${element.id}`}
            className="auto-resize"
            placeholder="XPath — will select DOM elements"
            value={element.xpath}
            onChange={handleInputChange("xpath")}
          />

          <label className="label" htmlFor={`elem-allowMultiple-${element.id}`}>Allow Multiple</label>
          <input
            type="checkbox"
            id={`elem-allowMultiple-${element.id}`}
            checked={element.allowMultiple}
            onChange={handleInputChange("allowMultiple")}
          />
        </>
      )}
      additionalContent={(
        <>
          {statusLine !== undefined && (
            <div className={`statusline status-${statusType}`}>
              {statusLine}
            </div>
          )}

          <FoundElementsList elements={elementValue?.elementsInfo ?? []} />
        </>
      )}
    />
  )
})
