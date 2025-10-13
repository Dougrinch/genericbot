import * as React from "react"
import { memo, useMemo } from "react"
import type { VariableConfig } from "../logic/Config.ts"
import { useVariableValue } from "../logic/VariablesManager.ts"
import { useBotObservable, useDispatch } from "../BotManagerContext.tsx"
import { ReorderableRow } from "./ReorderableRow.tsx"
import { FoundElementsList } from "./FoundElementsList.tsx"
import { HoverableElementHighlighter } from "./HoverableElementHighlighter.tsx"
import { XPathInput } from "../xpath/XPathInput.tsx"
import { ElementsInfoKey } from "../logic/XPathSubscriptionManager.ts"

interface VariableRowProps {
  variable: VariableConfig
  index: number
}

export const VariableRow = memo((props: VariableRowProps) => {
  const dispatch = useDispatch()

  const elementConfigs = useBotObservable(m => m.config.elements(), [])

  const variable = props.variable

  const variableValue = useVariableValue(variable.id)
  const value = variableValue.ok ? variableValue.value : undefined
  const statusLine = !variableValue.ok ? variableValue.error : undefined
  const statusType = !variableValue.ok ? variableValue.severity : undefined

  function handleInputChange(field: keyof VariableConfig): (e: string | React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void {
    return e => {
      const value = typeof e === "string"
        ? e
        : e.target.type === "checkbox"
          ? (e.target as HTMLInputElement).checked
          : e.target.type === "number"
            ? Number(e.target.value) || 0
            : e.target.value

      dispatch.config.updateVariable(variable.id, { [field]: value })
    }
  }

  const elementsInfo = variableValue.attachments.get(ElementsInfoKey)
  const elements = useMemo(() => {
    if (variableValue.ok) {
      return elementsInfo
        .filter(e => e.isVisible)
        .map(e => e.element)
    } else {
      return null
    }
  }, [variableValue, elementsInfo])

  return (
    <ReorderableRow
      id={variable.id}
      index={props.index}
      name={variable.name}
      value={(
        <HoverableElementHighlighter elements={elements ?? []}>
          <span className="variable-current-value">{value !== undefined ? String(value) : "(not evaluated)"}</span>
          <span className="variable-type">({variable.type})</span>
        </HoverableElementHighlighter>
      )}
      handleRemove={dispatch.config.removeVariable}
      askOnRemove={variable.xpath.length > 0 || variable.regex.length > 0}
      fields={(
        <>
          <label className="label" htmlFor={`var-name-${variable.id}`}>Name</label>
          <input
            type="text"
            id={`var-name-${variable.id}`}
            placeholder="Variable name"
            value={variable.name}
            onChange={handleInputChange("name")}
          />

          <label className="label" htmlFor={`var-element-type-${variable.id}`}>Element Type</label>
          <select
            id={`var-element-type-${variable.id}`}
            value={variable.elementType}
            onChange={handleInputChange("elementType")}
          >
            <option value="xpath">XPath</option>
            <option value="element">Element</option>
          </select>

          {variable.elementType === "xpath" && (
            <>
              <label className="label" htmlFor={`var-xpath-${variable.id}`}>XPath</label>
              <XPathInput
                id={`var-xpath-${variable.id}`}
                value={variable.xpath}
                onChange={handleInputChange("xpath")}
              />
            </>
          )}
          {variable.elementType === "element" && (
            <>
              <label className="label" htmlFor={`var-element-${variable.id}`}>Element</label>
              <select
                id={`var-element-${variable.id}`}
                value={variable.element}
                onChange={handleInputChange("element")}
              >
                {elementConfigs.map(e => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </select>
            </>
          )}

          <label className="label" htmlFor={`var-regex-${variable.id}`}>Regex</label>
          <input
            type="text"
            id={`var-regex-${variable.id}`}
            placeholder="Optional regex to extract value"
            value={variable.regex}
            onChange={handleInputChange("regex")}
          />

          <label className="label" htmlFor={`var-type-${variable.id}`}>Type</label>
          <select
            id={`var-type-${variable.id}`}
            value={variable.type}
            onChange={handleInputChange("type")}
          >
            <option value="number">Number</option>
            <option value="string">String</option>
          </select>
        </>
      )}
      additionalContent={(
        <>
          {statusLine !== undefined && (
            <div className={`statusline status-${statusType}`}>
              {statusLine}
            </div>
          )}

          <FoundElementsList elements={elementsInfo ?? []} />
        </>
      )}
    />
  )
})
