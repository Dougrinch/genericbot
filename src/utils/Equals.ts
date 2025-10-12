export function isArraysEqual<T>(e: (e1: T, e2: T) => boolean = Object.is): (a1: T[], a2: T[]) => boolean {
  return (a1, a2) => {
    if (a1.length !== a2.length) {
      return false
    }

    for (let i = 0; i < a1.length; i++) {
      if (!e(a1[i], a2[i])) {
        return false
      }
    }

    return true
  }
}
