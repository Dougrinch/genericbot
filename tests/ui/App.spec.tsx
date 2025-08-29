import { describe, expect, test } from 'vitest'
import { page } from "@vitest/browser/context";
import { render } from "vitest-browser-react";
import Bot from "../../src/widget/Bot.tsx";

describe('App', () => {
  test('import main', async () => {
    await expect.element(page.getByText('Vite + React')).not.toBeInTheDocument()
    await import("../../src/main.tsx")
    await expect.element(page.getByText('Vite + React')).toBeInTheDocument()

    await page.getByRole('button', { name: 'count is 0' }).click()
    await expect.element(page.getByText('count is 1')).toBeInTheDocument()
  })

  test('render Bot', async () => {
    const { getByRole } = render(<Bot/>)
    await getByRole('button', { hasText: 'AutoClick OFF' }).click()
  })
})
