export function findElementsByXPath(xpath: string) {
  const res = document.evaluate(xpath, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null)
  const elements = []
  for (let i = 0; i < res.snapshotLength; i++) {
    const element = res.snapshotItem(i)
    if (element instanceof HTMLElement) {
      elements.push(element)
    }
  }
  return elements
}

export function findElementByXPath(xpath: string) {
  const elements = findElementsByXPath(xpath)
  if (elements.length > 1) {
    throw new Error(`Found ${elements.length} elements, xpath: ${xpath}`)
  }
  if (elements.length == 0) {
    throw new Error(`Element not found, xpath: ${xpath}`)
  }
  return elements[0]
}
