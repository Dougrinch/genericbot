import * as React from "react"
import { useEffect, useRef, useState } from "react"
import { type Selection, useSelectElement } from "./BotContentContext.ts"
import { useSetBotUITransparency } from "./BotUIContext.tsx"
import { useOuterBotRoot } from "./BotContext.ts"

export function CoordinateLocatorButton() {
  const selectElement = useSelectElement()
  const setBotUITransparency = useSetBotUITransparency()
  const outerBotRoot = useOuterBotRoot()

  const [overlay, setOverlay] = useState<HTMLDivElement | null>(null)

  const selectedElement = useRef<HTMLElement | null>(null)
  const selection = useRef<Selection | null>(null)
  const keyDownHandler = useRef<((e: KeyboardEvent) => void) | null>(null)

  useEffect(() => {
    if (overlay) {
      if (selectedElement.current) {
        selection.current = selectElement(selectedElement.current)
      }
      if (keyDownHandler.current) {
        document.addEventListener("keydown", keyDownHandler.current, { capture: true })
      }
      document.body.appendChild(overlay)
      setBotUITransparency(true)
      return () => {
        if (selection.current) {
          selection.current.clear()
        }
        if (keyDownHandler.current) {
          document.removeEventListener("keydown", keyDownHandler.current)
        }
        document.body.removeChild(overlay)
        setBotUITransparency(false)
      }
    }
  }, [overlay, selectElement, setBotUITransparency])

  const handleButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation()

    if (!overlay) {
      selectedElement.current = null
      selection.current = null
      keyDownHandler.current = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          setOverlay(null)
        }
      }

      const overlay = document.createElement("div")

      overlay.style.position = "fixed"
      overlay.style.inset = "0"
      overlay.style.background = "transparent"
      overlay.style.cursor = "crosshair"
      overlay.style.zIndex = "2147483647"
      overlay.style.display = "block"

      function handlePosition(x: number, y: number, shouldSelect: boolean) {
        const element = doWithDisplayNone(overlay, () => {
          return doWithDisplayNone(outerBotRoot.shadowRoot!.getElementById("config-panel")!, () => {
            return document.elementFromPoint(x, y)
          })
        })

        if (element !== selectedElement.current) {
          if (selection.current) {
            selection.current.clear()
          }

          if (element instanceof HTMLElement) {
            selectedElement.current = element
            selection.current = shouldSelect ? selectElement(element) : null
          } else {
            selectedElement.current = null
            selection.current = null
          }
        }
      }

      overlay.addEventListener("mousemove", e => handlePosition(e.clientX, e.clientY, true))

      overlay.addEventListener("click", (e: MouseEvent) => {
        const element = selectedElement.current

        console.log(e.clientX, e.clientY, element)
        alert(`clickAt(${e.clientX}, ${e.clientY})`)

        setOverlay(null)
      })

      handlePosition(e.clientX, e.clientY, false)

      setOverlay(overlay)
    } else {
      setOverlay(null)
    }
  }

  return (
    <button
      className="icon"
      onClick={handleButtonClick}
      // style={{
      //   background: overlay ? "#0096ff" : "#666"
      // }}
    >
      🔍
    </button>
  )
}

function doWithDisplayNone<T>(css: ElementCSSInlineStyle, body: () => T): T {
  const oldDisplay = css.style.display
  try {
    css.style.display = "none"
    return body()
  } finally {
    css.style.display = oldDisplay
  }
}
