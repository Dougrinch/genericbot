import type { DecimalSeparator, ThousandsSeparator } from "./Config.ts"


export function parseFormattedNumber(
  value: string,
  decimalSeparator: DecimalSeparator,
  thousandsSeparator: ThousandsSeparator
): number {
  if (decimalSeparator === thousandsSeparator) {
    return Number.NaN
  }

  const withoutThousands = thousandsSeparator === ""
    ? value
    : value.split(thousandsSeparator).join("")
  const normalized = decimalSeparator === "."
    ? withoutThousands
    : withoutThousands.replaceAll(decimalSeparator, ".")
  return Number(normalized)
}
