import { beforeEach, describe, test } from "vitest"
import { page } from "@vitest/browser/context"
import { element, elements } from "./locators.ts"

describe("Bot", () => {
  beforeEach(async () => {
    await import("../../src/main.tsx")
  })

  test("Bot renders correctly", async () => {
    await element(page.getByText(/Dig/)).toHaveTextContent("Dig for 1 Gold")
    await elements(page.getByText(/Dig/)).not.toHaveLength(2)

    await element(page.getByText(/Add Variable/)).not.toBeVisible()
    await page.getByTitle("Configuration").click()
    await element(page.getByText(/Add Variable/)).toBeVisible()
  })
})
