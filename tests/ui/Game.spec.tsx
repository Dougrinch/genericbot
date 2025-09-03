import { describe, test } from "vitest"
import { page } from "@vitest/browser/context"
import { element } from "./locators.ts"
import { advanceBy } from "./helpers.ts"

describe("Game", () => {
  test("simple Game test", async () => {
    await import("../../src/main.tsx")

    await element(page.getByText("Gnome Gold Mine")).toBeInTheDocument()

    const dig = page.getByRole("button", { name: /^Dig/ })
    const buyGnome = page.getByRole("button", { name: /^Buy Gnome/ })
    const buySnowWhite = page.getByRole("button", { name: /^Buy Snow White/ })

    await goldIs(0)
    await element(dig).toBeEnabled()
    await element(buyGnome).toBeDisabled()
    await element(buySnowWhite).toBeDisabled()

    let price = 10
    for (let i = 0; i < 3; i++) {
      await dig.clickN(price)

      await goldIs(price)
      await element(buyGnome).toBeEnabled()
      await buyGnome.click()
      await goldIs(0)
      await element(buyGnome).toBeDisabled()
      price += 5
    }

    for (let i = 0; i < 4; i++) {
      await advanceBy(price / (3 + i) * 1000)

      await goldIs(price)
      await element(buyGnome).toBeEnabled()
      await buyGnome.click()
      await goldIs(0)
      await element(buyGnome).toBeDisabled()
      price += 5
    }

    await element(buySnowWhite).toBeEnabled()
    await buySnowWhite.click()
    await element(buySnowWhite).toBeDisabled()

    await goldIs(0)
    await advanceBy(10000)
    await goldIs(100)
  })
})

async function goldIs(gold: number) {
  const goldLabel = page.getByText(/^Gold/)
  await element(goldLabel).toHaveTextContent(new RegExp(`.*: ${gold}$`))
}
