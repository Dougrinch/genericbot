import * as React from "react"
import { memo } from "react"
import type { ElementConfig } from "../logic/Config.ts"
import { useElementValue } from "../logic/ElementsManager.ts"
import { useDispatch } from "../BotManagerContext.tsx"
import { ReorderableRow } from "./ReorderableRow.tsx"
import { FoundElementsList } from "./FoundElementsList.tsx"
import { HoverableElementHighlighter } from "./HoverableElementHighlighter.tsx"
import { XPathInput } from "../xpath/XPathInput.tsx"
import { ElementsInfoKey } from "../logic/ElementsObserver.ts"

interface ElementRowProps {
  element: ElementConfig
  index: number
}

export const ElementRow = memo((props: ElementRowProps) => {
  const dispatch = useDispatch()

  const element = props.element

  const elementValue = useElementValue(element.id)
  const elements = elementValue.ok ? elementValue.value : undefined
  const statusLine = !elementValue.ok ? elementValue?.error : undefined
  const statusType = !elementValue.ok ? elementValue?.severity : undefined

  function handleInputChange(field: keyof ElementConfig): (e: string | React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void {
    return e => {
      const value = typeof e === "string"
        ? e
        : e.target.type === "checkbox"
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
          <XPathInput
            id={`elem-xpath-${element.id}`}
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

          <label className="label" htmlFor={`elem-includeInvisible-${element.id}`}>Include Invisible</label>
          <input
            type="checkbox"
            id={`elem-includeInvisible-${element.id}`}
            checked={element.includeInvisible}
            onChange={handleInputChange("includeInvisible")}
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

          <FoundElementsList elements={elementValue.attachments.get(ElementsInfoKey)} />
        </>
      )}
    />
  )
})
