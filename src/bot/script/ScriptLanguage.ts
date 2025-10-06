import {
  delimitedIndent,
  indentNodeProp,
  indentOnInput,
  indentUnit,
  LanguageSupport,
  LRLanguage
} from "@codemirror/language"
import { styleTags, tags as t } from "@lezer/highlight"
import { parser } from "./generated/script.ts"

const highlighting = styleTags({
  Identifier: t.variableName,
  "VariableDeclaration/Identifier": t.definition(t.variableName),
  Number: t.number,
  String: t.string,
  Boolean: t.bool,
  CompareOperator: t.compareOperator,
  LogicOperator: t.logicOperator,
  ArithmeticOperator: t.arithmeticOperator,
  Keyword: t.keyword,
  Comment: t.lineComment,
  Type: t.typeName,
  "FunctionCall/Identifier": t.function(t.variableName),
  ", ;": t.separator,
  "( )": t.paren,
  "{ }": t.brace,
  "=": t.definitionOperator
})

export const scriptLanguage = LRLanguage.define({
  parser: parser.configure({
    props: [
      highlighting,
      indentNodeProp.add({
        CodeBlock: delimitedIndent({ closing: "}", align: false })
      })
    ]
  }),
  languageData: {
    commentTokens: { line: "//" }
  }
})

export function script() {
  return new LanguageSupport(scriptLanguage, [
    indentUnit.of("  "),
    indentOnInput()
  ])
}
