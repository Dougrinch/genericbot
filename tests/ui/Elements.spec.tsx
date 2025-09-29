import { describe, test } from "vitest"
import { page } from "@vitest/browser/context"
import { openConfiguration, renderBotAndGame } from "./helpers.tsx"

describe("Elements", () => {
  test("allow single element when allowMultiple is false", async () => {
    renderBotAndGame()
    await openConfiguration()

    await page.getElementRow("Dig").getByText("Edit").click()
    await page.getElementRow("Dig").getByText("need exactly 1").expect().not.toBeInTheDocument()
  })

  test("deny multiple elements when allowMultiple is false", async () => {
    renderBotAndGame()
    await openConfiguration()

    await page.getElementRow("Dig").getByText("Edit").click()
    await page.getElementRow("Dig").getByLabelText("XPath").fill("//button")
    await page.getElementRow("Dig").getByText("need exactly 1").expect().toBeVisible()
  })

  test("allow multiple elements when allowMultiple is true", async () => {
    renderBotAndGame()
    await openConfiguration()

    await page.getElementRow("Dig").getByText("Edit").click()
    await page.getElementRow("Dig").getByLabelText("XPath").fill("//button")
    await page.getElementRow("Dig").getByLabelText("Allow Multiple").click()
    await page.getElementRow("Dig").getByText("need exactly 1").expect().not.toBeInTheDocument()
  })
})
