import type { ElementInfo } from "../logic/XPathSubscriptionManager.ts"

interface ElementsListProps {
  elements: ElementInfo[]
}

export function ElementsList({ elements }: ElementsListProps) {
  return (
    <div className="statusline">
      {elements.map((el, i) => (
        <span key={`${i}-${el.element.textContent}`}>
          {el.element.tagName.toLowerCase()}: {el.element.textContent}{el.isVisible ? "" : " (hidden)"}
        </span>
      ))}
    </div>
  )
}
