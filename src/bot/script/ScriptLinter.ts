import type { EditorView } from "@codemirror/view"
import type { Diagnostic } from "@codemirror/lint"
import { syntaxTree } from "@codemirror/language"
import {
  CodeBlock,
  DoWhileStatement,
  ElseStatement,
  Expression,
  FunctionCall,
  FunctionDeclaration,
  FunctionParameters,
  FunctionParametersDeclaration,
  Identifier,
  IfStatement,
  VariableDefinition,
  WhileStatement
} from "./generated/script.terms.ts"
import { type SyntaxNode, type SyntaxNodeRef, type Tree } from "@lezer/common"
import type { ScriptExternals } from "./ScriptExternals.ts"
import { lazy } from "../../utils/lazy.ts"
import { StateEffect, StateField } from "@uiw/react-codemirror"

export type LintResult = {
  code: string
  tree: Tree
  root: LintScope
  correct: boolean
  diagnostics: Diagnostic[]
}

export type LintScope = {
  readonly node: {
    readonly from: number
    readonly to: number
  }
  readonly children: LintScope[]
  readonly functions: Map<string, ResolvedFunction>
  readonly variables: Map<string, ResolvedVariable>
}

type ResolvedFunction = {
  readonly name: string
  readonly async: boolean
  readonly nameNode?: SyntaxNodeRef
  readonly arguments: {
    readonly name: string
    readonly implicit?: boolean
  }[]
}

type ResolvedVariable = {
  readonly name: string
  readonly async: boolean
  readonly nameNode?: SyntaxNodeRef
}

export const setLintResult = StateEffect.define<LintResult>()
export const lintResultField = StateField.define<LintResult | null>({
  create: () => null,
  update: (prev, transaction) => {
    for (const e of transaction.effects) {
      if (e.is(setLintResult)) {
        return e.value
      }
    }
    return prev
  }
})

export function scriptLinter(externals: ScriptExternals): (view: EditorView) => Diagnostic[] {
  return view => {
    const tree = syntaxTree(view.state)
    const code = view.state.doc.toString()

    const result = lint(tree, code, externals)

    view.dispatch({ effects: setLintResult.of(result) })
    return result.diagnostics
  }
}

export function lint(tree: Tree, code: string, externals: ScriptExternals): LintResult {
  const diagnostics: Diagnostic[] = []

  function addError(node: SyntaxNodeRef | undefined, message: string, severity: Diagnostic["severity"] = "error") {
    if (node) {
      diagnostics.push({
        from: node.from,
        to: node.to,
        severity: severity,
        message: message
      })
    }
  }

  tree.cursor().iterate(node => {
    if (node.type.isError) {
      addError(node, "Syntax error")
    }
  })

  function slice(node: SyntaxNode) {
    return code.slice(node.from, node.to)
  }

  type ScopeRef = {
    readonly scope: LintScope
    readonly parentScope?: ScopeRef
    depth: number
  }

  function registerNewScope(node: SyntaxNode, parent?: LintScope): LintScope {
    const result: LintScope = {
      node: {
        from: node.from,
        to: node.to
      },
      children: [],
      functions: parent ? new Map(parent.functions) : new Map<string, ResolvedFunction>(),
      variables: parent ? new Map(parent.variables) : new Map<string, ResolvedVariable>()
    }
    parent?.children.push(result)
    return result
  }

  let scopeRef: ScopeRef = {
    scope: registerNewScope(tree.topNode),
    depth: 0
  }

  function getFunction(name: string): ResolvedFunction | undefined {
    const fromScope = scopeRef.scope.functions.get(name)
    if (fromScope) {
      return fromScope
    }
    return externals.functions.get(name)
  }

  function getVariable(name: string): ResolvedVariable | undefined {
    const fromScope = scopeRef.scope.variables.get(name)
    if (fromScope) {
      return fromScope
    }
    return externals.variables.get(name)
  }

  const cursor = tree.cursor()
  node: while (true) {
    if (cursor.type.id === VariableDefinition) {
      const nameNode = cursor.node.getChild(Identifier)

      if (nameNode) {
        const name = slice(nameNode)

        if (name != null) {
          const oldVariable = getVariable(name)
          if (oldVariable != null) {
            addError(nameNode, `Variable "${name}" already declared`)
            addError(oldVariable.nameNode, `Variable "${name}" already declared`)
          }

          const variable = {
            name: name,
            async: false,
            nameNode: nameNode
          }
          scopeRef.scope.variables.set(name, variable)

          if (cursor.node.parent?.type?.id === FunctionParametersDeclaration) {
            const functionNameNode = cursor.node.parent?.parent?.getChild(Identifier)
            if (functionNameNode) {
              const functionName = slice(functionNameNode)
              getFunction(functionName)?.arguments.push(variable)
            }
          }
        }
      }
    } else if (cursor.type.id === FunctionDeclaration) {
      const nameNode = cursor.node.getChild(Identifier)

      if (nameNode) {
        const name = slice(nameNode)

        if (name != null) {
          const oldFunction = getFunction(name)
          if (oldFunction != null) {
            addError(nameNode, `Function "${name}" already declared`)
            addError(oldFunction.nameNode, `Function "${name}" already declared`)
          }

          scopeRef.scope.functions.set(name, {
            name: name,
            async: true,
            nameNode: nameNode,
            arguments: []
          })
        }
      }
    }

    if (cursor.type.id === Identifier) {
      if (cursor.node.parent?.type?.id !== FunctionCall
        && cursor.node.parent?.type?.id !== FunctionDeclaration
        && cursor.node.parent?.type?.id !== VariableDefinition) {
        const name = slice(cursor.node)
        if (!getVariable(name) && !getFunction(name)) {
          addError(cursor.node, `Variable "${name}" not declared`)
        }
      }
    }

    if (cursor.type.id === FunctionCall) {
      const nameNode = cursor.node.getChild(Identifier)
      if (nameNode) {
        const name = slice(nameNode)
        const func = getFunction(name)
        if (!func) {
          if (!getVariable(name)) {
            addError(nameNode, `Function "${name}" not declared`)
          }
        } else {
          const parameters = cursor.node.getChild(FunctionParameters)?.getChildren(Expression) ?? []
          const lastBlock = cursor.node.getChild(CodeBlock)
          if (lastBlock) {
            parameters.push(lastBlock)
          }
          let valueIdx = 0
          let declarationIdx = 0
          while (valueIdx < parameters.length && declarationIdx < func.arguments.length) {
            if (func.arguments[declarationIdx].implicit ?? false) {
              declarationIdx += 1
              continue
            }

            valueIdx += 1
            declarationIdx += 1
          }

          const functionSignature = lazy(() => {
            const params = func.arguments
              .filter(a => !(a.implicit ?? false))
              .map(a => a.name)
              .join(", ")
            return `fun ${name}(${params})`
          })

          for (let i = valueIdx; i < parameters.length; i++) {
            const parameter = parameters[i].firstChild
            if (parameter) {
              addError(parameter, `Too many arguments for "${functionSignature.v}"`)
            }
          }

          const parametersBounds = lazy(() => {
            const toNode = cursor.node.getChild(FunctionParameters)?.getChild(")")
            const to = toNode?.to
            const from = toNode?.prevSibling?.from
            if (from != null && to != null) {
              return [from, to]
            }
            return [cursor.node.from, cursor.node.to]
          })

          for (let i = declarationIdx; i < func.arguments.length; i++) {
            if (!(func.arguments[i].implicit ?? false)) {
              const bounds = parametersBounds.v
              diagnostics.push({
                from: bounds[0],
                to: bounds[1],
                severity: "error",
                message: `Missed argument "${func.arguments[i].name}" for "${functionSignature.v}"`
              })
            }
          }
        }
      }
    }

    const newScope = cursor.type.id === CodeBlock
      || cursor.type.id === FunctionDeclaration
      || cursor.type.id === IfStatement
      || cursor.type.id === ElseStatement
      || cursor.type.id === WhileStatement
      || cursor.type.id === DoWhileStatement

    if (cursor.firstChild()) {
      if (newScope) {
        scopeRef = {
          scope: registerNewScope(cursor.node.parent!, scopeRef.scope),
          parentScope: scopeRef,
          depth: 0
        }
      } else {
        scopeRef.depth += 1
      }
      continue
    } else if (cursor.nextSibling()) {
      continue
    }

    while (cursor.parent()) {
      if (scopeRef.depth === 0) {
        scopeRef = scopeRef.parentScope!
      } else {
        scopeRef.depth -= 1
      }
      if (cursor.nextSibling()) {
        continue node
      }
    }

    break
  }

  while (scopeRef.parentScope) {
    scopeRef = scopeRef.parentScope
  }

  return {
    code,
    tree,
    root: scopeRef.scope,
    correct: diagnostics.length === 0,
    diagnostics
  }
}
