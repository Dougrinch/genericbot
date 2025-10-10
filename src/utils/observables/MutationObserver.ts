import { Observable, type OperatorFunction } from "rxjs"
import { filter, map, share } from "rxjs/operators"


export function observeAttributeChange(target: HTMLElement, attributeFilter: string[]): Observable<void> {
  return observeMutated(target, {
    attributes: true,
    attributeFilter: attributeFilter
  }, mr => isRelevantAttribute(mr, attributeFilter))
}

export function isRelevantAttribute(mr: MutationRecord, attributeFilter: string[]): boolean {
  return mr.type === "attributes" && attributeFilter.includes(mr.attributeName!)
}

export function observeMutated(
  target: HTMLElement, options: MutationObserverInit, isRelevant: (mr: MutationRecord) => boolean
): Observable<void> {
  return sharedObserve(target, options).pipe(filter(mrs => mrs.some(isRelevant)), toVoid)
}

export const toVoid: OperatorFunction<unknown, void> = map(() => {})


type CoreFilters = Exclude<keyof MutationObserverInit, "attributeFilter" | "subtree">
type AllCounts = Record<CoreFilters, number> & {
  attributeFilter: Map<string, number>
  allAttributes: number
}

function createEmptyCounts(): AllCounts {
  return {
    childList: 0,
    attributes: 0,
    attributeOldValue: 0,
    characterData: 0,
    characterDataOldValue: 0,
    attributeFilter: new Map(),
    allAttributes: 0
  }
}

function register(counts: AllCounts, options: MutationObserverInit): () => void {
  update(counts, options, 1)
  return () => {
    update(counts, options, -1)
  }
}

function update(counts: AllCounts, options: MutationObserverInit, delta: number) {
  function handleFlag(key: CoreFilters) {
    if (options[key] ?? false) {
      counts[key] += delta
    }
  }

  handleFlag("childList")
  handleFlag("attributes")
  handleFlag("attributeOldValue")
  handleFlag("characterData")
  handleFlag("characterDataOldValue")

  if (options.attributeFilter != null) {
    for (const attribute of options.attributeFilter) {
      let sortRequired = false
      const currentCount = counts.attributeFilter.get(attribute)
      const nextCount = (currentCount ?? 0) + delta
      if (nextCount !== 0) {
        counts.attributeFilter.set(attribute, nextCount)
        sortRequired = currentCount == null
      } else {
        counts.attributeFilter.delete(attribute)
        sortRequired = currentCount != null
      }
      if (sortRequired) {
        counts.attributeFilter = new Map([...counts.attributeFilter].sort((a, b) => {
          if (a[0] < b[0]) return -1
          if (a[0] > b[0]) return 1
          return 0
        }))
      }
    }
  } else {
    if ((options.attributes ?? false) || (options.attributeOldValue ?? false)) {
      counts.allAttributes += delta
    }
  }
}

function buildOptions(counts: AllCounts, subtree: boolean): MutationObserverInit {
  const result: MutationObserverInit = subtree ? { subtree: true } : {}

  function handleFlag(key: CoreFilters) {
    if (counts[key] > 0) {
      result[key] = true
    }
  }

  handleFlag("childList")
  handleFlag("attributes")
  handleFlag("attributeOldValue")
  handleFlag("characterData")
  handleFlag("characterDataOldValue")

  if (counts.allAttributes === 0) {
    const attributeFilter: string[] = []
    for (const [name, count] of counts.attributeFilter) {
      if (count > 0) {
        attributeFilter.push(name)
      }
    }
    if (attributeFilter.length > 0) {
      result.attributeFilter = attributeFilter
    }
  }

  return result
}

function isEquals(oldOptions: MutationObserverInit, newOptions: MutationObserverInit): boolean {
  function isEquals(key: CoreFilters) {
    return oldOptions[key] === newOptions[key]
  }

  if (!isEquals("childList")) return false
  if (!isEquals("attributes")) return false
  if (!isEquals("attributeOldValue")) return false
  if (!isEquals("characterData")) return false
  if (!isEquals("characterDataOldValue")) return false

  const oldFilter = oldOptions.attributeFilter
  const newFilter = newOptions.attributeFilter

  if (oldFilter !== newFilter) {
    if (oldFilter == null || newFilter == null) {
      return false
    }
    if (oldFilter.length !== newFilter.length) {
      return false
    }
    for (let i = 0; i < oldFilter.length; i++) {
      if (oldFilter[i] !== newFilter[i]) {
        return false
      }
    }
  }

  return true
}

function isEmpty(counts: AllCounts): boolean {
  if (counts.childList > 0) return false
  if (counts.attributes > 0) return false
  if (counts.attributeOldValue > 0) return false
  if (counts.characterData > 0) return false
  if (counts.characterDataOldValue > 0) return false

  if (counts.allAttributes > 0) return false

  for (const count of counts.attributeFilter.values()) {
    if (count > 0) {
      return false
    }
  }

  return true
}

type State = {
  counts: AllCounts
  currentOptions: MutationObserverInit
  observable: Observable<MutationRecord[]>
  updateOptions: (newOptions: MutationObserverInit) => void
}

const subtreeCache: Map<HTMLElement, State> = new Map()
const singleElementCache: Map<HTMLElement, State> = new Map()

export function sharedObserve(target: HTMLElement, options: MutationObserverInit): Observable<MutationRecord[]> {
  const subtree = options.subtree ?? false
  const cache = subtree ? subtreeCache : singleElementCache

  return new Observable<MutationRecord[]>(subscriber => {
    const currentState = cache.get(target)
    let unregister: () => void
    if (currentState) {
      unregister = register(currentState.counts, options)
      const newOptions = buildOptions(currentState.counts, subtree)
      if (!isEquals(currentState.currentOptions, newOptions)) {
        currentState.updateOptions(newOptions)
        currentState.currentOptions = newOptions
      }
      currentState.observable.subscribe(subscriber)
    } else {
      const counts = createEmptyCounts()
      unregister = register(counts, options)
      const newOptions = buildOptions(counts, subtree)
      const { observable, updateOptions } = rawObserve(target, newOptions)
      const realObserver = observable.pipe(share())
      cache.set(target, {
        counts: counts,
        currentOptions: newOptions,
        observable: realObserver,
        updateOptions: updateOptions
      })
      realObserver.subscribe(subscriber)
    }
    return () => {
      unregister()
      const currentState = cache.get(target)!
      if (isEmpty(currentState.counts)) {
        cache.delete(target)
      } else {
        const newOptions = buildOptions(currentState.counts, subtree)
        if (!isEquals(currentState.currentOptions, newOptions)) {
          currentState.updateOptions(newOptions)
          currentState.currentOptions = newOptions
        }
      }
    }
  })
}

function rawObserve(target: HTMLElement, options: MutationObserverInit): {
  observable: Observable<MutationRecord[]>
  updateOptions: (options: MutationObserverInit) => void
} {
  let initialOptions: MutationObserverInit = options
  let onUpdateOptions: ((newOptions: MutationObserverInit) => void) | null = null

  const observable = new Observable<MutationRecord[]>(subscriber => {
    const observer = new MutationObserver(mutations => {
      subscriber.next(mutations)
    })
    observer.observe(target, initialOptions)
    onUpdateOptions = newOptions => {
      const records = observer.takeRecords()
      if (records.length > 0) {
        subscriber.next(records)
      }
      observer.observe(target, newOptions)
    }
    return () => {
      observer.disconnect()
      onUpdateOptions = null
    }
  })

  return {
    observable,
    updateOptions: newOptions => {
      if (onUpdateOptions) {
        onUpdateOptions(newOptions)
      } else {
        initialOptions = newOptions
      }
    }
  }
}
