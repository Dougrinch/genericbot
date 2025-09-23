import { describe, test } from "vitest"
import { type Locator, page } from "@vitest/browser/context"
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

    await expectVariables(["score", "lives", "name", "Gold"])

    await page.getVariableRow("Gold").getByText("Edit").click()
    await page.getVariableRow("Gold").getByLabelText("Name").fill("Money")
    await page.getVariableRow("Money").getByText("Done").click()

    await expectVariables(["score", "lives", "name", "Money"])
  })

  test("reorder variables", async () => {
    renderBotAndGame()
    await openConfiguration()

    await expectVariables(["score", "lives", "name", "Gold"])

    const scoreRow = page.getVariableRow("score")
    const livesRow = page.getVariableRow("lives")
    const nameRow = page.getVariableRow("name")

    //Still above lives
    await dragAndDrop(livesRow, scoreRow.element().getBoundingClientRect().bottom + 1)
    await expectVariables(["score", "lives", "name", "Gold"])

    //Finally moved into scores region
    await dragAndDrop(livesRow, scoreRow.element().getBoundingClientRect().bottom)
    await expectVariables(["lives", "score", "name", "Gold"])

    await dragAndDrop(livesRow, nameRow.element().getBoundingClientRect().top + 1)
    await expectVariables(["score", "name", "lives", "Gold"])
  })

  test("move back while reordering variables", async () => {
    renderBotAndGame()

    await page.getByText("⚙️").click()
    await expectVariables(["score", "lives", "name", "Gold"])

    const scoreRow = page.getVariableRow("score")
    const livesRow = page.getVariableRow("lives")

    const border = scoreRow.element().getBoundingClientRect().bottom
    await dragAndDrop(livesRow, border, border + 1)

    await expectVariables(["score", "lives", "name", "Gold"])
  })
})

async function expectVariables(names: string[]): Promise<void> {
  await page.getBySelector("#variables .reorderable-item:not(.reorderable-list-add-btn)").expectMany()
    .map(es => es.map(e => e.querySelector(".reorderable-item-name")?.textContent))
    .toEqual(names)
}

async function dragAndDrop(variableRow: Locator, ...toYs: number[]) {
  const dragHandle = variableRow.getBySelector(".reorderable-item-drag-handle")
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
