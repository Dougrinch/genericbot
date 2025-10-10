import type { Try } from "./Try.ts"

export function findElementsByXPath(xpath: string): Try<HTMLElement[]> {
  if (!xpath || !xpath.trim()) {
    return { ok: false, error: "XPath is empty", severity: "warn" }
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
    return { ok: true, value: nodes }
  } catch (error) {
    if (error instanceof Error) {
      return { ok: false, error: `XPath error: ${error.message}`, severity: "err" }
    } else {
      return { ok: false, error: `XPath error: ${String(error)}`, severity: "err" }
    }
  }
}

export function findElementByXPath(xpath: string): Try<HTMLElement> {
  const res = findElementsByXPath(xpath)
  if (!res.ok) {
    return { ok: false, error: res.error, severity: res.severity }
  }

  if (res.value.length === 0) {
    return { ok: false, error: "XPath matched 0 elements.", severity: "warn" }
  }

  if (res.value.length > 1) {
    return {
      ok: false,
      error: `XPath matched ${res.value.length} elements (need exactly 1).`,
      severity: "warn"
    }
  }

  return { ok: true, value: res.value[0] }
}
