export function formatTime(timeMs: number) {
  if (timeMs < 1000) {
    return `${Math.round(timeMs)}ms`
  } else if (timeMs < 60000) {
    const seconds = Math.round(timeMs / 100) / 10
    return `${seconds}s`
  } else {
    const minutes = Math.floor(timeMs / 60000)
    const seconds = Math.round((timeMs % 60000) / 100) / 10
    return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`
  }
}
