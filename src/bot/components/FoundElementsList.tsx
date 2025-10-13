import type { ElementInfo } from "../logic/ElementsObserver.ts"
import { HoverableElementHighlighter } from "./HoverableElementHighlighter.tsx"

interface ElementsListProps {
  elements: ElementInfo[]
}

export function FoundElementsList({ elements }: ElementsListProps) {
  return (
    <div className="elements-list">
      <div className="elements-list-label">Found elements:</div>
      <div className="elements-list-items">
        {elements.map(el => (
          <HoverableElementHighlighter
            key={`${elements.indexOf(el)}-${el.element.textContent}`}
            elements={[el.element]}
          >
            <div className={`element-item ${el.isVisible ? "visible" : "hidden"}`}>
              <span className="element-tag">{el.element.tagName.toLowerCase()}</span>
              <span className="element-content">
                {(el.element.textContent?.trim() ?? "") || "(empty)"}
              </span>
              {!el.isVisible && <span className="element-status">(hidden)</span>}
            </div>
          </HoverableElementHighlighter>
        ))}
      </div>
    </div>
  )
}
