import { describe, test } from "vitest"
import { page } from "@vitest/browser/context"
import { advanceBy, openConfiguration, renderBotAndGame } from "./helpers.tsx"

describe("Variables", () => {
  test("value changes are detected", async () => {
    renderBotAndGame()
    await openConfiguration()

    await page.getVariableRow("Gold").getByText(/^0$/).expect().toBeVisible()
    await page.getByRole("button", { name: /^Dig/ }).clickN(10)
    await page.getVariableRow("Gold").getByText(/^10$/).expect().toBeVisible()
    await page.getByRole("button", { name: /^Buy Gnome/ }).click()
    await page.getVariableRow("Gold").getByText(/^0$/).expect().toBeVisible()
    await advanceBy(5000)
    await page.getVariableRow("Gold").getByText(/^5$/).expect().toBeVisible()
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
})
