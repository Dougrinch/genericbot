import { describe, test, vi } from "vitest"
import { page } from "@vitest/browser/context"
import { advanceBy, renderGame } from "./helpers.tsx"

describe("Game", () => {
  test("simple Game test", async () => {
    vi.useFakeTimers()

    renderGame()

    await page.getByText("Gnome Gold Mine").expect().toBeInTheDocument()

    const dig = page.getByRole("button", { name: /^Dig/ })
    const buyGnome = page.getByRole("button", { name: /^Buy Gnome/ })
    const buySnowWhite = page.getByRole("button", { name: /^Buy Snow White/ })

    await goldIs(0)
    await dig.expect().toBeEnabled()
    await buyGnome.expect().toBeDisabled()
    await buySnowWhite.expect().toBeDisabled()

    let price = 10
    for (let i = 0; i < 3; i++) {
      await dig.clickN(price)

      await goldIs(price)
      await buyGnome.expect().toBeEnabled()
      await buyGnome.click()
      await goldIs(0)
      await buyGnome.expect().toBeDisabled()
      price += 5
    }

    for (let i = 0; i < 4; i++) {
      await advanceBy(price / (3 + i) * 1000)

      await goldIs(price)
      await buyGnome.expect().toBeEnabled()
      await buyGnome.click()
      await goldIs(0)
      await buyGnome.expect().toBeDisabled()
      price += 5
    }

    await buySnowWhite.expect().toBeEnabled()
    await buySnowWhite.click()
    await buySnowWhite.expect().toBeDisabled()

    await goldIs(0)
    await advanceBy(10000)
    await goldIs(100)
  })
})

async function goldIs(gold: number) {
  const goldLabel = page.getByText(/^Gold: \d+/)
  await goldLabel.expect().toHaveTextContent(new RegExp(`.*: ${gold}$`))
}
