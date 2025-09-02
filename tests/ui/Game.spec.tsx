import { describe, expect, test, vi } from "vitest"
import { page } from "@vitest/browser/context"
import { render } from "vitest-browser-react"
import Bot from "../../src/bot/Bot.tsx"

describe("Game", () => {
  test("simple Game test", async () => {
    await import("../../src/main.tsx")

    await expect.element(page.getByText("Gnome Gold Mine")).toBeInTheDocument()

    const gold = page.getByText(/^Gold/)
    const dig = page.getByRole("button", { name: /^Dig/ })
    const buyGnome = page.getByRole("button", { name: /^Buy Gnome/ })
    // const buySnowWhite = page.getByRole('button', { name: /^Buy Snow White/ });

    await expect.element(gold).toHaveTextContent(/.*: 0$/)
    await expect.element(buyGnome).toHaveAttribute("disabled")
    for (let i = 0; i < 10; i++) {
      await dig.click()
    }
    await expect.element(gold).toHaveTextContent(/.*: 10$/)
    await expect.element(buyGnome).not.toHaveAttribute("disabled")
    await buyGnome.click()
    await expect.element(buyGnome).toHaveAttribute("disabled")
    await expect.element(gold).toHaveTextContent(/.*: 0$/)
    vi.advanceTimersByTime(5100)
    await expect.element(gold).toHaveTextContent(/.*: 5$/)
  })

  test("render Bot", async () => {
    const { getByText } = render(<Bot />)
    await expect.element(getByText("AutoClick")).toBeInTheDocument()
  })
})
