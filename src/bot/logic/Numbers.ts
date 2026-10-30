import Decimal from "decimal.js"


const LargeDecimal = Decimal.clone({
  precision: 100,
  maxE: 9e15,
  minE: -9e15
})

export type BotNumber = number | Decimal

export type ScriptBinaryOperator = "*" | "/" | "%" | "+" | "-"
  | ">" | "<" | ">=" | "<=" | "==" | "!="

export function parseBotNumber(value: string): BotNumber {
  const nativeValue = Number(value)
  if (Number.isFinite(nativeValue) || Number.isNaN(nativeValue)) {
    return nativeValue
  }

  const decimalValue = decimalOrNaN(value)
  return decimalValue.isFinite() ? decimalValue : nativeValue
}

export function toBotNumber(value: unknown): BotNumber {
  if (isLargeNumber(value)) {
    return value
  }

  const nativeValue = Number(value)
  if (Number.isFinite(nativeValue) || Number.isNaN(nativeValue)) {
    return nativeValue
  }

  const decimalValue = decimalOrNaN(String(value))
  return decimalValue.isFinite() ? decimalValue : nativeValue
}

export function absoluteBotNumber(value: BotNumber): BotNumber {
  return isLargeNumber(value) ? value.abs() : Math.abs(value)
}

export function printableBotValue(value: unknown): unknown {
  return isLargeNumber(value) ? value.toString() : value
}

export function evaluateScriptBinary(
  operator: ScriptBinaryOperator,
  left: unknown,
  right: unknown
): unknown {
  switch (operator) {
    case "==":
      return scriptEquals(left, right)
    case "!=":
      return !scriptEquals(left, right)
    case ">":
    case "<":
    case ">=":
    case "<=":
      return evaluateComparison(operator, left, right)
    case "+":
    case "-":
    case "*":
    case "/":
    case "%":
      return evaluateArithmetic(operator, left, right)
  }
}

export function scriptValueIsTruthy(value: unknown): boolean {
  if (isLargeNumber(value)) {
    return !value.isZero() && !value.isNaN()
  }
  return Boolean(value)
}

export function isLargeNumber(value: unknown): value is Decimal {
  return Decimal.isDecimal(value)
}

function evaluateArithmetic(
  operator: "+" | "-" | "*" | "/" | "%",
  left: unknown,
  right: unknown
): unknown {
  if (operator === "+" && (typeof left === "string" || typeof right === "string")) {
    return `${printableBotValue(left) as string}${printableBotValue(right) as string}`
  }

  if (isLargeNumber(left) || isLargeNumber(right)) {
    return decimalArithmetic(operator, decimalOrNaN(left), decimalOrNaN(right))
  }

  const nativeResult = nativeArithmetic(operator, left, right)
  if (shouldPromoteNativeResult(operator, left, right, nativeResult)) {
    return decimalArithmetic(operator, decimalOrNaN(left), decimalOrNaN(right))
  }
  return nativeResult
}

function nativeArithmetic(
  operator: "+" | "-" | "*" | "/" | "%",
  left: unknown,
  right: unknown
): unknown {
  switch (operator) {
    case "+":
      return (left as number) + (right as number)
    case "-":
      return (left as number) - (right as number)
    case "*":
      return (left as number) * (right as number)
    case "/":
      return (left as number) / (right as number)
    case "%":
      return (left as number) % (right as number)
  }
}

function shouldPromoteNativeResult(
  operator: "+" | "-" | "*" | "/" | "%",
  left: unknown,
  right: unknown,
  result: unknown
): boolean {
  if (typeof left !== "number" || typeof right !== "number" || typeof result !== "number") {
    return false
  }
  if (!Number.isFinite(left) || !Number.isFinite(right)) {
    return false
  }
  if (!Number.isFinite(result)) {
    return operator !== "/" || right !== 0
  }
  return result === 0
    && left !== 0
    && right !== 0
    && (operator === "*" || operator === "/")
}

function decimalArithmetic(
  operator: "+" | "-" | "*" | "/" | "%",
  left: Decimal,
  right: Decimal
): Decimal {
  switch (operator) {
    case "+":
      return left.plus(right)
    case "-":
      return left.minus(right)
    case "*":
      return left.times(right)
    case "/":
      return left.div(right)
    case "%":
      return left.mod(right)
  }
}

function evaluateComparison(
  operator: ">" | "<" | ">=" | "<=",
  left: unknown,
  right: unknown
): boolean {
  if (isLargeNumber(left) || isLargeNumber(right)) {
    const comparison = decimalOrNaN(left).comparedTo(decimalOrNaN(right))
    if (Number.isNaN(comparison)) {
      return false
    }
    switch (operator) {
      case ">":
        return comparison > 0
      case "<":
        return comparison < 0
      case ">=":
        return comparison >= 0
      case "<=":
        return comparison <= 0
    }
  }

  switch (operator) {
    case ">":
      return (left as number) > (right as number)
    case "<":
      return (left as number) < (right as number)
    case ">=":
      return (left as number) >= (right as number)
    case "<=":
      return (left as number) <= (right as number)
  }
}

function scriptEquals(left: unknown, right: unknown): boolean {
  if (isLargeNumber(left) || isLargeNumber(right)) {
    if (!isNumberLike(left) || !isNumberLike(right)) {
      return false
    }
    return decimalOrNaN(left).equals(decimalOrNaN(right))
  }
  return left === right
}

function isNumberLike(value: unknown): value is BotNumber {
  return typeof value === "number" || isLargeNumber(value)
}

function decimalOrNaN(value: unknown): Decimal {
  try {
    if (isLargeNumber(value)) {
      return value
    }
    if (typeof value === "string" || typeof value === "number") {
      return new LargeDecimal(value)
    }
    return new LargeDecimal(Number(value))
  } catch {
    return new LargeDecimal(Number.NaN)
  }
}
