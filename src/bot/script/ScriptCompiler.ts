import type { PluginValue, ViewUpdate } from "@codemirror/view"
import { type SyntaxNode } from "@lezer/common"
import {
  BinaryExpression,
  Boolean as BooleanTerm,
  CodeBlock,
  Comment,
  DoWhileStatement,
  ElseStatement,
  Expression,
  FunctionCall,
  FunctionDeclaration,
  FunctionParameters,
  FunctionParametersDeclaration,
  Identifier,
  IfStatement,
  Number as NumberTerm,
  ParenthesizedExpression,
  Script,
  Statement,
  String as StringTerm,
  VariableDeclaration,
  VariableDefinition,
  WhileStatement
} from "./generated/script.terms.ts"
import { ViewPlugin } from "@uiw/react-codemirror"
import { findClosestScope, type LintResult, type LintScope, setLintResult } from "./ScriptLinter.ts"


export type CompilationResult = {
  code: string
  function: (ctx: object) => Promise<void>
  usedFunctions: Set<string>
  usedVariables: Set<string>
}

export function compiler(onCompilation: (result: CompilationResult | null) => void) {
  return ViewPlugin.define<PluginValue>(() => {
    return {
      update(update: ViewUpdate) {
        for (const transaction of update.transactions) {
          for (const effect of transaction.effects) {
            if (effect.is(setLintResult)) {
              const lintResult = effect.value
              const result = compile(lintResult)
              onCompilation(result)
            }
          }
        }
      }
    }
  })
}

export function compile(lintResult: LintResult): CompilationResult | null {
  if (lintResult.correct) {
    return compileNode(lintResult.root, lintResult.tree.topNode, lintResult.code)
  } else {
    return null
  }
}

function compileNode(root: LintScope, node: SyntaxNode, code: string): CompilationResult | null {
  const usedFunctions = new Set<string>()
  const usedVariables = new Set<string>()

  const singleOffset = "  "

  function compileNode(node: SyntaxNode, depth: number): string {
    const newLine = `\n${singleOffset.repeat(depth)}`

    function slice(node: SyntaxNode) {
      return String(code.slice(node.from, node.to))
    }

    function nestedBlock(node: SyntaxNode) {
      const nested = compileNode(node, depth + 1)
      if (nested.length > 0) {
        return `{${newLine}${singleOffset}${nested}${newLine}}`
      } else {
        return `{${newLine}}`
      }
    }

    switch (node.type.name) {
      case "CompareOperator":
      case "LogicOperator":
      case "ArithmeticOperator": {
        const op = slice(node)
        switch (op) {
          case "==":
            return "==="
          case "!=":
            return "!=="
          default:
            return op
        }
      }
    }

    switch (node.type.id) {
      case Script:
      case CodeBlock: {
        return node.getChildren(Statement).map(s => compileNode(s, depth)).join(newLine)
      }
      case Comment: {
        return ""
      }
      case Statement: {
        return `${compileNode(node.firstChild!, depth)};`
      }
      case Expression:
      case VariableDefinition: {
        return compileNode(node.firstChild!, depth)
      }
      case ParenthesizedExpression: {
        return `(${compileNode(node.getChild(Expression)!, depth)})`
      }
      case FunctionCall: {
        const name = slice(node.getChild(Identifier)!)
        const parameters = node.getChild(FunctionParameters)?.getChildren(Expression) ?? []
        const lastBlock = node.getChild(CodeBlock)

        const argValues = []
        let valueIdx = 0
        let declarationIdx = 0

        const scope = findClosestScope(root, node.from)
        const resolvedFunction = scope.functions.get(name)
        if (resolvedFunction) {
          if (resolvedFunction.external) {
            usedFunctions.add(name)
          }

          const awaitPrefix = resolvedFunction.async ? "await " : ""

          while (valueIdx < parameters.length && declarationIdx < resolvedFunction.arguments.length) {
            if (resolvedFunction.arguments[declarationIdx].implicit ?? false) {
              argValues.push(resolvedFunction.arguments[declarationIdx].name)
              usedVariables.add(resolvedFunction.arguments[declarationIdx].name)
              declarationIdx += 1
              continue
            }

            argValues.push(compileNode(parameters[valueIdx].firstChild!, depth))
            valueIdx += 1
            declarationIdx += 1
          }

          for (let i = declarationIdx; i < resolvedFunction.arguments.length; i++) {
            if (resolvedFunction.arguments[i].implicit ?? false) {
              argValues.push(resolvedFunction.arguments[i].name)
              usedVariables.add(resolvedFunction.arguments[i].name)
            }
          }

          if (lastBlock) {
            const functionArguments = resolvedFunction.arguments
            const asyncLastBlock = functionArguments.length > 0 ? functionArguments[functionArguments.length - 1].async : undefined
            const asyncLastBlockPrefix = asyncLastBlock ?? false ? "async " : ""
            argValues.push(`${asyncLastBlockPrefix}() => ${nestedBlock(lastBlock)}`)
          }

          return `${awaitPrefix}${name}(${argValues.join(", ")})`
        } else {
          const resolvedVariable = scope.variables.get(name)!
          if (resolvedVariable.external) {
            usedVariables.add(name)
          }
          return `await ${name}()`
        }
      }
      case FunctionDeclaration: {
        const name = slice(node.getChild(Identifier)!)
        const parameters = node.getChild(FunctionParametersDeclaration)?.getChildren(VariableDefinition) ?? []
        const body = node.getChild(CodeBlock)!
        const scope = findClosestScope(root, node.from)
        const resolvedFunction = scope.functions.get(name)!
        const asyncPrefix = resolvedFunction.async ? "async " : ""
        return `${asyncPrefix}function ${name}(${parameters.map(p => compileNode(p, depth)).join(",")}) ${nestedBlock(body)}`
      }
      case WhileStatement: {
        const condition = node.getChild(Expression)!
        const body = node.getChild(CodeBlock)!
        return `while (${compileNode(condition, depth)}) ${nestedBlock(body)}`
      }
      case DoWhileStatement: {
        const body = node.getChild(CodeBlock)!
        const condition = node.getChild(Expression)!
        return `do ${nestedBlock(body)} while (${compileNode(condition, depth)})`
      }
      case IfStatement: {
        const condition = node.getChild(Expression)!
        const body = node.getChild(CodeBlock)!
        const elseStatement = node.getChild(ElseStatement)
        if (elseStatement) {
          const nestedIfStatement = elseStatement.getChild(IfStatement)
          const elseCodeBlock = elseStatement.getChild(CodeBlock)
          if (nestedIfStatement) {
            return `if (${compileNode(condition, depth)}) ${nestedBlock(body)} else ${compileNode(nestedIfStatement, depth)}`
          } else {
            return `if (${compileNode(condition, depth)}) ${nestedBlock(body)} else ${nestedBlock(elseCodeBlock!)}`
          }
        } else {
          return `if (${compileNode(condition, depth)}) ${nestedBlock(body)}`
        }
      }
      case VariableDeclaration: {
        const name = node.getChild(VariableDefinition)!
        const value = node.getChild(Expression)!
        return `let ${compileNode(name, depth)} = ${compileNode(value, depth)}`
      }
      case BinaryExpression: {
        const left = node.firstChild!
        const operator = left.nextSibling!
        const right = node.lastChild!
        return `${compileNode(left, depth)} ${compileNode(operator, depth)} ${compileNode(right, depth)}`
      }
      case Identifier: {
        const name = slice(node)
        if (node.parent?.type?.id !== FunctionCall
          && node.parent?.type?.id !== FunctionDeclaration
          && node.parent?.type?.id !== VariableDefinition) {
          const scope = findClosestScope(root, node.from)
          const resolvedVariable = scope.variables.get(name)
          if (resolvedVariable) {
            if (resolvedVariable.external) {
              usedVariables.add(name)
            }
            if (resolvedVariable.async) {
              return `await ${name}()`
            } else if (resolvedVariable.external) {
              return `${name}()`
            } else {
              return `${name}`
            }
          } else {
            const resolvedFunction = scope.functions.get(name)!
            if (resolvedFunction.external) {
              usedFunctions.add(name)
            }
            return name
          }
        }
        return name
      }
      case StringTerm:
      case NumberTerm:
      case BooleanTerm: {
        return slice(node)
      }
      default: {
        return `${node.type.name}(/*${slice(node)}*/)`
      }
    }
  }

  const compiledCode = compileNode(node, 1)
  const context = []
  context.push(...usedFunctions.values())
  context.push(...usedVariables.values())
  const scriptCode = `return (async function ({${context.join(", ")}}) {\n${singleOffset}${compiledCode}\n})`

  try {
    // eslint-disable-next-line @typescript-eslint/no-implied-eval,@typescript-eslint/no-unsafe-call
    const func = new Function(scriptCode)() as (ctx: object) => Promise<void>
    return {
      code: scriptCode,
      function: func,
      usedFunctions,
      usedVariables
    }
  } catch (e) {
    console.error(e)
    console.log(scriptCode)
    return null
  }
}
