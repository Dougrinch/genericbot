const uniqueIds = new WeakMap<object, number>()
let lastId = 0

export function getUniqueId(o: object): number {
  const id = uniqueIds.get(o)
  if (id !== undefined) {
    return id
  }
  const nextId = lastId++
  uniqueIds.set(o, nextId)
  return nextId
}
