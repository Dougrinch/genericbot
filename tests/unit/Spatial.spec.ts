import { describe, expect, test } from "vitest"
import {
  dominantAxisDirection,
  nearestManhattanOffset,
  offsetX,
  offsetY,
  type Offset
} from "../../src/bot/script/Spatial.ts"


describe("nearestManhattanOffset", () => {
  test("finds the closest pair across all targets and origins", () => {
    const offset = nearestManhattanOffset(
      [cell(0, 8), cell(10, 3)],
      [cell(2, 2), cell(9, 2), cell(8, 3), cell(9, 3)],
      "data-column",
      "data-row"
    )

    expect(offset).toEqual({ x: 1, y: 0 })
  })

  test("ignores elements without numeric coordinates", () => {
    const invalidX = document.createElement("div")
    invalidX.dataset.column = "invalid"
    invalidX.dataset.row = "1"
    const invalidY = document.createElement("div")
    invalidY.dataset.column = "1"
    invalidY.dataset.row = "invalid"

    expect(nearestManhattanOffset(
      [invalidX, invalidY, cell(0, 3)],
      [invalidX, invalidY, cell(0, 1)],
      "data-column",
      "data-row"
    )).toEqual({ x: 0, y: 2 })
  })

  test("returns undefined when no coordinate pair is available", () => {
    expect(nearestManhattanOffset([], [cell(0, 0)], "data-column", "data-row")).toBeUndefined()
  })
})

describe("offset helpers", () => {
  test("read axes and use zero when no offset is available", () => {
    expect(offsetX({ x: 4, y: -2 })).toBe(4)
    expect(offsetY({ x: 4, y: -2 })).toBe(-2)
    expect(offsetX(undefined)).toBe(0)
    expect(offsetY(undefined)).toBe(0)
  })

  test.each([
    { offset: { x: 2, y: 0 }, expected: "d" },
    { offset: { x: -2, y: 0 }, expected: "a" },
    { offset: { x: 0, y: 2 }, expected: "s" },
    { offset: { x: 0, y: -2 }, expected: "w" },
    { offset: { x: 2, y: 2 }, expected: "d" },
    { offset: { x: 1, y: 2 }, expected: "s" },
    { offset: { x: 0, y: 0 }, expected: "" },
    { offset: undefined, expected: "" }
  ] satisfies { offset: Offset | undefined, expected: string }[])(
    "maps $offset to '$expected'",
    ({ offset, expected }) => {
      expect(dominantAxisDirection(offset, "w", "a", "s", "d")).toBe(expected)
    }
  )
})

function cell(column: number, row: number): HTMLElement {
  const element = document.createElement("div")
  element.dataset.column = String(column)
  element.dataset.row = String(row)
  return element
}
