import { vi } from "vitest"
import { locators, page } from "@vitest/browser/context"
import { render } from "vitest-browser-react"
import Game from "../../src/game/Game.tsx"
import Bot from "../../src/bot/Bot.tsx"

export function renderGame() {
  render(<Game />, {
    container: document.getElementById("root")!
  })
}

export function renderBot() {
  const bot = document.createElement("div")
  bot.id = "bot"
  document.body.appendChild(bot)

  const shadowRoot = bot.attachShadow({ mode: "open" })

  const root = document.createElement("div")
  shadowRoot.appendChild(root)

  render(<Bot root={bot} />, {
    container: root
  })
}

export function renderBotAndGame() {
  renderGame()
  renderBot()
}

export async function openConfiguration() {
  await page.getByText(/Add Variable/).expect().not.toBeVisible()
  await page.getByText("⚙️").click()
  await page.getByText(/Add Variable/).expect().toBeVisible()
}

// eslint-disable-next-line
export async function advanceBy(ms: number) {
  vi.advanceTimersByTime(ms)
  vi.advanceTimersToNextFrame()
}

export function installCustomLocators() {
  locators.extend({
    getVariableRow(name: string): string {
      return `div.reorderable-item:has(span:has-text("${name}"))`
    },
    getBySelector(selectors: string): string {
      return selectors
    }
  })
}

declare module "@vitest/browser/context" {
  interface LocatorSelectors {
    getVariableRow(name: string): Locator
    getBySelector(selectors: string): Locator
  }
}
