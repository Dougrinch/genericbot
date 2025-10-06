import { indentOnInput, indentUnit, LanguageSupport, LRLanguage } from "@codemirror/language"
import { styleTags, tags as t } from "@lezer/highlight"
import { parser } from "./generated/xpath.ts"

const highlighting = styleTags({
  StringLiteral: t.string,
  NumberLiteral: t.number,
  "( )": t.paren,
  "[ ]": t.squareBracket,
  ", \"/\" \"//\"": t.separator,
  NameTest: t.variableName,
  FunctionName: t.function(t.variableName)
})

export const xpathLanguage = LRLanguage.define({
  parser: parser.configure({
    props: [
      highlighting
    ]
  })
})

export function xpath() {
  return new LanguageSupport(xpathLanguage, [
    indentUnit.of("  "),
    indentOnInput()
  ])
}
