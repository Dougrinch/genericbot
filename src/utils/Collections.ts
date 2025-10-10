export function elementsToRoot(element: HTMLElement, config: {
  includeSelf: boolean
  includeRoot: boolean
}): Iterable<HTMLElement> {
  return {
    * [Symbol.iterator]() {
      let current = config.includeSelf ? element : element.parentElement
      while (current != null && (config.includeRoot || current.parentElement != null)) {
        yield current
        current = current.parentElement
      }
    }
  }
}

export function collectAllToSet<R, T>(roots: Iterable<R>, values: (r: R) => Iterable<T>, set: Set<T> = new Set()): Set<T> {
  for (const root of roots) {
    collectToSet(values(root), set)
  }
  return set
}

export function collectToSet<T>(values: Iterable<T>, set: Set<T> = new Set()): Set<T> {
  return collectTo(values, set, (s, v) => s.add(v))
}

export function collectTo<T, C>(values: Iterable<T>, collection: C, add: (c: C, v: T) => void): C {
  for (const value of values) {
    add(collection, value)
  }
  return collection
}

export function iterable<T>(from: T, next: (v: T) => T, until: (v: T) => boolean = () => true): Iterable<T> {
  return {
    * [Symbol.iterator]() {
      let current = from
      while (until(current)) {
        yield current
        current = next(current)
      }
    }
  }
}
