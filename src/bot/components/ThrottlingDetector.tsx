import { useEffect, useState } from "react"

export function useThrottledTime() {
  const [isThrottled, setIsThrottled] = useState(false)
  const [lostTime, setLostTime] = useState<number | null>(null)

  useEffect(() => {
    let timerId: number | null = null
    let warningTimerId: number | null = null

    let startTime = performance.now()
    let counter = 0

    function tick() {
      counter += 100

      const expectedTime = startTime + counter
      const actualTime = performance.now()
      const correctedDelay = Math.max(1, 100 - (actualTime - expectedTime))

      if (timerId != null) {
        timerId = setTimeout(tick, correctedDelay)
      }
    }

    const check = () => {
      if (timerId === null) {
        return
      }

      const actualElapsed = performance.now() - startTime
      const difference = Math.abs(actualElapsed - counter)

      if (difference > 500) {
        showWarning(difference)
      }
    }

    function showWarning(lostTime: number) {
      if (warningTimerId !== null) {
        return
      }

      setIsThrottled(true)
      setLostTime(lostTime)

      warningTimerId = setTimeout(() => {
        resetWarning()
      }, 5000)
    }

    function resetWarning() {
      if (warningTimerId !== null) {
        clearTimeout(warningTimerId)
      }
      warningTimerId = null
      setIsThrottled(false)
      setLostTime(null)
      startTime = performance.now()
      counter = 0
    }

    timerId = setTimeout(tick, 100)
    document.addEventListener("visibilitychange", check, { passive: true })
    window.addEventListener("pageshow", check, { passive: true })

    return () => {
      if (timerId !== null) {
        clearTimeout(timerId)
      }
      resetWarning()
      document.removeEventListener("visibilitychange", check)
      window.removeEventListener("pageshow", check)
    }
  }, [])

  return isThrottled ? lostTime : null
}
