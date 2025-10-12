import { error, fmapResult, ok, type Result } from "./Result.ts"

export function findElementsByXPath(xpath: string): Result<HTMLElement[]> {
  if (!xpath || !xpath.trim()) {
    return error("XPath is empty", "warn")
  }
  try {
    const res = document.evaluate(xpath, document, null, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null)
    const nodes = []
    let n: Node | null
    while ((n = res.iterateNext()) != null) {
      if (n instanceof HTMLElement) {
        nodes.push(n)
      }
    }
    return ok(nodes)
  } catch (e) {
    if (e instanceof Error) {
      return error(`XPath error: ${e.message}`, "err")
    } else {
      return error(`XPath error: ${String(e)}`, "err")
    }
  }
}

export function findElementByXPath(xpath: string): Result<HTMLElement> {
  const res = findElementsByXPath(xpath)
  return fmapResult(res, elements => {
    if (elements.length === 0) {
      return error("XPath matched 0 elements.", "warn")
    }

    if (elements.length > 1) {
      return error(`XPath matched ${elements.length} elements (need exactly 1).`, "warn")
    }

    return ok(elements[0])
  })
}
