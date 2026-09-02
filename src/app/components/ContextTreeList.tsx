'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Context } from '../types'
import { getCurrencySymbol } from '../types'
import {
  ContextTreeNode,
  buildContextTree,
  getTreePrefix,
  isContextGroup,
  isLeafContext,
} from '../lib/contextTree'

interface RenderState {
  isActive: boolean
  isExpanded: boolean
}

interface Props {
  contexts: Context[]
  activeContextId?: string
  mode: 'switch' | 'manage'
  className?: string
  collapsedStorageKey?: string
  getItemClassName?: (context: Context, state: RenderState) => string
  onSelect?: (context: Context) => void
  onEdit?: (context: Context) => void
  onRemove?: (context: Context) => void
  onAddChild?: (parent: Context) => void
}

function readCollapsedIds(key?: string): Set<string> {
  if (!key) return new Set()
  try {
    const raw = localStorage.getItem(key)
    const parsed = raw ? JSON.parse(raw) : []
    return new Set(Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [])
  } catch {
    return new Set()
  }
}

function writeCollapsedIds(key: string | undefined, ids: Set<string>) {
  if (!key) return
  try {
    localStorage.setItem(key, JSON.stringify(Array.from(ids)))
  } catch {}
}

function TreeRows({
  nodes,
  allContexts,
  activeContextId,
  mode,
  collapsedIds,
  toggleCollapsed,
  getItemClassName,
  onSelect,
  onEdit,
  onRemove,
  onAddChild,
}: {
  nodes: ContextTreeNode[]
  allContexts: Context[]
  activeContextId?: string
  mode: 'switch' | 'manage'
  collapsedIds: Set<string>
  toggleCollapsed: (id: string) => void
  getItemClassName?: (context: Context, state: RenderState) => string
  onSelect?: (context: Context) => void
  onEdit?: (context: Context) => void
  onRemove?: (context: Context) => void
  onAddChild?: (parent: Context) => void
}) {
  return (
    <>
      {nodes.map(node => {
        const { context, children } = node
        const isGroup = isContextGroup(context, allContexts)
        const isExpanded = !collapsedIds.has(context.id)
        const isActive = context.id === activeContextId
        const state = { isActive, isExpanded }
        const prefix = getTreePrefix(node)
        const icon = context.icon?.trim()
        const label = icon ? `${icon} ${context.name}` : context.name

        return (
          <div key={context.id}>
            <div className={getItemClassName?.(context, state) || ''}>
              {isGroup && children.length > 0 ? (
                <button
                  type="button"
                  aria-expanded={isExpanded}
                  onClick={() => toggleCollapsed(context.id)}
                  className="flex h-10 w-8 flex-shrink-0 items-center justify-center rounded-[14px] text-xs text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                >
                  {isExpanded ? '▾' : '▸'}
                </button>
              ) : (
                <span className="flex h-10 w-8 flex-shrink-0 items-center justify-center text-xs text-transparent">·</span>
              )}

              {mode === 'switch' && isLeafContext(context, allContexts) ? (
                <button
                  type="button"
                  onClick={() => onSelect?.(context)}
                  className="flex min-w-0 flex-1 items-center justify-between gap-2 px-1 py-3 text-left"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    {node.depth > 0 && (
                      <span aria-hidden="true" className="flex-shrink-0 font-mono text-[11px] leading-none text-slate-300 dark:text-slate-600">
                        {prefix}
                      </span>
                    )}
                    <span className="truncate">{label}</span>
                  </span>
                  <span className="flex-shrink-0 text-xs opacity-60">{getCurrencySymbol(context.currency)} {context.currency}</span>
                </button>
              ) : mode === 'switch' ? (
                <div className="flex min-w-0 flex-1 items-center gap-2 px-1 py-2.5">
                  <div className="truncate text-sm font-medium text-slate-700 dark:text-zinc-200">{label}</div>
                </div>
              ) : (
                <div className="flex min-w-0 flex-1 items-center gap-2 px-1 py-2">
                  {node.depth > 0 && (
                    <span aria-hidden="true" className="flex-shrink-0 font-mono text-[11px] leading-none text-slate-300 dark:text-slate-600">
                      {prefix}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-slate-800 dark:text-zinc-100">{label}</div>
                    {!isGroup && (
                      <div className="mt-0.5 truncate text-xs text-slate-400">
                        {context.currency}{context.currency !== context.homeCurrency ? ` → ${context.homeCurrency}` : ''}
                      </div>
                    )}
                  </div>
                  <div className="ml-2 flex flex-shrink-0 items-center gap-2">
                    {isGroup && onAddChild && (
                      <button
                        type="button"
                        onClick={() => onAddChild(context)}
                        className="app-accent text-xs font-medium"
                      >
                        +
                      </button>
                    )}
                    {onEdit && (
                      <button type="button" onClick={() => onEdit(context)} className="app-accent text-xs font-medium">
                        ✎
                      </button>
                    )}
                    {onRemove && (
                      <button type="button" onClick={() => onRemove(context)} className="text-xs font-medium text-rose-400 dark:text-rose-300">
                        ×
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {isGroup && isExpanded && children.length > 0 && (
              <TreeRows
                nodes={children}
                allContexts={allContexts}
                activeContextId={activeContextId}
                mode={mode}
                collapsedIds={collapsedIds}
                toggleCollapsed={toggleCollapsed}
                getItemClassName={getItemClassName}
                onSelect={onSelect}
                onEdit={onEdit}
                onRemove={onRemove}
                onAddChild={onAddChild}
              />
            )}
          </div>
        )
      })}
    </>
  )
}

export default function ContextTreeList({
  contexts,
  activeContextId,
  mode,
  className = '',
  collapsedStorageKey,
  getItemClassName,
  onSelect,
  onEdit,
  onRemove,
  onAddChild,
}: Props) {
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(() => readCollapsedIds(collapsedStorageKey))
  const tree = useMemo(() => buildContextTree(contexts), [contexts])

  useEffect(() => {
    setCollapsedIds(readCollapsedIds(collapsedStorageKey))
  }, [collapsedStorageKey])

  const toggleCollapsed = useCallback((id: string) => {
    setCollapsedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      writeCollapsedIds(collapsedStorageKey, next)
      return next
    })
  }, [collapsedStorageKey])

  return (
    <div className={className}>
      <TreeRows
        nodes={tree}
        allContexts={contexts}
        activeContextId={activeContextId}
        mode={mode}
        collapsedIds={collapsedIds}
        toggleCollapsed={toggleCollapsed}
        getItemClassName={getItemClassName}
        onSelect={onSelect}
        onEdit={onEdit}
        onRemove={onRemove}
        onAddChild={onAddChild}
      />
    </div>
  )
}
