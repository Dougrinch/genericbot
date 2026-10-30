import type { DecimalSeparator, ThousandsSeparator } from "./Config.ts"
import { parseBotNumber, type BotNumber } from "./Numbers.ts"


export function parseFormattedNumber(
  value: string,
  decimalSeparator: DecimalSeparator,
  thousandsSeparator: ThousandsSeparator
): BotNumber {
  if (decimalSeparator === thousandsSeparator) {
    return Number.NaN
  }

  const withoutThousands = thousandsSeparator === ""
    ? value
    : value.split(thousandsSeparator).join("")
  const normalized = decimalSeparator === "."
    ? withoutThousands
    : withoutThousands.replaceAll(decimalSeparator, ".")
  return parseBotNumber(normalized)
}
