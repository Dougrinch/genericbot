export function lazy<T>(value: () => T): { v: T } {
  let calculated: T | null = null
  return {
    get v(): T {
      if (calculated != null) {
        return calculated
      } else {
        calculated = value()
        return calculated
      }
    }
  }
}
