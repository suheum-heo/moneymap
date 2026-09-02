import { Context } from '../types'

export interface ContextTreeNode {
  context: Context
  children: ContextTreeNode[]
  depth: number
  isLast: boolean
  ancestorContinues: boolean[]
}

export function isContextGroup(context: Context, contexts: Context[]): boolean {
  if (context.isGroup) return true
  return contexts.some(child => child.parentId === context.id)
}

export function isLeafContext(context: Context, contexts: Context[]): boolean {
  return !isContextGroup(context, contexts)
}

export function getLeafContexts(contexts: Context[]): Context[] {
  return contexts.filter(context => isLeafContext(context, contexts))
}

export function getContextChildren(parentId: string | undefined, contexts: Context[]): Context[] {
  return contexts.filter(context => (context.parentId || undefined) === parentId)
}

export function getContextParent(context: Context, contexts: Context[]): Context | undefined {
  if (!context.parentId) return undefined
  return contexts.find(item => item.id === context.parentId)
}

export function getContextBreadcrumb(context: Context, contexts: Context[]): Context[] {
  const trail: Context[] = []
  let current: Context | undefined = context
  const seen = new Set<string>()
  while (current && !seen.has(current.id)) {
    seen.add(current.id)
    trail.unshift(current)
    current = current.parentId ? contexts.find(item => item.id === current?.parentId) : undefined
  }
  return trail
}

export function getContextDisplayName(context: Context, contexts: Context[]): string {
  const parent = getContextParent(context, contexts)
  if (!parent) return context.name
  return `${parent.name} · ${context.name}`
}

export function getContextImportLabel(context: Context, contexts: Context[]): string {
  return getContextBreadcrumb(context, contexts).map(item => item.name).join(' › ')
}

function compareContexts(a: Context, b: Context, storedRanks: Map<string, number>, hasServerOrder: boolean) {
  const aSort = a.sortOrder
  const bSort = b.sortOrder
  if (hasServerOrder) {
    if (aSort != null && bSort != null && aSort !== bSort) return aSort - bSort
    if (aSort != null) return -1
    if (bSort != null) return 1
  }

  const aStored = storedRanks.get(a.id)
  const bStored = storedRanks.get(b.id)
  if (aStored != null && bStored != null && aStored !== bStored) return aStored - bStored
  if (aStored != null) return -1
  if (bStored != null) return 1

  return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
}

function sortSiblingContexts(contexts: Context[], storedOrder: string[] = []): Context[] {
  const storedRanks = new Map(storedOrder.map((id, index) => [id, index]))
  const hasServerOrder = contexts.some(context => context.sortOrder != null)
  return [...contexts].sort((a, b) => compareContexts(a, b, storedRanks, hasServerOrder))
}

export function buildContextTree(contexts: Context[], storedOrder: string[] = []): ContextTreeNode[] {
  const buildLevel = (parentId: string | undefined, depth: number, ancestorContinues: boolean[]): ContextTreeNode[] => {
    const siblings = sortSiblingContexts(getContextChildren(parentId, contexts), storedOrder)
    return siblings.map((context, index) => {
      const isLast = index === siblings.length - 1
      const children = buildLevel(context.id, depth + 1, [...ancestorContinues, !isLast])
      return { context, children, depth, isLast, ancestorContinues }
    })
  }

  return buildLevel(undefined, 0, [])
}

export function flattenContextTree(nodes: ContextTreeNode[]): Context[] {
  const flat: Context[] = []
  const walk = (items: ContextTreeNode[]) => {
    items.forEach(node => {
      flat.push(node.context)
      walk(node.children)
    })
  }
  walk(nodes)
  return flat
}

export function flattenContextTreeIds(nodes: ContextTreeNode[]): string[] {
  return flattenContextTree(nodes).map(context => context.id)
}

export function getTreePrefix(node: ContextTreeNode): string {
  if (node.depth === 0) return ''
  const lines: string[] = node.ancestorContinues.slice(1).map(continues => (continues ? '│  ' : '   '))
  lines.push(node.isLast ? '└─ ' : '├─ ')
  return lines.join('')
}

export function orderContextsDepthFirst(contexts: Context[], storedOrder: string[] = []): Context[] {
  return flattenContextTree(buildContextTree(contexts, storedOrder))
}

export function resolveActiveLeafContext(contexts: Context[], activeContextId: string): Context | undefined {
  const leaves = getLeafContexts(contexts)
  if (leaves.length === 0) return undefined

  const selected = contexts.find(context => context.id === activeContextId)
  if (selected && isLeafContext(selected, contexts)) return selected

  const selectedParentTrail = selected ? getContextBreadcrumb(selected, contexts) : []
  const preferredParentId = selected?.isGroup ? selected.id : selected?.parentId
  if (preferredParentId) {
    const siblingLeaf = leaves.find(leaf => leaf.parentId === preferredParentId)
    if (siblingLeaf) return siblingLeaf
  }

  if (selectedParentTrail.length > 0) {
    const trailIds = new Set(selectedParentTrail.map(context => context.id))
    const relatedLeaf = leaves.find(leaf => leaf.parentId && trailIds.has(leaf.parentId))
    if (relatedLeaf) return relatedLeaf
  }

  return leaves[0]
}

export function getImportableContexts(contexts: Context[], excludeId?: string): Context[] {
  return getLeafContexts(contexts).filter(context => context.id !== excludeId)
}
