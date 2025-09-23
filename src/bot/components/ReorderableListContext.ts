import * as React from "react"
import { createContext, type Ref, useContext } from "react"

export const ReorderableListContext = createContext<{
  rowIdPrefix: string
  getRowRef: (id: string) => Ref<HTMLDivElement>
  setOnDragStop: (id: string) => (callback: () => void) => void
  onDragStart: (index: number, id: string) => (e: React.MouseEvent) => void
} | undefined>(undefined)


export function useReorderableListContext() {
  const context = useContext(ReorderableListContext)
  if (!context) {
    throw new Error("useReorderableListContext must be used within a ReorderableListContext.Provider")
  }
  return context
}
