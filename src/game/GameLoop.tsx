import { type PropsWithChildren, useEffect, useRef } from "react"
import { dispatch } from "./GameStateContext.ts"

export function GameLoop({ children }: PropsWithChildren) {
  const animationFrameHandleRef = useRef<number | null>(null)
  const previousTimeRef = useRef(-1)

  useEffect(() => {
    previousTimeRef.current = performance.now()

    const tick = () => {
      const time = performance.now()
      dispatch({ type: "tick", dt: time - previousTimeRef.current })
      previousTimeRef.current = time
      animationFrameHandleRef.current = requestAnimationFrame(tick)
    }
    animationFrameHandleRef.current = requestAnimationFrame(tick)

    return () => {
      const handle = animationFrameHandleRef.current
      if (handle !== null) {
        cancelAnimationFrame(handle)
      }
    }
  })

  return (
    <>
      {children}
    </>
  )
}
