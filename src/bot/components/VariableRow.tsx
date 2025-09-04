import * as React from "react"
import { useEffect, useRef, useState } from "react"
import type { VariableConfig } from "../Config.ts"
import { dispatch, useConfig } from "../ConfigContext.ts"

interface VariableRowProps {
  variable: VariableConfig
}

export function VariableRow({ variable }: VariableRowProps) {
  // New variables (empty name) should start in editing mode
  const [isEditing, setIsEditing] = useState(!variable.name)
  const [statusLine] = useState("")
  const [statusType] = useState<"warn" | "ok" | "err">("ok")
  const nameInputRef = useRef<HTMLInputElement>(null)
  const dragHandleRef = useRef<HTMLDivElement>(null)
  const rowRef = useRef<HTMLDivElement>(null)

  // Get all variables for reordering
  const allVariables = useConfig(c => c.variables)

  // Auto-focus name field when editing starts and name is empty
  useEffect(() => {
    if (isEditing && !variable.name && nameInputRef.current) {
      nameInputRef.current.focus()
    }
  }, [isEditing, variable.name])

  // Drag and drop functionality
  useEffect(() => {
    const dragHandle = dragHandleRef.current
    const row = rowRef.current
    if (!dragHandle || !row) return

    let isDragging = false
    let draggedRow: HTMLElement | null = null
    let originalNextSibling: Node | null = null
    let variableBoundaries: Array<{ top: number, bottom: number, element: HTMLElement }> = []
    let lastCrossedBoundary = -1

    const updateBoundaries = () => {
      const container = row.parentElement
      if (!container) return

      variableBoundaries = []
      const allRows = Array.from(container.querySelectorAll(".variable-list-item"))

      for (const rowEl of allRows) {
        const rect = (rowEl as HTMLElement).getBoundingClientRect()
        variableBoundaries.push({
          top: rect.top,
          bottom: rect.bottom,
          element: rowEl as HTMLElement
        })
      }
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !draggedRow) return

      const container = draggedRow.parentElement
      if (!container) return

      // Determine which boundary we've crossed based on Y position
      let crossedBoundary = -1
      for (let i = 0; i < variableBoundaries.length; i++) {
        if (e.clientY <= variableBoundaries[i].bottom) {
          crossedBoundary = i
          break
        }
      }

      // If we haven't crossed any boundary, we're below all variables
      if (crossedBoundary === -1) {
        crossedBoundary = variableBoundaries.length - 1
      }

      // Only move if we've actually crossed to a different boundary
      if (crossedBoundary !== lastCrossedBoundary) {
        lastCrossedBoundary = crossedBoundary

        const allRows = Array.from(container.querySelectorAll(".variable-list-item"))
        const draggedIndex = allRows.indexOf(draggedRow)

        // Don't move if we're trying to move to our current position
        if (crossedBoundary === draggedIndex) {
          return
        }

        // Move the dragged row to the new position
        const targetRow = allRows[crossedBoundary]
        if (targetRow && targetRow !== draggedRow) {
          if (crossedBoundary > draggedIndex) {
            // Moving down: insert after target
            container.insertBefore(draggedRow, targetRow.nextSibling)
          } else {
            // Moving up: insert before target
            container.insertBefore(draggedRow, targetRow)
          }

          // Recalculate boundaries after DOM change
          updateBoundaries()
        }
      }
    }

    const handleMouseUp = () => {
      if (!isDragging || !draggedRow) return

      isDragging = false
      draggedRow.classList.remove("dragging")

      // Remove event listeners
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)

      // Check if position actually changed
      const currentNextSibling = draggedRow.nextSibling
      if (currentNextSibling !== originalNextSibling) {
        // Position changed - save the new order
        const container = draggedRow.parentElement
        if (container) {
          const allRows = Array.from(container.querySelectorAll(".variable-list-item"))
          const orderedIds = allRows.map(rowEl => (rowEl as HTMLElement).dataset.variableId).filter(Boolean) as string[]
          dispatch({ type: "reorderVariables", orderedIds })
        }
      }

      // Reset
      draggedRow = null
      originalNextSibling = null
      variableBoundaries = []
      lastCrossedBoundary = -1
    }

    const handleMouseDown = (e: MouseEvent) => {
      // Don't allow dragging when in editing mode
      if (row.classList.contains("editing")) {
        e.preventDefault()
        return
      }

      isDragging = true
      draggedRow = row
      originalNextSibling = row.nextSibling
      lastCrossedBoundary = -1

      // Calculate initial boundaries
      updateBoundaries()

      // Find which boundary we're starting at
      const container = row.parentElement
      if (container) {
        const allRows = Array.from(container.querySelectorAll(".variable-list-item"))
        lastCrossedBoundary = allRows.indexOf(draggedRow)
      }

      // Add dragging class for visual feedback
      row.classList.add("dragging")

      // Add document event listeners
      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)

      e.preventDefault()
      e.stopPropagation()
    }

    dragHandle.addEventListener("mousedown", handleMouseDown)

    return () => {
      dragHandle.removeEventListener("mousedown", handleMouseDown)
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }
  }, [variable.id, allVariables])

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
      <div ref={rowRef} className="variable-list-item editing" id={`var-${variable.id}`}>
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
          <input
            type="text"
            id={`var-xpath-${variable.id}`}
            className="var-xpath"
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
    <div ref={rowRef} className="variable-list-item" data-variable-id={variable.id}>
      <div ref={dragHandleRef} className="variable-drag-handle" draggable={false}>
        <div className="dot"></div>
      </div>

      <div className="variable-info">
        <span className="variable-name">
          {variable.name || "Unnamed"}
        </span>
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
