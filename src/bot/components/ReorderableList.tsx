import * as React from "react"
import { useMemo, useRef } from "react"
import { ReorderableListContext } from "./ReorderableListContext.ts"


export type ReorderableListProps = {
  rowIdPrefix: string
  dispatchReorder: (orderedIds: string[]) => void
  children: React.ReactNode
}

export function ReorderableList(props: ReorderableListProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  const rowRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const onDragStops = useRef<Map<string, () => void>>(new Map())

  const context = useMemo(() => ({
    rowIdPrefix: props.rowIdPrefix,

    getRowRef: (rowId: string) => (element: HTMLDivElement | null) => {
      if (element) {
        rowRefs.current.set(rowId, element)
      } else {
        rowRefs.current.delete(rowId)
      }
    },

    setOnDragStop: (rowId: string) => (callback: () => void) => {
      onDragStops.current.set(rowId, callback)
    },

    onDragStart: (draggedIndex: number, draggedRowId: string) => (e: React.MouseEvent) => {
      const container = containerRef.current
      if (!container) {
        throw Error("Container not found")
      }

      let rowBoundaries: Array<{ top: number, bottom: number, element: HTMLElement }> = []
      let lastCrossedBoundary = draggedIndex

      // Find the dragged row element and store its original next sibling
      const draggedRowElement = rowRefs.current.get(draggedRowId)
      if (!draggedRowElement) {
        throw Error("Dragged Row not found")
      }
      const originalNextSibling = draggedRowElement.nextSibling

      const updateBoundaries = () => {
        rowBoundaries = []
        const allRowElements = Array.from(rowRefs.current.values())
        const sortedRows = allRowElements.sort((a, b) => {
          const rectA = a.getBoundingClientRect()
          const rectB = b.getBoundingClientRect()
          return rectA.top - rectB.top
        })

        for (const rowEl of sortedRows) {
          const rect = rowEl.getBoundingClientRect()
          rowBoundaries.push({
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
        for (let i = 0; i < rowBoundaries.length; i++) {
          if (e.clientY <= rowBoundaries[i].bottom) {
            crossedBoundary = i
            break
          }
        }

        // If we haven't crossed any boundary, we're below all rows
        if (crossedBoundary === -1) {
          crossedBoundary = rowBoundaries.length - 1
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
          if (targetRow !== draggedRowElement) {
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
        // Check if the position actually changed
        const currentNextSibling = draggedRowElement.nextSibling
        if (currentNextSibling !== originalNextSibling) {
          // Position changed - save the new order
          const allRows = Array.from(rowRefs.current.values()).sort((a, b) => {
            const rectA = a.getBoundingClientRect()
            const rectB = b.getBoundingClientRect()
            return rectA.top - rectB.top
          })
          const orderedIds = allRows.map(rowEl => rowEl.id)
            .map(s => s.substring(props.rowIdPrefix.length + 1)) // id={`${props.rowIdPrefix}-${rowId}`}
          props.dispatchReorder(orderedIds)
        }

        const onDragStop = onDragStops.current.get(draggedRowId)
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
    }
  }), [props])

  return (
    <div className="reorderable-list">
      <div ref={containerRef} className="reorderable-list-container">
        <ReorderableListContext value={context}>
          {props.children}
        </ReorderableListContext>
      </div>
    </div>
  )
}
