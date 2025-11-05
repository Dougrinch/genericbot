export function initialElementXPath(element: HTMLElement): string {
  const tagName = element.tagName.toLowerCase()

  if (element.id) {
    return `//${tagName}[@id='${element.id}']`
  }

  const parentSelector = buildParentSelector(element)
  const elementSelector = buildElementSelector(element)

  return `${parentSelector}${elementSelector}`
}

function buildParentSelector(element: HTMLElement) {
  const parentWithId = findParentWithId(element)
  if (parentWithId) {
    const parentTag = parentWithId.tagName.toLowerCase()
    const parentId = parentWithId.id
    return `//${parentTag}[@id='${parentId}']`
  } else {
    return ""
  }
}

function findParentWithId(element: HTMLElement): HTMLElement | null {
  let current = element.parentElement

  while (current) {
    if (current.id) {
      return current
    }
    current = current.parentElement
  }

  return null
}

function buildElementSelector(element: HTMLElement) {
  const tagName = element.tagName.toLowerCase()

  if (tagName === "input" && element instanceof HTMLInputElement && element.type === "button" && element.value) {
    return `//${tagName}[@type='button' and @value='${element.value}']`
  }

  const textParts = extractTextParts(element)
  const textPredicate = buildTextPredicate(tagName, textParts)
  return `//${tagName}${textPredicate}`
}

function extractTextParts(element: HTMLElement): string[] {
  // Use innerText if available (browser), fallback to textContent (jsdom)
  const text = (element.innerText ?? element.textContent ?? "").trim()

  if (!text) {
    return []
  }

  // Split by numbers (including decimals and exponential notation)
  const parts = text.split(/\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g)

  return parts
    .map(part => part.trim().replaceAll("\n", ""))
    .filter(part => part.length > 0)
}

function buildTextPredicate(tagName: string, parts: string[]): string {
  if (parts.length === 0) {
    return ""
  }

  const predicates = parts.map(part => `contains(.,'${part}')`)
  const textConditions = predicates.join(" and ")

  if (tagName === "div") {
    const descendantFilter = `not(descendant::${tagName}[${textConditions}])`
    return `[${textConditions} and ${descendantFilter}]`
  }

  return `[${textConditions}]`
}
