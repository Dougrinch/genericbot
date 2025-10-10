import { afterEach, beforeEach, describe, it } from "vitest"
import { sharedObserve } from "../../src/utils/observables/MutationObserver.ts"
import { firstValueFrom } from "rxjs"
import { filter } from "rxjs/operators"

describe("MutationObserver", () => {
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

  it("simple test", async () => {
    const element = document.getElementById("test-container")!

    const p1 = sharedObserve(element, {
      childList: true
    }).pipe(filter(mrs => mrs.some(mr => mr.type === "childList")))
    const o2 = sharedObserve(element, {
      attributeFilter: ["class"]
    }).pipe(filter(mrs => mrs.some(mr => mr.type === "attributes" && mr.attributeName === "class")))

    const v1 = firstValueFrom(p1)
    const v2 = firstValueFrom(o2)
    element.classList.add("test")
    element.appendChild(document.createElement("div"))
    await v1
    await v2
  })
})
