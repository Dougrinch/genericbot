import { describe, test } from "vitest"
import { page } from "@vitest/browser/context"
import { openConfiguration, renderBotAndGame } from "./helpers.tsx"

describe("Variables", () => {
  test("value changes are detected", async () => {
    renderBotAndGame()
    await openConfiguration()

    await page.getVariableRow("Gold").getByText(/^0$/).expect().toBeVisible()
    await page.getByRole("button", { name: /^Dig/ }).clickN(10)
    await page.getVariableRow("Gold").getByText(/^10$/).expect().toBeVisible()
    await page.getByRole("button", { name: /^Buy Gnome/ }).click()
    await page.getVariableRow("Gold").getByText(/^0$/).expect().toBeVisible()
  })

  test("synced with visibility", async () => {
    renderBotAndGame()
    await openConfiguration()

    await page.getVariableRow("Gold").getByText(/^0$/).expect().toBeVisible()
    await page.getByRole("button", { name: /^Hide Gold/ }).click()
    await page.getVariableRow("Gold").getByText(/not evaluated/).expect().toBeVisible()
    await page.getByRole("button", { name: /^Show Gold/ }).click()
    await page.getVariableRow("Gold").getByText(/^0$/).expect().toBeVisible()
  })

  test("synced with dom", async () => {
    renderBotAndGame()
    await openConfiguration()

    await page.getVariableRow("Gold").getByText(/^0$/).expect().toBeVisible()
    await page.getByRole("button", { name: /^Delete Gold/ }).click()
    await page.getVariableRow("Gold").getByText(/not evaluated/).expect().toBeVisible()
    await page.getByRole("button", { name: /^Add Gold/ }).click()
    await page.getVariableRow("Gold").getByText(/^0$/).expect().toBeVisible()
  })

  test("rename", async () => {
    renderBotAndGame()
    await openConfiguration()

    await page.getVariableRow("Gold").getByText("Edit").click()
    await page.getVariableRow("Gold").getByLabelText("Name").fill("Money")
    await page.getVariableRow("Money").getByText("Done").click()

    await page.getVariableRow("Gold").expect().not.toBeInTheDocument()
  })

  test("supports configurable decimal and thousands separators", async () => {
    renderBotAndGame()

    const score = document.createElement("span")
    score.id = "score"
    score.textContent = "1,234.5"
    document.body.appendChild(score)

    await openConfiguration()

    const row = page.getVariableRow("score")
    await row.getByText(/^1234.5$/).expect().toBeVisible()
    await row.getByText("Edit").click()

    await row.getByLabelText("Decimal Separator").selectOptions(",")
    await row.getByLabelText("Thousands Separator").expect().toHaveValue(".")

    score.textContent = "1.234,5"
    await row.getByText(/^1234.5$/).expect().toBeVisible()
  })
})
