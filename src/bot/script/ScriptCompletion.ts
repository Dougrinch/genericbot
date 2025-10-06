import { type Completion, CompletionContext, type CompletionResult, snippet } from "@codemirror/autocomplete"
import type { FunctionDescriptor, ScriptExternals, VariableDescriptor } from "./ScriptExternals.ts"
import { findClosestScope, lintResultField } from "./ScriptLinter.ts"
import { syntaxTree } from "@codemirror/language"
import {
  FunctionDeclaration,
  FunctionParametersDeclaration,
  Identifier,
  VariableDeclaration,
  VariableDefinition
} from "./generated/script.terms.ts"


export function scriptCompletion(externals: ScriptExternals): (context: CompletionContext) => CompletionResult | null {
  const langOptions: Completion[] = [
    { label: "fun", type: "keyword", detail: "definition", apply: snippet("fun ${1:name}(${2:param}) {${3}\n}") },
    { label: "if", type: "keyword", detail: "block", apply: snippet("if (${1:name}) {${2}\n}") },
    { label: "while", type: "keyword", detail: "loop", apply: snippet("while (${1:condition}) {${2}\n}") },
    { label: "do", type: "keyword", detail: "loop", apply: snippet("do {\n  ${1}\n} while (${2:condition})") },
    { label: "val", type: "keyword", apply: snippet("val ${1:name} = ${2}") }
  ]

  const functionOptions: Completion[] = Array.from(externals.functions.values()).map(functionCompletion)
  const variableOptions: Completion[] = Array.from(externals.variables.values()).map(variableCompletion)

  const staticOptions = [
    ...langOptions,
    ...functionOptions,
    ...variableOptions
  ]

  return context => {
    const word = context.matchBefore(/\w*/)
    if (!word || (word.from === word.to && !context.explicit)) {
      return null
    }

    const prevNode = syntaxTree(context.state).resolve(context.pos, -1)
    if (prevNode.type.id === VariableDeclaration
      || (prevNode.type.id === Identifier && prevNode.parent?.type.id === VariableDefinition)
      || prevNode.type.id === FunctionDeclaration
      || (prevNode.type.id === Identifier && prevNode.parent?.type.id === FunctionDeclaration)
      || prevNode.type.id === FunctionParametersDeclaration
      || (prevNode.name === "(" && prevNode.parent?.type.id === FunctionDeclaration)
      || (prevNode.name === ")" && prevNode.parent?.type.id === FunctionDeclaration)
      || (prevNode.name === "," && prevNode.parent?.type.id === FunctionParametersDeclaration)) {
      return null
    }

    const lintResult = context.state.field(lintResultField, false)
    if (!lintResult) {
      return {
        from: word.from,
        options: staticOptions,
        validFor: /\w*$/
      }
    }

    const scope = findClosestScope(lintResult.root, context.pos)

    return {
      from: word.from,
      options: [
        ...langOptions,
        ...Array.from(scope.functions.values()).map(functionCompletion),
        ...Array.from(scope.variables.values()).map(variableCompletion)
      ],
      validFor: /\w*$/
    }
  }
}

function functionCompletion(desc: FunctionDescriptor): Completion {
  const callParams: string[] = []
  const paramNames: string[] = []
  let i = 0
  for (const argument of desc.arguments) {
    if (!(argument.implicit ?? false)) {
      i += 1
      callParams.push(`\${${i}:${argument.name}}`)
      paramNames.push(argument.name)
    }
  }
  let block: string
  if (desc.lastAsBlock ?? false) {
    callParams.splice(callParams.length - 1, 1)
    paramNames.splice(paramNames.length - 1, 1)
    block = ` {\${${i}}\n}`
  } else {
    block = `\${${i + 1}}`
  }
  return {
    label: desc.name,
    type: "function",
    detail: `${paramNames.join(" ")}`,
    apply: snippet(`${desc.name}(${callParams.join(", ")})${block}`)
  }
}

function variableCompletion(desc: VariableDescriptor): Completion {
  return { label: desc.name, type: "variable", apply: `${desc.name}` }
}
