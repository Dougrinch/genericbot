import { createContext, useContext } from "react"

export const BotUIContext = createContext<((isTransparent: boolean) => void) | null>(null)

export function useSetBotUITransparency() {
  const ctx = useContext(BotUIContext)
  if (ctx === null) {
    throw new Error("useSetBotUITransparency must be used within a BotUIContext")
  }
  return ctx
}
