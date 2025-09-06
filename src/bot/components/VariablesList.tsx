import { VariableRow } from "./VariableRow"
import { dispatch, useConfig } from "../ConfigContext.ts"
import * as React from "react"
import { useCallback, useRef } from "react"

export function VariablesList() {
  const variables = useConfig(c => c.variables)
  const containerRef = useRef<HTMLDivElement>(null)

  // Create refs for each variable row
  const rowRefs = useRef<Map<string, HTMLDivElement>>(new Map())

  const setRowRef = useCallback((variableId: string) => (element: HTMLDivElement | null) => {
    if (element) {
      rowRefs.current.set(variableId, element)
    } else {
      rowRefs.current.delete(variableId)
    }
  }, [])

  const onDragStops = useRef<Map<string, () => void>>(new Map())
  const setOnDragStop = useCallback((variableId: string): (callback: () => void) => void => {
    return (callback: () => void) => {
      onDragStops.current.set(variableId, callback)
    }
  }, [])

  const onDragStart = useCallback((draggedIndex: number) => (e: React.MouseEvent) => {
    const container = containerRef.current
    if (!container) {
      throw Error("Container not found")
    }

    let variableBoundaries: Array<{ top: number, bottom: number, element: HTMLElement }> = []
    let lastCrossedBoundary = draggedIndex

    // Find the dragged row element and store its original next sibling
    const draggedVariableId = variables[draggedIndex].id
    const draggedRowElement = rowRefs.current.get(draggedVariableId)
    if (!draggedRowElement) {
      throw Error("Dragged Row not found")
    }
    const originalNextSibling = draggedRowElement.nextSibling

    const updateBoundaries = () => {
      variableBoundaries = []
      const allRowElements = Array.from(rowRefs.current.values())
      const sortedRows = allRowElements.sort((a, b) => {
        const rectA = a.getBoundingClientRect()
        const rectB = b.getBoundingClientRect()
        return rectA.top - rectB.top
      })

      for (const rowEl of sortedRows) {
        const rect = rowEl.getBoundingClientRect()
        variableBoundaries.push({
          top: rect.top,
          bottom: rect.bottom,
          element: rowEl
        })
      }
    }

    // Calculate initial boundaries
    updateBoundaries()

    const handleMouseMove = (e: MouseEvent) => {
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

        const allRows = Array.from(rowRefs.current.values()).sort((a, b) => {
          const rectA = a.getBoundingClientRect()
          const rectB = b.getBoundingClientRect()
          return rectA.top - rectB.top
        })
        const draggedElementIndex = allRows.indexOf(draggedRowElement)

        // Don't move if we're trying to move to our current position
        if (crossedBoundary === draggedElementIndex) {
          return
        }

        // Move the dragged row to the new position in the DOM (for visual feedback)
        const targetRow = allRows[crossedBoundary]
        if (targetRow && targetRow !== draggedRowElement && container) {
          if (crossedBoundary > draggedElementIndex) {
            // Moving down: insert after target
            container.insertBefore(draggedRowElement, targetRow.nextSibling)
          } else {
            // Moving up: insert before target
            container.insertBefore(draggedRowElement, targetRow)
          }

          // Recalculate boundaries after DOM change
          updateBoundaries()
        }
      }
    }

    const handleMouseUp = () => {
      // Check if position actually changed
      const currentNextSibling = draggedRowElement.nextSibling
      if (currentNextSibling !== originalNextSibling) {
        // Position changed - save the new order
        const allRows = Array.from(rowRefs.current.values()).sort((a, b) => {
          const rectA = a.getBoundingClientRect()
          const rectB = b.getBoundingClientRect()
          return rectA.top - rectB.top
        })
        const orderedIds = allRows.map(rowEl => rowEl.id)
          .map(s => s.substring(4)) // id={`var-${variable.id}`}
        dispatch({ type: "reorderVariables", orderedIds })
      }

      const onDragStop = onDragStops.current.get(draggedVariableId)
      if (!onDragStop) {
        throw Error("onDragStop not found")
      }
      onDragStop()
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }

    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)

    e.preventDefault()
    e.stopPropagation()
  }, [variables])

  if (variables.length === 0) {
    return null
  }

  return (
    <div className="variables">
      <div ref={containerRef} className="variables-container">
        {variables.map((variable, index) => (
          <VariableRow
            key={variable.id}
            ref={setRowRef(variable.id)}
            variable={variable}
            onDragStart={onDragStart(index)}
            setOnDragStop={setOnDragStop(variable.id)}
          />
        ))}
      </div>
    </div>
  )
}
