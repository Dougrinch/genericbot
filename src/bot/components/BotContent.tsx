import { BotPanel } from "../BotPanel.tsx"
import { TransparentablePanel } from "./TransparentablePanel.tsx"
import { BotContentContext } from "./BotContentContext.ts"
import { useCallback, useState } from "react"
import type { HotReloadInfo } from "../hotReload.ts"
import { HighlightedElements } from "./HighlightedElements.tsx"
import { DraggablePanel } from "./DraggablePanel.tsx"

export type BotContentProps = {
  terminate: () => void
  hotReloadInfo?: HotReloadInfo
}

export function BotContent({ terminate, hotReloadInfo }: BotContentProps) {
  const [selectedElements, setSelectedElements] = useState<ReadonlySet<HTMLElement>>(new Set())

  const selectElement = useCallback((element: HTMLElement) => {
    setSelectedElements(set => {
      if (set.has(element)) {
        return set
      } else {
        const newSet = new Set(set)
        newSet.add(element)
        return newSet
      }
    })
    return {
      clear: () => {
        setSelectedElements(set => {
          if (!set.has(element)) {
            return set
          } else {
            const newSet = new Set(set)
            newSet.delete(element)
            return newSet
          }
        })
      }
    }
  }, [])

  return (
    <>
      <BotContentContext value={selectElement}>
        <TransparentablePanel>
          <DraggablePanel>
            <BotPanel terminate={terminate} hotReloadInfo={hotReloadInfo} />
          </DraggablePanel>
        </TransparentablePanel>
      </BotContentContext>
      <HighlightedElements elements={selectedElements} />
    </>
  )
}
