import { parser } from "./generated/script.ts"
import type { SyntaxNode } from "@lezer/common"
import { NodeProp, Tree } from "@lezer/common"


export function printNodeTree(node: SyntaxNode, depth: number, code: string) {
  printNode(node, depth, code)

  let child = node.firstChild
  while (child) {
    printNodeTree(child, depth + 1, code)
    child = child.nextSibling
  }
}

export function printNode(node: SyntaxNode, depth: number, code: string) {
  console.info(`${" ".repeat(depth)} ${node.type.name}[${node.from}-${node.to}] (${node.type.id}): ${code.slice(node.from, node.to)}`)
}

export function buildJson(code: string): object | string {
  const node = parser.parse(code).topNode
  return buildJsonInternal(node, code)
}

function buildJsonInternal(node: SyntaxNode, code: string): object | string {
  const children = [] as (object | string)[]
  const result = {} as Record<string, object | string>

  let name = node.type.name
  const group = node.type.prop(NodeProp.group)
  if (group) {
    name += "[" + group.join(", ") + "]"
  }

  let child = node.firstChild
  if (child) {
    result[name] = children
    while (child) {
      children.push(buildJsonInternal(child, code))
      child = child.nextSibling
    }
    if (children.length === 1) {
      result[name] = children[0]
    }
  } else {
    result[name] = code.slice(node.from, node.to)
  }

  if (name === result[name]) {
    return name
  }

  return result
}

export function printCursor(tree: Tree, code: string) {
  console.log("-------------------------")
  const cursor = tree.cursor()

  let depth = 0
  node: while (true) {
    console.info(" ".repeat(depth) + cursor.type.name, code.slice(cursor.from, cursor.to))

    if (cursor.firstChild()) {
      depth += 1
      continue
    } else if (cursor.nextSibling()) {
      continue
    }

    while (cursor.parent()) {
      depth -= 1
      if (cursor.nextSibling()) {
        continue node
      }
    }

    break
  }

  console.log("-------------------------")
}
