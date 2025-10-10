import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { observeXPath } from "../../src/utils/observables/XPathObserver.ts"
import { collect } from "./utils.ts"
import { map } from "rxjs/operators"

describe("XPathObserver", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="test-container">
        <button class="test-btn">Button 1</button>
        <button class="test-btn">Button 2</button>
        <button class="test-btn">Button 3</button>
      </div>
    `
  })

  afterEach(() => {
    document.body.innerHTML = ""
  })

  it("test same xpath", async () => {
    function unwrappedElements(xpath: string) {
      return observeXPath(xpath).pipe(map(e => e.ok ? e.value : []))
    }

    const c1 = collect(unwrappedElements("//div"))
    expect(await c1.next).toHaveLength(1)
    const c2 = collect(unwrappedElements("//button"))
    expect(await c2.next).toHaveLength(3)
    const c3 = collect(unwrappedElements("//button"))
    expect(c3.last).toHaveLength(3)
    c1.stop()
    const c4 = collect(unwrappedElements("//div"))
    expect(await c4.next).toHaveLength(1)

    c2.stop()
    c3.stop()
    c4.stop()
  })

  it("simple test", async () => {
    const observer = observeXPath(
      "//div[@id='test-container']//*[self::button[starts-with(@class,'test')] or self::div]"
    ).pipe(map(e => {
      if (e.ok) {
        return e.value
      } else {
        throw Error(`Unexpected error: ${e.error}`)
      }
    }))
    const values = collect(observer)

    expect(await values.next).toHaveLength(3)

    const testContainer = document.getElementById("test-container")!
    testContainer.appendChild(document.createElement("div"))
    expect(await values.next).toHaveLength(4)

    testContainer.children.item(1)!.classList.remove("test-btn")
    expect(await values.next).toHaveLength(3)

    testContainer.remove()
    expect(await values.next).toHaveLength(0)

    const newContainer = document.createElement("div")
    newContainer.id = "test-container"
    const intermediate = newContainer.appendChild(document.createElement("section"))
    const innerButton = intermediate.appendChild(document.createElement("button"))
    intermediate.appendChild(document.createElement("div"))
    document.body.appendChild(newContainer)
    expect(await values.next).toHaveLength(1)

    innerButton.classList.add("testGood")
    expect(await values.next).toHaveLength(2)
  })
})
