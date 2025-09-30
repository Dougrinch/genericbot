const uniqueIds = new Map<unknown, number>()
let lastId = 0

export function getUniqueId(o: unknown): number {
  const id = uniqueIds.get(o)
  if (id !== undefined) {
    return id
  }
  const nextId = lastId++
  uniqueIds.set(o, nextId)
  return nextId
}
