import { ElementHighlighting } from "./ElementHighlighting.tsx"

export type HighlightedElementsProps = {
  elements: ReadonlySet<HTMLElement>
}

export function HighlightedElements(props: HighlightedElementsProps) {
  return (
    <div id="highlighted-elements">
      {...Array.from(props.elements).map(e => (
        <ElementHighlighting element={e} />
      ))}
    </div>
  )
}
