export function initialElementXPath(element: HTMLElement): string {
  const tagName = element.tagName.toLowerCase()

  if (element.id) {
    return `//${tagName}[@id='${element.id}']`
  }

  const parentWithId = findParentWithId(element)

  const textParts = extractTextParts(element)
  const textPredicate = buildTextPredicate(tagName, textParts)

  if (parentWithId) {
    const parentTag = parentWithId.tagName.toLowerCase()
    const parentId = parentWithId.id
    return `//${parentTag}[@id='${parentId}']//${tagName}${textPredicate}`
  } else {
    return `//${tagName}${textPredicate}`
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

  // Add descendant filter to prevent matching parent when child also matches
  const descendantFilter = `not(descendant::${tagName}[${textConditions}])`

  return `[${textConditions} and ${descendantFilter}]`
}
