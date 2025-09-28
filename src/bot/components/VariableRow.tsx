import * as React from "react"
import { memo } from "react"
import type { VariableConfig } from "../logic/Config.ts"
import { useVariableValue } from "../logic/VariablesManager.ts"
import { dispatch } from "../logic/BotManager.ts"
import { ReorderableRow } from "./ReorderableRow.tsx"
import { ElementsList } from "./ElementsList.tsx"

interface VariableRowProps {
  variable: VariableConfig
  index: number
}

export const VariableRow = memo((props: VariableRowProps) => {
  const variable = props.variable

  const variableValue = useVariableValue(variable.id)
  const value = variableValue?.value
  const statusLine = variableValue?.statusLine
  const statusType = variableValue?.statusType

  function handleInputChange(field: keyof VariableConfig): (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void {
    return e => {
      const value = e.target.type === "checkbox"
        ? (e.target as HTMLInputElement).checked
        : e.target.type === "number"
          ? Number(e.target.value) || 0
          : e.target.value

      dispatch.config.updateVariable(variable.id, { [field]: value })
    }
  }

  return (
    <ReorderableRow
      id={variable.id}
      index={props.index}
      name={variable.name}
      value={(
        <>
          <span className="variable-current-value">{value !== undefined ? value : "(not evaluated)"}</span>
          <span className="variable-type">({variable.type})</span>
        </>
      )}
      summaryValue={value !== undefined ? value : "(not evaluated)"}
      handleRemove={dispatch.config.removeVariable}
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

          <label className="label" htmlFor={`var-xpath-${variable.id}`}>XPath</label>
          <textarea
            id={`var-xpath-${variable.id}`}
            className="auto-resize"
            placeholder="XPath — must match exactly one element"
            value={variable.xpath}
            onChange={handleInputChange("xpath")}
          />

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

          {statusLine !== undefined && (
            <div className={`statusline status-${statusType}`}>
              {statusLine}
            </div>
          )}

          <ElementsList elements={variableValue?.elementsInfo ?? []} />
        </>
      )}
    />
  )
})
