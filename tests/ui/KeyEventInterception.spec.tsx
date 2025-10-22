import { describe, expect, it } from "vitest"
import { page, userEvent } from "@vitest/browser/context"
import { openConfiguration, renderBotAndGame } from "./helpers.tsx"

describe("Key Event Interception", () => {
  it("should prevent key events from reaching the page when config panel is open", async () => {
    let pageKeyEventFired = false

    // Add a keydown listener to the document to simulate the host page
    const pageKeyListener = () => {
      pageKeyEventFired = true
    }
    document.addEventListener("keydown", pageKeyListener)

    renderBotAndGame()

    // Initially, keys should reach the page (config panel is closed)
    await userEvent.keyboard("a")
    expect(pageKeyEventFired).toBe(true)

    // Reset flag
    pageKeyEventFired = false

    // Open config panel using the proper helper
    await openConfiguration()

    await page.getVariableRow("Gold").getByText("Edit").click();
    (page.getVariableRow("Gold").getByLabelText("Name").element() as HTMLElement).focus()

    // Now keys should be intercepted and not reach the page
    await userEvent.keyboard("b")
    expect(pageKeyEventFired).toBe(false)

    // Clean up
    document.removeEventListener("keydown", pageKeyListener)
  })

  it("should allow clicking on config elements", async () => {
    renderBotAndGame()
    await openConfiguration()

    // Add a variable to get input fields
    const addButton = page.getByText("Add Variable")
    await addButton.click()

    // Verify the variable was added and inputs are visible
    const nameInput = page.getVariableRow("Unnamed").getByPlaceholder("Variable name")
    await nameInput.expect().toBeVisible();

    (nameInput.element() as HTMLElement).focus()
    await userEvent.keyboard("Test")

    await page.getVariableRow("Test").expect().toBeVisible()
  })
})
