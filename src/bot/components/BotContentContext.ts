import { createContext, useContext } from "react"

export const BotContentContext = createContext<((element: HTMLElement) => Selection) | null>(null)

export type Selection = {
  clear: () => void
}

export function useSelectElement() {
  const ctx = useContext(BotContentContext)
  if (ctx === null) {
    throw new Error("useBotPanelRef must be used within a BotPanelContext")
  }
  return ctx
}
