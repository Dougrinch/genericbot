import { describe, expect, it } from "vitest"
import { initialElementXPath } from "../../src/bot/components/GenerateElementXPath.ts"

function html(html: string): HTMLElement {
  const template = document.createElement("template")
  template.innerHTML = html.trim()
  return template.content.firstElementChild as HTMLElement
}

describe("GenerateElementXPath", () => {
  describe("Element with id attribute", () => {
    it("should return XPath with id selector when element has id", () => {
      const button = html("<button id=\"submit-btn\">Click</button>")

      const xpath = initialElementXPath(button)

      expect(xpath).toBe("//button[@id='submit-btn']")
    })

    it("should handle uppercase tag names", () => {
      const div = html("<DIV id=\"main\"></DIV>")

      const xpath = initialElementXPath(div)

      expect(xpath).toBe("//div[@id='main']")
    })

    it("should prioritize id even if text is present", () => {
      const span = html("<span id=\"counter\">Count: 42 items</span>")

      const xpath = initialElementXPath(span)

      expect(xpath).toBe("//span[@id='counter']")
    })
  })

  describe("Parent with id", () => {
    it("should use parent id prefix with simple text", () => {
      const parent = html("<div id=\"form\"><button>Submit</button></div>")
      const button = parent.querySelector("button")!

      const xpath = initialElementXPath(button)

      expect(xpath).toBe("//div[@id='form']//button[.='Submit']")
    })

    it("should use parent id prefix with text containing integers", () => {
      const parent = html("<div id=\"cart\"><span>Price: 99 dollars</span></div>")
      const span = parent.querySelector("span")!

      const xpath = initialElementXPath(span)

      expect(xpath).toBe("//div[@id='cart']//span[contains(.,'Price:') and contains(.,'dollars')]")
    })

    it("should use parent id prefix when element has no text", () => {
      const parent = html("<div id=\"container\"><button></button></div>")
      const button = parent.querySelector("button")!

      const xpath = initialElementXPath(button)

      expect(xpath).toBe("//div[@id='container']//button")
    })

    it("should find parent with id through multiple levels", () => {
      const root = html("<div id=\"root\"><section><div><button>Click</button></div></section></div>")
      const button = root.querySelector("button")!

      const xpath = initialElementXPath(button)

      expect(xpath).toBe("//div[@id='root']//button[.='Click']")
    })

    it("should use closest parent with id", () => {
      const root = html("<div id=\"outer\"><div id=\"inner\"><button>Click</button></div></div>")
      const button = root.querySelector("button")!

      const xpath = initialElementXPath(button)

      expect(xpath).toBe("//div[@id='inner']//button[.='Click']")
    })
  })

  describe("No parent with id", () => {
    it("should use root path with simple text", () => {
      const button = html("<button>Click Here</button>")

      const xpath = initialElementXPath(button)

      expect(xpath).toBe("//button[.='Click Here']")
    })

    it("should split text by integers and use multiple contains", () => {
      const span = html("<span>Count: 42 items</span>")

      const xpath = initialElementXPath(span)

      expect(xpath).toBe("//span[contains(.,'Count:') and contains(.,'items')]")
    })

    it("should handle text with decimal numbers", () => {
      const span = html("<span>Price: $19.99 only</span>")

      const xpath = initialElementXPath(span)

      expect(xpath).toBe("//span[contains(.,'Price: $') and contains(.,'only')]")
    })

    it("should handle text with exponential notation", () => {
      const span = html("<span>Value: 1.5e10 items</span>")

      const xpath = initialElementXPath(span)

      expect(xpath).toBe("//span[contains(.,'Value:') and contains(.,'items')]")
    })

    it("should handle text with negative exponential notation", () => {
      const span = html("<span>Small: 2e-5 units</span>")

      const xpath = initialElementXPath(span)

      expect(xpath).toBe("//span[contains(.,'Small:') and contains(.,'units')]")
    })

    it("should return tag name only when element has no text", () => {
      const div = html("<div></div>")

      const xpath = initialElementXPath(div)

      expect(xpath).toBe("//div")
    })

    it("should handle multiple numbers in text", () => {
      const span = html("<span>Range: 10 to 20 items</span>")

      const xpath = initialElementXPath(span)

      expect(xpath).toBe("//span[contains(.,'Range:') and contains(.,'to') and contains(.,'items')]")
    })
  })

  describe("Nested text content", () => {
    it("should handle nested elements with text nodes", () => {
      const div = html("<div>Click<span>Here</span></div>")

      const xpath = initialElementXPath(div)

      expect(xpath).toBe("//div[.='ClickHere' and not(descendant::div[.='ClickHere'])]")
    })

    it("should handle deeply nested text", () => {
      const div = html("<div>Part<span>1</span><span>Text</span></div>")

      const xpath = initialElementXPath(div)

      expect(xpath).toBe("//div[contains(.,'Part') and contains(.,'Text') and not(descendant::div[contains(.,'Part') and contains(.,'Text')])]")
    })

    it("should handle nested text with parent id", () => {
      const parent = html("<div id=\"container\"><button>Click<strong>Now</strong></button></div>")
      const button = parent.querySelector("button")!

      const xpath = initialElementXPath(button)

      expect(xpath).toBe("//div[@id='container']//button[.='ClickNow']")
    })
  })

  describe("Input elements", () => {
    it("should use type and value attributes for input[type=button]", () => {
      const input = html("<input type=\"button\" value=\"Submit Form\">")

      const xpath = initialElementXPath(input)

      expect(xpath).toBe("//input[@type='button' and @value='Submit Form']")
    })
  })

  describe("Edge cases", () => {
    it("should trim whitespace from text", () => {
      const button = html("<button>  Click  </button>")

      const xpath = initialElementXPath(button)

      expect(xpath).toBe("//button[.='Click']")
    })

    it("should handle element with only whitespace", () => {
      const div = html("<div>   </div>")

      const xpath = initialElementXPath(div)

      expect(xpath).toBe("//div")
    })

    it("should handle text that is only numbers", () => {
      const span = html("<span>12345</span>")

      const xpath = initialElementXPath(span)

      expect(xpath).toBe("//span")
    })

    it("should handle mixed numbers and non-breaking spaces", () => {
      const span = html("<span>Total: 100 items</span>")

      const xpath = initialElementXPath(span)

      expect(xpath).toBe("//span[contains(.,'Total:') and contains(.,'items')]")
    })
  })
})
