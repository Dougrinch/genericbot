import * as React from "react"
import { useEffect, useState } from "react"

export function CoordinateLocatorButton() {
  const [overlay, setOverlay] = useState<HTMLDivElement | null>(null)

  useEffect(() => {
    if (overlay) {
      document.body.appendChild(overlay)
      return () => {
        document.body.removeChild(overlay)
      }
    }
  }, [overlay])

  const handleButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation()

    if (!overlay) {
      const overlay = document.createElement("div")

      overlay.style.position = "fixed"
      overlay.style.inset = "0"
      overlay.style.background = "transparent"
      overlay.style.cursor = "crosshair"
      overlay.style.zIndex = "2147483646"
      overlay.style.display = "block"

      overlay.addEventListener("click", (e: MouseEvent) => {
        overlay.style.display = "none"
        const element = document.elementFromPoint(e.clientX, e.clientY)
        overlay.style.display = "block"

        console.log(e.clientX, e.clientY, element)
        setOverlay(null)
      })

      setOverlay(overlay)
    } else {
      setOverlay(null)
    }
  }

  return (
    <button
      className="icon"
      onClick={handleButtonClick}
      style={{
        background: overlay ? "#0096ff" : "#666"
      }}
    >
      🔍
    </button>
  )
}
