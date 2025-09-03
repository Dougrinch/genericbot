import * as React from "react"
import { useState, useEffect, useRef } from "react"
import type { VariableConfig } from "../Config.ts"
import { dispatch } from "../ConfigContext.ts"

interface VariableRowProps {
  variable: VariableConfig
}

export function VariableRow({ variable }: VariableRowProps) {
  // New variables (empty name) should start in editing mode
  const [isEditing, setIsEditing] = useState(!variable.name)
  const [statusLine] = useState("")
  const [statusType] = useState<"warn" | "ok" | "err">("ok")
  const nameInputRef = useRef<HTMLInputElement>(null)

  // Auto-focus name field when editing starts and name is empty
  useEffect(() => {
    if (isEditing && !variable.name && nameInputRef.current) {
      nameInputRef.current.focus()
    }
  }, [isEditing, variable.name])

  function handleInputChange(field: keyof VariableConfig): (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void {
    return e => {
      const value = e.target.type === "checkbox"
        ? (e.target as HTMLInputElement).checked
        : e.target.type === "number"
          ? Number(e.target.value) || 0
          : e.target.value

      dispatch({ type: "updateVariable", id: variable.id, updates: { [field]: value } })
    }
  }

  if (isEditing) {
    return (
      <div className="variable-list-item editing" data-variable-id={variable.id}>
        <div className="variable-summary">
          <span className="variable-summary-info">
            <span style={{ fontWeight: "bold" }}>
              {variable.name || "Unnamed Variable"}
            </span>
            <span className="variable-summary-value"> — (not evaluated)</span>
          </span>
          <button className="edit-btn" onClick={() => setIsEditing(false)}>
            Done
          </button>
        </div>

        <div className="variable-fields">
          <div className="label">Name:</div>
          <input
            ref={nameInputRef}
            type="text"
            className="var-name"
            placeholder="Variable name"
            value={variable.name}
            onChange={handleInputChange("name")}
          />

          <div className="label">XPath:</div>
          <input
            type="text"
            className="var-xpath"
            placeholder="XPath — must match exactly one element"
            value={variable.xpath}
            onChange={handleInputChange("xpath")}
          />

          <div className="label">Regex:</div>
          <input
            type="text"
            className="var-regex"
            placeholder="Optional regex to extract value"
            value={variable.regex}
            onChange={handleInputChange("regex")}
          />

          <div className="label">Type:</div>
          <select
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
            onClick={() => dispatch({ type: "removeVariable", id: variable.id })}
          >
            Remove
          </button>
        </div>

        {statusLine && (
          <div className={`statusline status-${statusType}`}>
            {statusLine}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="variable-list-item" data-variable-id={variable.id}>
      <div className="variable-drag-handle" draggable={false}>
        <div className="dot"></div>
      </div>

      <div className="variable-info">
        <div className="variable-name">
          {variable.name || "Unnamed"}
        </div>
        <div className="variable-value">
          <span className="variable-current-value">(not evaluated)</span>
          <span className="variable-type">({variable.type})</span>
        </div>
      </div>

      <button className="edit-btn" onClick={() => setIsEditing(true)}>
        Edit
      </button>

      {statusLine && (
        <div className={`statusline status-${statusType}`}>
          {statusLine}
        </div>
      )}
    </div>
  )
}
