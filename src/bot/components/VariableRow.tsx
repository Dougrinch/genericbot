import * as React from "react"
import { memo, useEffect, useRef, useState } from "react"
import type { VariableConfig } from "../logic/Config.ts"
import { useVariableValue } from "../logic/VariablesManager.ts"
import { dispatch } from "../logic/BotManager.ts"
import { ReorderableRow } from "./ReorderableRow.tsx"

interface VariableRowProps {
  variable: VariableConfig
  index: number
}

export const VariableRow = memo((props: VariableRowProps) => {
  const variable = props.variable

  // New variables (empty name) should start in editing mode
  const [isEditing, setIsEditing] = useState(!variable.name)
  const nameInputRef = useRef<HTMLInputElement>(null)

  // Autofocus name field when editing starts and name is empty
  useEffect(() => {
    if (isEditing && !variable.name && nameInputRef.current) {
      nameInputRef.current.focus()
    }
  }, [isEditing, variable.name])

  const [value, statusLine, statusType] = useVariableValue(variable.id)

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
      isEditing={isEditing}
      editableRow={(
        <>
          <div className="reorderable-item-summary">
            <span className="reorderable-item-summary-info">
              <span style={{ fontWeight: "bold" }}>
                {variable.name || "Unnamed Variable"}
              </span>
              <span
                className="reorderable-item-summary-value"
              > — {value !== undefined ? value : "(not evaluated)"}
              </span>
            </span>
            <button className="reorderable-item-edit-btn" onClick={() => setIsEditing(false)}>
              Done
            </button>
          </div>

          <div className="reorderable-item-fields">
            <label className="label" htmlFor={`var-name-${variable.id}`}>Name</label>
            <input
              ref={nameInputRef}
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

            <div></div>
            <button
              className="reorderable-item-remove-btn"
              style={{ justifySelf: "end" }}
              onClick={() => dispatch.config.removeVariable(variable.id)}
            >
              Remove
            </button>
          </div>

          {statusLine !== undefined && (
            <div className={`statusline status-${statusType}`}>
              {statusLine}
            </div>
          )}
        </>
      )}
      foldedRow={(
        <>
          <div className="reorderable-item-info">
            <span className="reorderable-item-name">
              {variable.name || "Unnamed"}
            </span>
            <div className="reorderable-item-value">
              <span className="variable-current-value">{value !== undefined ? value : "(not evaluated)"}</span>
              <span className="variable-type">({variable.type})</span>
            </div>
          </div>

          <button className="reorderable-item-edit-btn" onClick={() => setIsEditing(true)}>
            Edit
          </button>
        </>
      )}
    />
  )
})
