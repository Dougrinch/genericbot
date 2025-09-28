import type { ElementInfo } from "../logic/XPathSubscriptionManager.ts"

interface ElementsListProps {
  elements: ElementInfo[]
}

export function ElementsList({ elements }: ElementsListProps) {
  return (
    <div className="elements-list">
      <div className="elements-list-label">Found elements:</div>
      <div className="elements-list-items">
        {elements.map((el, i) => (
          <div
            key={`${i}-${el.element.textContent}`}
            className={`element-item ${el.isVisible ? "visible" : "hidden"}`}
          >
            <span className="element-tag">{el.element.tagName.toLowerCase()}</span>
            <span className="element-content">
              {(el.element.textContent?.trim() ?? "") || "(empty)"}
            </span>
            {!el.isVisible && <span className="element-status">(hidden)</span>}
          </div>
        ))}
      </div>
    </div>
  )
}
