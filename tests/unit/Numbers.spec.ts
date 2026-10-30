import { describe, expect, test } from "vitest"
import {
  absoluteBotNumber,
  evaluateScriptBinary,
  isLargeNumber,
  parseBotNumber,
  printableBotValue,
  scriptValueIsTruthy,
  toBotNumber
} from "../../src/bot/logic/Numbers.ts"


describe("bot numbers", () => {
  test("keeps ordinary values as native numbers", () => {
    const value = parseBotNumber("123.5")

    expect(value).toBe(123.5)
    expect(isLargeNumber(value)).toBe(false)
  })

  test("keeps finite values beyond the native exponent limit", () => {
    const value = parseBotNumber("1.28e348")

    expect(isLargeNumber(value)).toBe(true)
    expect(String(value)).toBe("1.28e+348")
  })

  test("preserves explicit infinity and invalid numbers", () => {
    expect(parseBotNumber("Infinity")).toBe(Number.POSITIVE_INFINITY)
    expect(parseBotNumber("not a number")).toBeNaN()
  })

  test("converts and formats large script values", () => {
    const value = toBotNumber("-1.28e348")

    expect(String(absoluteBotNumber(value))).toBe("1.28e+348")
    expect(printableBotValue(value)).toBe("-1.28e+348")
    expect(toBotNumber(value)).toBe(value)
  })

  test("promotes native arithmetic when its result would overflow or underflow", () => {
    expect(String(evaluateScriptBinary("*", 1e308, 2))).toBe("2e+308")
    expect(String(evaluateScriptBinary("/", 1e-308, 1e100))).toBe("1e-408")
    expect(evaluateScriptBinary("/", 1, 0)).toBe(Number.POSITIVE_INFINITY)
  })

  test("supports every arithmetic operator for large values", () => {
    const value = parseBotNumber("1.28e348")

    expect(String(evaluateScriptBinary("+", value, value))).toBe("2.56e+348")
    expect(String(evaluateScriptBinary("-", value, value))).toBe("0")
    expect(String(evaluateScriptBinary("*", value, 2))).toBe("2.56e+348")
    expect(String(evaluateScriptBinary("/", value, 2))).toBe("6.4e+347")
    expect(String(evaluateScriptBinary("%", value, parseBotNumber("1e348")))).toBe("2.8e+347")
  })

  test("keeps native operator behavior for ordinary values", () => {
    expect(evaluateScriptBinary("+", 5, 2)).toBe(7)
    expect(evaluateScriptBinary("-", 5, 2)).toBe(3)
    expect(evaluateScriptBinary("*", 5, 2)).toBe(10)
    expect(evaluateScriptBinary("/", 5, 2)).toBe(2.5)
    expect(evaluateScriptBinary("%", 5, 2)).toBe(1)
    expect(evaluateScriptBinary(">", 5, 2)).toBe(true)
    expect(evaluateScriptBinary("<", 5, 2)).toBe(false)
    expect(evaluateScriptBinary(">=", 5, 5)).toBe(true)
    expect(evaluateScriptBinary("<=", 5, 5)).toBe(true)
    expect(evaluateScriptBinary("==", 5, 5)).toBe(true)
    expect(evaluateScriptBinary("!=", 5, 5)).toBe(false)
  })

  test("preserves string addition and strict equality semantics", () => {
    const value = parseBotNumber("1.28e348")

    expect(evaluateScriptBinary("+", "value=", value)).toBe("value=1.28e+348")
    expect(evaluateScriptBinary("==", value, parseBotNumber("1.28e348"))).toBe(true)
    expect(evaluateScriptBinary("!=", value, 1)).toBe(true)
    expect(evaluateScriptBinary("==", value, "1.28e348")).toBe(false)
    expect(evaluateScriptBinary("==", Number.NaN, Number.NaN)).toBe(false)
  })

  test("compares large values without converting them to infinity", () => {
    const larger = parseBotNumber("1.28e348")
    const smaller = parseBotNumber("6e347")

    expect(evaluateScriptBinary(">", larger, smaller)).toBe(true)
    expect(evaluateScriptBinary("<", smaller, larger)).toBe(true)
    expect(evaluateScriptBinary(">=", larger, larger)).toBe(true)
    expect(evaluateScriptBinary("<=", smaller, larger)).toBe(true)
  })

  test("uses numeric truthiness for large values", () => {
    expect(scriptValueIsTruthy(parseBotNumber("1e348"))).toBe(true)
    expect(scriptValueIsTruthy(evaluateScriptBinary("-", parseBotNumber("1e348"), parseBotNumber("1e348")))).toBe(false)
    expect(scriptValueIsTruthy(0)).toBe(false)
  })

  test("produces NaN for unsupported operands instead of overflowing", () => {
    const value = parseBotNumber("1e348")

    expect(String(evaluateScriptBinary("*", value, Symbol("invalid")))).toBe("NaN")
    expect(evaluateScriptBinary("-", "3", "1")).toBe(2)
    expect(evaluateScriptBinary("+", Number.POSITIVE_INFINITY, 1)).toBe(Number.POSITIVE_INFINITY)
  })
})
