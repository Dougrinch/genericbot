import { createContext, useContext } from "react"

export const BotContext = createContext<HTMLElement | null>(null)

export function useOuterBotRoot() {
  const ctx = useContext(BotContext)
  if (ctx === null) {
    throw new Error("useOuterBotRoot must be used within a BotContext")
  }
  return ctx
}
