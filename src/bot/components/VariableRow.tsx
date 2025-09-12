import * as React from "react"
import { memo, type Ref, useEffect, useRef, useState } from "react"
import type { VariableConfig } from "../logic/Config.ts"
import { useVariableValue } from "../logic/VariablesManager.ts"
import { dispatch } from "../logic/BotManager.ts"

interface VariableRowProps {
  variable: VariableConfig
  onDragStart: (e: React.MouseEvent) => void
  setOnDragStop: (callback: () => void) => void
  ref: Ref<HTMLDivElement>
}

export const VariableRow = memo((props: VariableRowProps) => {
  const variable = props.variable
  const [isDragging, setIsDragging] = useState(false)
  const onDragStart = props.onDragStart
  const ref = props.ref

  const onDragStop = props.setOnDragStop

  useEffect(() => {
    onDragStop(() => {
      setIsDragging(false)
    })
  }, [onDragStop])

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

  if (isEditing) {
    return (
      <div ref={ref} className="variable-list-item editing" id={`var-${variable.id}`}>
        <div className="variable-summary">
          <span className="variable-summary-info">
            <span style={{ fontWeight: "bold" }}>
              {variable.name || "Unnamed Variable"}
            </span>
            <span className="variable-summary-value"> — {value !== undefined ? value : "(not evaluated)"}</span>
          </span>
          <button className="edit-btn" onClick={() => setIsEditing(false)}>
            Done
          </button>
        </div>

        <div className="variable-fields">
          <label className="label" htmlFor={`var-name-${variable.id}`}>Name</label>
          <input
            ref={nameInputRef}
            type="text"
            id={`var-name-${variable.id}`}
            className="var-name"
            placeholder="Variable name"
            value={variable.name}
            onChange={handleInputChange("name")}
          />

          <label className="label" htmlFor={`var-xpath-${variable.id}`}>XPath</label>
          <textarea
            id={`var-xpath-${variable.id}`}
            className="var-xpath auto-resize"
            placeholder="XPath — must match exactly one element"
            value={variable.xpath}
            onChange={handleInputChange("xpath")}
          />

          <label className="label" htmlFor={`var-regex-${variable.id}`}>Regex</label>
          <input
            type="text"
            id={`var-regex-${variable.id}`}
            className="var-regex"
            placeholder="Optional regex to extract value"
            value={variable.regex}
            onChange={handleInputChange("regex")}
          />

          <label className="label" htmlFor={`var-type-${variable.id}`}>Type</label>
          <select
            id={`var-type-${variable.id}`}
            className="var-type"
            value={variable.type}
            onChange={handleInputChange("type")}
          >
            <option value="number">Number</option>
            <option value="string">String</option>
          </select>

          <div></div>
          <button
            className="remove-btn"
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
      </div>
    )
  } else {
    return (
      <div ref={ref} className={`variable-list-item ${isDragging ? "dragging" : ""}`} id={`var-${variable.id}`}>
        <div
          className="variable-drag-handle"
          draggable={false}
          onMouseDown={e => {
            setIsDragging(true)
            onDragStart(e)
          }}
        >
          <div className="dot"></div>
        </div>

        <div className="variable-info">
          <span className="variable-name">
            {variable.name || "Unnamed"}
          </span>
          <div className="variable-value">
            <span className="variable-current-value">{value !== undefined ? value : "(not evaluated)"}</span>
            <span className="variable-type">({variable.type})</span>
          </div>
        </div>

        <button className="edit-btn" onClick={() => setIsEditing(true)}>
          Edit
        </button>
      </div>
    )
  }
})
