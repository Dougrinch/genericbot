import type { ElementConfig, VariableConfig } from "../../src/bot/logic/Config.ts"

/**
 * The shared page every script test runs against: two buttons, a counter each.
 * Clicking a button - by the script or by the test - increments its counter.
 *
 * `a` starts visible and `b` starts hidden. Both elements are configured with
 * `includeInvisible: false`, so hiding is all it takes for an element to be
 * missing as far as a script is concerned, which is what `waitFor` and `has`
 * react to. Nothing is ever added to or removed from the page: which elements
 * an xpath matches is the elements pipeline's business, not the engine's.
 *
 * The element and variable configs below are pre-declared, which is what lets a
 * test reference `buttonA`, `counterB`, ... from a script without any setup.
 */

const PAGE_ID = "page"

export class TestPage {
  private readonly root: HTMLElement

  private constructor(root: HTMLElement) {
    this.root = root
  }

  /** Replaces the document body with a fresh copy of the page. */
  static render(): TestPage {
    document.body.innerHTML = ""

    const root = document.createElement("div")
    root.id = PAGE_ID
    root.innerHTML = `<div class="row"><button data-button="a">Click A</button><span data-counter="a">0</span></div>`
      + `<div class="row"><button data-button="b" hidden>Click B</button><span data-counter="b">0</span></div>`

    const page = new TestPage(root)
    root.addEventListener("click", event => {
      const target = event.target
      if (!(target instanceof HTMLElement)) {
        return
      }
      const name = target.closest<HTMLElement>("[data-button]")?.dataset.button
      if (name !== undefined) {
        page.setCounter(name, page.counter(name) + 1)
      }
    })

    document.body.appendChild(root)
    return page
  }

  counter(name: string): number {
    return Number(this.counterElement(name).textContent)
  }

  setCounter(name: string, value: number): void {
    this.counterElement(name).textContent = String(value)
  }

  /** Both counters at once, handy for assertions and failure messages. */
  counters(): Record<string, number> {
    const result: Record<string, number> = {}
    for (const element of this.root.querySelectorAll<HTMLElement>("[data-counter]")) {
      const name = element.dataset.counter!
      result[name] = this.counter(name)
    }
    return result
  }

  /** Makes a button visible, so scripts can find it. */
  show(name: string): void {
    this.button(name).hidden = false
  }

  /** Hides a button, so scripts can no longer find it. */
  hide(name: string): void {
    this.button(name).hidden = true
  }

  /** A click by the user rather than by the script. */
  click(name: string): void {
    this.button(name).click()
  }

  private button(name: string): HTMLElement {
    const button = this.root.querySelector<HTMLElement>(`[data-button="${name}"]`)
    if (button === null) {
      throw new Error(`No button "${name}" on the page`)
    }
    return button
  }

  private counterElement(name: string): HTMLElement {
    const element = this.root.querySelector<HTMLElement>(`[data-counter="${name}"]`)
    if (element === null) {
      throw new Error(`No counter "${name}" on the page`)
    }
    return element
  }
}

/**
 * Elements the scripts can reference. Names go through `toIdentifier`, so
 * "Button A" is spelled `buttonA` in a script. `allButtons` costs no extra DOM
 * and is what exercises `click` over more than one element.
 */
export const pageElements: ElementConfig[] = [
  element("elem_1", "Button A", "//button[@data-button='a']", false),
  element("elem_2", "Button B", "//button[@data-button='b']", false),
  element("elem_3", "All Buttons", "//button[@data-button]", true)
]

/** Variables the scripts can reference: `counterA` and `counterB`. */
export const pageVariables: VariableConfig[] = [
  variable("var_1", "Counter A", "//span[@data-counter='a']"),
  variable("var_2", "Counter B", "//span[@data-counter='b']")
]

function element(id: string, name: string, xpath: string, allowMultiple: boolean): ElementConfig {
  return {
    id,
    name,
    xpath,
    allowMultiple: allowMultiple,
    includeInvisible: false
  }
}

function variable(id: string, name: string, xpath: string): VariableConfig {
  return {
    id,
    name,
    elementType: "xpath",
    xpath,
    element: "",
    regex: "",
    type: "number"
  }
}
