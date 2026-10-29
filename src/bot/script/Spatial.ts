export type Offset = Readonly<{
  x: number
  y: number
}>

type Point = {
  x: number
  y: number
}

export function nearestManhattanOffset(
  targets: readonly HTMLElement[],
  origins: readonly HTMLElement[],
  xAttribute: string,
  yAttribute: string
): Offset | undefined {
  let nearest: Offset | undefined
  let nearestDistance = Number.POSITIVE_INFINITY

  for (const target of targets) {
    const targetPoint = readPoint(target, xAttribute, yAttribute)
    if (targetPoint === undefined) {
      continue
    }

    for (const origin of origins) {
      const originPoint = readPoint(origin, xAttribute, yAttribute)
      if (originPoint === undefined) {
        continue
      }

      const offset = {
        x: targetPoint.x - originPoint.x,
        y: targetPoint.y - originPoint.y
      }
      const distance = Math.abs(offset.x) + Math.abs(offset.y)
      if (distance < nearestDistance) {
        nearest = offset
        nearestDistance = distance
      }
    }
  }

  return nearest
}

export function offsetX(offset: Offset | undefined): number {
  return offset?.x ?? 0
}

export function offsetY(offset: Offset | undefined): number {
  return offset?.y ?? 0
}

export function dominantAxisDirection(
  offset: Offset | undefined,
  up: string,
  left: string,
  down: string,
  right: string
): string {
  if (offset === undefined || (offset.x === 0 && offset.y === 0)) {
    return ""
  }
  if (offset.x !== 0 && Math.abs(offset.x) >= Math.abs(offset.y)) {
    return offset.x < 0 ? left : right
  }
  return offset.y < 0 ? up : down
}

function readPoint(element: HTMLElement, xAttribute: string, yAttribute: string): Point | undefined {
  const x = Number.parseFloat(element.getAttribute(xAttribute) ?? "")
  const y = Number.parseFloat(element.getAttribute(yAttribute) ?? "")
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return undefined
  }
  return { x, y }
}
