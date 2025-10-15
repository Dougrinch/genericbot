import { createContext, useContext } from "react"

export const BotContext = createContext<BotContextData | null>(null)

export type BotContextData = {
  setPanelTransparency: (isTransparent: boolean) => void
  selectElement: (element: HTMLElement) => Selection
}

export type Selection = {
  clear: () => void
}

export function useBotContext(): BotContextData {
  const ctx = useContext(BotContext)
  if (ctx === null) {
    throw new Error("useBotPanelRef must be used within a BotPanelContext")
  }
  return ctx
}
