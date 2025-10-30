import { useEffect, useRef, useState } from "react"

type Point = {
  x: number
  y: number
}

export function ClickCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [points, setPoints] = useState<Point[]>([])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas internal resolution to match CSS dimensions
    canvas.width = 400
    canvas.height = 250

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Draw all points
    ctx.fillStyle = "#3b82f6"
    for (const point of points) {
      ctx.beginPath()
      ctx.arc(point.x, point.y, 5, 0, 2 * Math.PI)
      ctx.fill()
    }
  }, [points])

  const handleClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top

    setPoints(prev => [...prev, { x, y }])
  }

  return (
    <canvas
      ref={canvasRef}
      className="click-canvas"
      onClick={handleClick}
    />
  )
}
