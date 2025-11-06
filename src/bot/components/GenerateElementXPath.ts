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
    const valueFilter = buildTextFilter("@value", element.value)
    return `//${tagName}[@type='button' and ${valueFilter}]`
  }

  const text = (element.innerText ?? element.textContent ?? "").trim()
  const textFilter = buildTextFilter(".", text)
  if (!textFilter) {
    return `//${tagName}`
  }

  if (tagName === "div") {
    const descendantFilter = `not(descendant::${tagName}[${textFilter}])`
    return `//${tagName}[${textFilter} and ${descendantFilter}]`
  }

  return `//${tagName}[${textFilter}]`
}

function buildTextFilter(key: string, text: string): string {
  if (text.match(/^[a-zA-Z ]+$/g)) {
    return `${key}='${text}'`
  }

  return text.split(/\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g)
    .map(part => part.trim().replaceAll("\n", ""))
    .filter(part => part.length > 0)
    .map(part => `contains(${key},'${part}')`)
    .join(" and ")
}
