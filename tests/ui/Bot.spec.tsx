import { describe, test } from "vitest"
import { page } from "@vitest/browser/context"
import { render } from "vitest-browser-react"
import Bot from "../../src/bot/Bot.tsx"

describe("Bot", () => {
  test("rename variable", async () => {
    render(<Bot />)

    await page.getByText(/Add Variable/).expect().not.toBeVisible()
    await page.getByText("⚙️").click()
    await page.getByText(/Add Variable/).expect().toBeVisible()

    await page.getVariableRow("lives").getByText("Edit").click()
    await page.getVariableRow("lives").getByLabelText("Name").fill("health")
    await page.getVariableRow("health").getByText("Done").click()
  })
})
