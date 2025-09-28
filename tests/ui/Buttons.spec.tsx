import { describe, test } from "vitest"
import { page } from "@vitest/browser/context"
import { openConfiguration, renderBotAndGame } from "./helpers.tsx"

describe("Buttons", () => {
  test("allow single button when allowMultiple is false", async () => {
    renderBotAndGame()
    await openConfiguration()

    await page.getButtonRow("Dig").getByText("Edit").click()
    await page.getButtonRow("Dig").getByText("need exactly 1").expect().not.toBeInTheDocument()
  })

  test("deny multiple buttons when allowMultiple is false", async () => {
    renderBotAndGame()
    await openConfiguration()

    await page.getButtonRow("Dig").getByText("Edit").click()
    await page.getButtonRow("Dig").getByLabelText("XPath").fill("//button")
    await page.getButtonRow("Dig").getByText("need exactly 1").expect().toBeVisible()
  })

  test("allow multiple buttons when allowMultiple is true", async () => {
    renderBotAndGame()
    await openConfiguration()

    await page.getButtonRow("Dig").getByText("Edit").click()
    await page.getButtonRow("Dig").getByLabelText("XPath").fill("//button")
    await page.getButtonRow("Dig").getByLabelText("Allow Multiple").click()
    await page.getButtonRow("Dig").getByText("need exactly 1").expect().not.toBeInTheDocument()
  })
})
