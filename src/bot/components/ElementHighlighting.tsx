export function ElementHighlighting({ element }: { element: HTMLElement }) {
  const rect = element.getBoundingClientRect()

  return (
    <div
      className="element-highlighting"
      style={{
        left: `${rect.left - 10}px`,
        top: `${rect.top - 10}px`,
        width: `${rect.width}px`,
        height: `${rect.height}px`
      }}
    />
  )
}
