import { createContext, type RefObject, useContext } from "react"

export const BotPanelContext = createContext<RefObject<HTMLElement | null> | null>(null)

export function useBotPanelRef(): RefObject<HTMLElement | null> {
  const ref = useContext(BotPanelContext)
  if (ref === null) {
    throw new Error("useBotPanelRef must be used within a BotPanelContext")
  }
  return ref
}
