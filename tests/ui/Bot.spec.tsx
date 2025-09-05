import { describe, test } from "vitest"
import { type Locator, page } from "@vitest/browser/context"
import { render } from "vitest-browser-react"
import Bot from "../../src/bot/Bot.tsx"

describe("Bot", () => {
  test("rename variable", async () => {
    render(<Bot />)

    await page.getByText(/Add Variable/).expect().not.toBeVisible()
    await page.getByText("⚙️").click()
    await page.getByText(/Add Variable/).expect().toBeVisible()

    await expectVariables(["score", "lives", "name"])

    await page.getVariableRow("lives").getByText("Edit").click()
    await page.getVariableRow("lives").getByLabelText("Name").fill("health")
    await page.getVariableRow("health").getByText("Done").click()

    await expectVariables(["score", "health", "name"])
  })

  test("reorder variables", async () => {
    render(<Bot />)

    await page.getByText("⚙️").click()

    await expectVariables(["score", "lives", "name"])

    const scoreRow = page.getVariableRow("score")
    const livesRow = page.getVariableRow("lives")
    const nameRow = page.getVariableRow("name")

    //Still above lives
    await dragAndDrop(livesRow, scoreRow.element().getBoundingClientRect().bottom + 1)
    await expectVariables(["score", "lives", "name"])

    //Finally moved into scores region
    await dragAndDrop(livesRow, scoreRow.element().getBoundingClientRect().bottom)
    await expectVariables(["lives", "score", "name"])

    await dragAndDrop(livesRow, nameRow.element().getBoundingClientRect().top + 1)
    await expectVariables(["score", "name", "lives"])
  })

  test("move back while reordering variables", async () => {
    render(<Bot />)

    await page.getByText("⚙️").click()
    await expectVariables(["score", "lives", "name"])

    const scoreRow = page.getVariableRow("score")
    const livesRow = page.getVariableRow("lives")

    const border = scoreRow.element().getBoundingClientRect().bottom
    await dragAndDrop(livesRow, border, border + 1)

    await expectVariables(["score", "lives", "name"])
  })
})

async function expectVariables(names: string[]): Promise<void> {
  await page.getBySelector(".variable-list-item").expectMany()
    .map(es => es.map(e => e.querySelector(".variable-name")?.textContent))
    .toEqual(names)
}

async function dragAndDrop(variableRow: Locator, ...toYs: number[]) {
  const dragHandle = variableRow.getBySelector(".variable-drag-handle")
  await dragHandle.expect().toBeVisible()

  const dragHandleElement = dragHandle.element()
  const dragHandleBounds = dragHandleElement.getBoundingClientRect()

  const startX = dragHandleBounds.right - dragHandleBounds.left
  let currentY = dragHandleBounds.bottom - dragHandleBounds.top

  dragHandleElement.dispatchEvent(new MouseEvent("mousedown", {
    bubbles: true,
    cancelable: true,
    clientX: startX,
    clientY: currentY
  }))

  for (const toY of toYs) {
    currentY = toY

    document.dispatchEvent(new MouseEvent("mousemove", {
      bubbles: true,
      cancelable: true,
      clientX: startX,
      clientY: currentY
    }))
  }

  document.dispatchEvent(new MouseEvent("mouseup", {
    bubbles: true,
    cancelable: true,
    clientX: startX,
    clientY: currentY
  }))
}
