import { describe, test } from "vitest"
import { page } from "@vitest/browser/context"
import { element } from "./locators.ts"
import { render } from "vitest-browser-react"
import Bot from "../../src/bot/Bot.tsx"

describe("Bot", () => {
  test("Bot renders correctly", async () => {
    render(<Bot />)

    await element(page.getByText(/Add Variable/)).not.toBeVisible()
    await page.getByTitle("Configuration").click()
    await element(page.getByText(/Add Variable/)).toBeVisible()
  })
})
