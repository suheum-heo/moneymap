'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Context, getCurrencySymbol } from '../types'
import {
  ContextMoveTarget,
  ContextTreeNode,
  buildContextTree,
  canMoveContext,
  getTreePrefix,
  isContextGroup,
  isLeafContext,
} from '../lib/contextTree'

interface RenderState {
  isActive: boolean
  isExpanded: boolean
  isDragging: boolean
  isDropTarget: boolean
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
  onMoveContext?: (draggedId: string, target: ContextMoveTarget) => void
}

type DropIntent = ContextMoveTarget & {
  highlightId: string
  mode: 'into' | 'before' | 'after'
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

function resolveDropIntent(
  contexts: Context[],
  draggedId: string,
  targetId: string,
  afterTarget: boolean,
): DropIntent | null {
  if (draggedId === targetId) return null
  const dragged = contexts.find(context => context.id === draggedId)
  const target = contexts.find(context => context.id === targetId)
  if (!dragged || !target) return null

  const targetIsGroup = isContextGroup(target, contexts)
  const draggedIsGroup = isContextGroup(dragged, contexts)

  if (draggedIsGroup) {
    if (targetIsGroup) {
      return {
        highlightId: targetId,
        mode: afterTarget ? 'after' : 'before',
        parentId: undefined,
        beforeId: afterTarget ? undefined : targetId,
      }
    }
    return null
  }

  if (targetIsGroup) {
    if (!canMoveContext(contexts, draggedId, target.id)) return null
    return {
      highlightId: targetId,
      mode: 'into',
      parentId: target.id,
    }
  }

  const parentId = target.parentId || undefined
  if (!canMoveContext(contexts, draggedId, parentId)) return null
  return {
    highlightId: targetId,
    mode: afterTarget ? 'after' : 'before',
    parentId,
    beforeId: afterTarget ? undefined : targetId,
  }
}

function finalizeDropTarget(
  contexts: Context[],
  draggedId: string,
  intent: DropIntent | null,
): ContextMoveTarget | null {
  if (!intent) return null
  if (intent.mode === 'into') {
    return { parentId: intent.parentId }
  }

  if (intent.mode === 'before') {
    return { parentId: intent.parentId, beforeId: intent.beforeId || intent.highlightId }
  }

  // after: place before the next sibling under the same parent, or at end
  const siblings = contexts
    .filter(context => (context.parentId || undefined) === (intent.parentId || undefined))
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
  const index = siblings.findIndex(context => context.id === intent.highlightId)
  const nextSibling = index >= 0 ? siblings[index + 1] : undefined
  if (nextSibling && nextSibling.id !== draggedId) {
    return { parentId: intent.parentId, beforeId: nextSibling.id }
  }
  return { parentId: intent.parentId }
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
  draggingId,
  dropIntent,
  onDragHandleDown,
  onDragHandleMove,
  onDragHandleUp,
  onDragHandleCancel,
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
  draggingId: string | null
  dropIntent: DropIntent | null
  onDragHandleDown: (event: React.PointerEvent<HTMLButtonElement>, id: string) => void
  onDragHandleMove: (event: React.PointerEvent<HTMLButtonElement>) => void
  onDragHandleUp: (event: React.PointerEvent<HTMLButtonElement>) => void
  onDragHandleCancel: (event: React.PointerEvent<HTMLButtonElement>) => void
}) {
  return (
    <>
      {nodes.map(node => {
        const { context, children } = node
        const isGroup = isContextGroup(context, allContexts)
        const isExpanded = !collapsedIds.has(context.id)
        const isActive = context.id === activeContextId
        const isDragging = context.id === draggingId
        const isDropTarget = dropIntent?.highlightId === context.id
        const state = { isActive, isExpanded, isDragging, isDropTarget }
        const prefix = getTreePrefix(node)
        const icon = context.icon?.trim()
        const label = icon ? `${icon} ${context.name}` : context.name
        const dropRing = isDropTarget
          ? dropIntent?.mode === 'into'
            ? 'ring-2 ring-[#3182f6]/35 bg-[#3182f6]/5'
            : dropIntent?.mode === 'before'
              ? 'border-t-2 border-[#3182f6]'
              : 'border-b-2 border-[#3182f6]'
          : ''

        return (
          <div key={context.id}>
            <div
              data-context-id={context.id}
              data-context-group={isGroup ? '1' : '0'}
              className={`${getItemClassName?.(context, state) || ''} ${dropRing} ${isDragging ? 'opacity-55' : ''}`}
            >
              {mode === 'manage' ? (
                <button
                  type="button"
                  aria-label="Drag to move context"
                  title="Drag to move"
                  onPointerDown={event => onDragHandleDown(event, context.id)}
                  onPointerMove={onDragHandleMove}
                  onPointerUp={onDragHandleUp}
                  onPointerCancel={onDragHandleCancel}
                  className={`flex h-10 w-8 flex-shrink-0 touch-none cursor-grab items-center justify-center rounded-[14px] text-base leading-none text-slate-300 transition-colors hover:bg-slate-100 hover:text-slate-500 active:cursor-grabbing dark:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300 ${isDragging ? 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300' : ''}`}
                >
                  <span aria-hidden="true">⋮⋮</span>
                </button>
              ) : isGroup && children.length > 0 ? (
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

              {mode === 'manage' && isGroup && children.length > 0 && (
                <button
                  type="button"
                  aria-expanded={isExpanded}
                  onClick={() => toggleCollapsed(context.id)}
                  className="mr-1 flex h-8 w-6 flex-shrink-0 items-center justify-center rounded-[12px] text-xs text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                >
                  {isExpanded ? '▾' : '▸'}
                </button>
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
                draggingId={draggingId}
                dropIntent={dropIntent}
                onDragHandleDown={onDragHandleDown}
                onDragHandleMove={onDragHandleMove}
                onDragHandleUp={onDragHandleUp}
                onDragHandleCancel={onDragHandleCancel}
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
  onMoveContext,
}: Props) {
  const { t } = useTranslation()
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(() => readCollapsedIds(collapsedStorageKey))
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dropIntent, setDropIntent] = useState<DropIntent | null>(null)
  const tree = useMemo(() => buildContextTree(contexts), [contexts])
  const listRef = useRef<HTMLDivElement | null>(null)
  const dragRef = useRef<{ id: string; pointerId: number; changed: boolean } | null>(null)
  const dropIntentRef = useRef<DropIntent | null>(null)
  const contextsRef = useRef(contexts)
  const onMoveContextRef = useRef(onMoveContext)

  useEffect(() => {
    contextsRef.current = contexts
  }, [contexts])

  useEffect(() => {
    onMoveContextRef.current = onMoveContext
  }, [onMoveContext])

  useEffect(() => {
    dropIntentRef.current = dropIntent
  }, [dropIntent])

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

  const finishDrag = useCallback(() => {
    const drag = dragRef.current
    if (!drag) return
    const intent = dropIntentRef.current
    const target = finalizeDropTarget(contextsRef.current, drag.id, intent)
    dragRef.current = null
    setDraggingId(null)
    setDropIntent(null)

    if (!drag.changed || !target || !onMoveContextRef.current) return
    const current = contextsRef.current.find(context => context.id === drag.id)
    if (!current) return
    const sameParent = (current.parentId || undefined) === (target.parentId || undefined)
    if (sameParent && !target.beforeId && !intent) return
    onMoveContextRef.current(drag.id, target)
  }, [])

  useEffect(() => {
    if (!draggingId) return
    window.addEventListener('pointerup', finishDrag)
    window.addEventListener('touchend', finishDrag)
    window.addEventListener('mouseup', finishDrag)
    return () => {
      window.removeEventListener('pointerup', finishDrag)
      window.removeEventListener('touchend', finishDrag)
      window.removeEventListener('mouseup', finishDrag)
    }
  }, [draggingId, finishDrag])

  const handlePointerDown = (event: React.PointerEvent<HTMLButtonElement>, id: string) => {
    if (mode !== 'manage' || !onMoveContext) return
    if (event.button !== 0) return
    event.preventDefault()
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = { id, pointerId: event.pointerId, changed: false }
    setDraggingId(id)
    setDropIntent(null)
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    event.preventDefault()
    event.stopPropagation()

    const rows = Array.from(listRef.current?.querySelectorAll<HTMLElement>('[data-context-id]') || [])
      .filter(row => {
        const id = row.dataset.contextId
        return !!id && id !== drag.id && id !== '__root__'
      })
    if (rows.length === 0) return

    const y = event.clientY
    const closest = rows.reduce<{ row: HTMLElement; distance: number } | null>((best, row) => {
      const rect = row.getBoundingClientRect()
      const center = rect.top + rect.height / 2
      const distance = Math.abs(center - y)
      return !best || distance < best.distance ? { row, distance } : best
    }, null)

    const targetId = closest?.row.dataset.contextId
    if (!targetId) return

    const rect = closest.row.getBoundingClientRect()
    const afterTarget = y > rect.top + rect.height / 2
    const targetIsGroup = closest.row.dataset.contextGroup === '1'

    // Hovering the upper 2/3 of a group nests into it; lower third reorders after the group.
    let intent: DropIntent | null = null
    if (targetIsGroup) {
      const nestZone = y < rect.top + rect.height * 0.72
      intent = nestZone
        ? resolveDropIntent(contextsRef.current, drag.id, targetId, false)
        : resolveDropIntent(contextsRef.current, drag.id, targetId, true)
      if (nestZone && intent) {
        intent = { ...intent, mode: 'into', parentId: targetId, beforeId: undefined, highlightId: targetId }
        setCollapsedIds(prev => {
          if (!prev.has(targetId)) return prev
          const next = new Set(prev)
          next.delete(targetId)
          writeCollapsedIds(collapsedStorageKey, next)
          return next
        })
      } else if (intent && intent.mode !== 'into') {
        // keep before/after for group reorder when dragging groups, or leaf after group => top-level after group
        const dragged = contextsRef.current.find(context => context.id === drag.id)
        if (dragged && isLeafContext(dragged, contextsRef.current)) {
          intent = {
            highlightId: targetId,
            mode: 'after',
            parentId: undefined,
          }
        }
      }
    } else {
      intent = resolveDropIntent(contextsRef.current, drag.id, targetId, afterTarget)
    }

    if (!intent) {
      setDropIntent(null)
      return
    }

    drag.changed = true
    setDropIntent(intent)
  }

  const handlePointerUp = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return
    event.preventDefault()
    event.stopPropagation()
    event.currentTarget.releasePointerCapture(event.pointerId)
    finishDrag()
  }

  const handlePointerCancel = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return
    event.preventDefault()
    event.stopPropagation()
    finishDrag()
  }

  return (
    <div ref={listRef} className={className}>
      {mode === 'manage' && onMoveContext && (
        <div
          data-context-id="__root__"
          data-context-group="0"
          onPointerMove={event => {
            const drag = dragRef.current
            if (!drag) return
            const rect = event.currentTarget.getBoundingClientRect()
            if (event.clientY > rect.bottom + 8) return
            // Top-level drop strip: move leaf out of group
            const dragged = contextsRef.current.find(context => context.id === drag.id)
            if (!dragged || isContextGroup(dragged, contextsRef.current)) return
            drag.changed = true
            setDropIntent({
              highlightId: '__root__',
              mode: 'into',
              parentId: undefined,
            })
          }}
          className={`mb-2 rounded-[16px] border border-dashed px-3 py-2 text-center text-[11px] transition-colors ${
            dropIntent?.highlightId === '__root__'
              ? 'border-[#3182f6] bg-[#3182f6]/8 text-[#245ec6]'
              : 'border-slate-200 text-slate-400 dark:border-white/10'
          }`}
        >
          {t('contextDropTopLevel')}
        </div>
      )}
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
        draggingId={draggingId}
        dropIntent={dropIntent}
        onDragHandleDown={handlePointerDown}
        onDragHandleMove={handlePointerMove}
        onDragHandleUp={handlePointerUp}
        onDragHandleCancel={handlePointerCancel}
      />
    </div>
  )
}
