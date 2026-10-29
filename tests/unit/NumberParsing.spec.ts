import { describe, expect, test } from "vitest"
import { parseFormattedNumber } from "../../src/bot/logic/NumberParsing.ts"


describe("parseFormattedNumber", () => {
  test("parses comma thousands with a decimal point", () => {
    expect(parseFormattedNumber("226,407.5", ".", ",")).toBe(226407.5)
  })

  test("parses point thousands with a decimal comma", () => {
    expect(parseFormattedNumber("226.407,5", ",", ".")).toBe(226407.5)
  })

  test("parses a decimal comma without a thousands separator", () => {
    expect(parseFormattedNumber("12,5", ",", "")).toBe(12.5)
  })

  test("rejects an ambiguous separator configuration", () => {
    expect(parseFormattedNumber("1.234", ".", ".")).toBeNaN()
  })

  test("keeps invalid values invalid", () => {
    expect(parseFormattedNumber("not a number", ".", ",")).toBeNaN()
  })
})
