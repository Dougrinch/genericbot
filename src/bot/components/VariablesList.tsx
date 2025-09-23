import { VariableRow } from "./VariableRow"
import * as React from "react"
import { type DependencyList, useRef } from "react"
import { type CompositeKey, CompositeMap } from "../../utils/CompositeMap.ts"
import { useConfig } from "../logic/ConfigManager.ts"
import { dispatch } from "../logic/BotManager.ts"

function useCurryCallback<C extends CompositeKey, A extends unknown[], R>(
  f: (c: C, ...a: A) => R,
  deps: DependencyList = []
): (c: C) => (...a: A) => R {
  const cache = useRef<CompositeMap<C, { f: (...a: A) => R, deps: unknown[] }>>(new CompositeMap())
  return c => {
    const cached = cache.current.get(c)
    if (cached && cached.deps.length === deps.length && cached.deps.every((v, i) => Object.is(v, deps[i]))) {
      return cached.f
    }

    const fn = (...a: A) => f(c, ...a)
    cache.current.set(c, {
      f: fn,
      deps: [...deps]
    })
    return fn
  }
}

function useCurryCallback2<C1 extends CompositeKey, C2 extends CompositeKey, A extends unknown[], R>(
  f: (c1: C1, c2: C2, ...a: A) => R,
  deps: DependencyList = []
): (c1: C1, c2: C2) => (...a: A) => R {
  const curried = useCurryCallback((c: [C1, C2], ...a: A) => f(c[0], c[1], ...a), deps)
  return (c1, c2) => curried([c1, c2])
}


export function VariablesList() {
  const variables = useConfig(c => c.variables)
  const containerRef = useRef<HTMLDivElement>(null)

  // Create refs for each variable row
  const rowRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const getRowRef = useCurryCallback((variableId: string, element: HTMLDivElement | null) => {
    if (element) {
      rowRefs.current.set(variableId, element)
    } else {
      rowRefs.current.delete(variableId)
    }
  }, [])

  const onDragStops = useRef<Map<string, () => void>>(new Map())
  const setOnDragStop = useCurryCallback((variableId: string, callback: () => void) => {
    onDragStops.current.set(variableId, callback)
  }, [])

  const onDragStart = useCurryCallback2((draggedIndex: number, draggedVariableId: string, e: React.MouseEvent) => {
    const container = containerRef.current
    if (!container) {
      throw Error("Container not found")
    }

    let variableBoundaries: Array<{ top: number, bottom: number, element: HTMLElement }> = []
    let lastCrossedBoundary = draggedIndex

    // Find the dragged row element and store its original next sibling
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
          .map(s => s.substring(4)) // id={`var-${variable.id}`}
        dispatch.config.reorderVariables(orderedIds)
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
  }, [dispatch])

  if (variables.length === 0) {
    return null
  }

  return (
    <div className="variables">
      <div ref={containerRef} className="variables-container">
        {variables.map((variable, index) => (
          <VariableRow
            key={variable.id}
            ref={getRowRef(variable.id)}
            variable={variable}
            onDragStart={onDragStart(index, variable.id)}
            setOnDragStop={setOnDragStop(variable.id)}
          />
        ))}
      </div>
    </div>
  )
}
