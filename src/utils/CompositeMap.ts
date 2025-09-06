export type CompositeKey = null
  | string
  | number
  | boolean
  | CompositeKey[]
  | { [k: string | number]: CompositeKey }


export class CompositeMap<K extends CompositeKey, V> {
  readonly data = new Map<string, V>()

  get(k: K): V | undefined {
    return this.data.get(stableKey(k))
  }

  set(k: K, value: V): void {
    this.data.set(stableKey(k), value)
  }

  delete(key: K): boolean {
    return this.data.delete(stableKey(key))
  }
}

function stableKey(k: CompositeKey): string {
  if (k === null || typeof k !== "object") {
    return JSON.stringify(k)
  }
  if (Array.isArray(k)) {
    return "[" + k.map(v => stableKey(v)).join(",") + "]"
  }
  const keys = Object.keys(k).sort()
  const body = keys.map(nk => JSON.stringify(nk) + ":" + stableKey(k[nk]))
  return "{" + body.join(",") + "}"
}
