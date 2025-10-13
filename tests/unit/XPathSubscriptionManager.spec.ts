import { XPathSubscriptionManager } from "../../src/bot/logic/XPathSubscriptionManager.ts"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { collect } from "./utils.ts"

describe("XPathSubscriptionManager", () => {
  beforeEach(() => {
    // Setup test DOM
    document.body.innerHTML = `
      <div id="test-container">
        <button class="test-btn">Button 1</button>
        <button class="test-btn">Button 2</button>
        <button class="test-btn">Button 3</button>
      </div>
    `

    // Mock checkVisibility for jsdom compatibility
    if (typeof Element.prototype.checkVisibility === "undefined") {
      Element.prototype.checkVisibility = () => true
    }
  })

  afterEach(() => {
    document.body.innerHTML = ""
  })

  it("should subscribe to multiple elements", () => {
    const elements = getFirstValue("//button[@class='test-btn']")

    expect(elements.ok).toBe(true)
    if (elements.ok) {
      expect(elements.value).toHaveLength(3)
      expect(elements.value[0].textContent).toBe("Button 1")
      expect(elements.value[1].textContent).toBe("Button 2")
      expect(elements.value[2].textContent).toBe("Button 3")
    }
  })

  it("should handle empty results", () => {
    const elements = getFirstValue("//button[@class='nonexistent']")

    expect(elements.ok).toBe(true)
    if (elements.ok) {
      expect(elements.value).toHaveLength(0)
    }
  })

  it("should handle invalid xpath", () => {
    const elements = getFirstValue("//[")

    expect(elements.ok).toBe(false)
    if (!elements.ok) {
      expect(elements.error).toContain("XPath error")
      expect(elements.severity).toBe("err")
    }
  })
})

function getFirstValue(xpath: string) {
  const manager = new XPathSubscriptionManager()
  const elements = collect(manager.elements(xpath, false, true))
  const result = elements.last
  elements.stop()
  return result
}
