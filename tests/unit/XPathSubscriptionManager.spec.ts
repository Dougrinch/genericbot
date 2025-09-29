import { XPathSubscriptionManager } from "../../src/bot/logic/XPathSubscriptionManager.ts"
import { afterEach, beforeEach, describe, expect, it } from "vitest"

describe("XPathSubscriptionManager", () => {
  let manager: XPathSubscriptionManager

  beforeEach(() => {
    manager = new XPathSubscriptionManager()
    manager.init()

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
    manager.close()
    document.body.innerHTML = ""
  })

  it("should subscribe to multiple elements", () => {
    const { elements } = manager.subscribeOnElements("//button[@class='test-btn']", false, {
      onUpdate: () => {}
    })

    expect(elements.ok).toBe(true)
    if (elements.ok) {
      expect(elements.value).toHaveLength(3)
      expect(elements.value[0].textContent).toBe("Button 1")
      expect(elements.value[1].textContent).toBe("Button 2")
      expect(elements.value[2].textContent).toBe("Button 3")
    }
  })

  it("should handle empty results", () => {
    const { elements } = manager.subscribeOnElements("//button[@class='nonexistent']", false, {
      onUpdate: () => {}
    })

    expect(elements.ok).toBe(true)
    if (elements.ok) {
      expect(elements.value).toHaveLength(0)
    }
  })

  it("should handle invalid xpath", () => {
    const { elements } = manager.subscribeOnElements("//[", false, {
      onUpdate: () => {}
    })

    expect(elements.ok).toBe(false)
    if (!elements.ok) {
      expect(elements.error).toContain("XPath error")
      expect(elements.severity).toBe("err")
    }
  })
})
