'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Context } from '../types'

interface RenderState {
  isActive: boolean
  isDragging: boolean
}

interface Props {
  contexts: Context[]
  activeContextId?: string
  className?: string
  getItemClassName: (context: Context, state: RenderState) => string
  onReorder: (orderedIds: string[]) => void
  renderContext: (context: Context, state: RenderState) => React.ReactNode
}

function sameOrder(a: string[], b: string[]) {
  return a.length === b.length && a.every((id, index) => id === b[index])
}

function getOrderedContexts(contexts: Context[], ids: string[]) {
  const byId = new Map(contexts.map(context => [context.id, context]))
  const seen = new Set<string>()
  const ordered = ids
    .map(id => byId.get(id))
    .filter((context): context is Context => {
      if (!context || seen.has(context.id)) return false
      seen.add(context.id)
      return true
    })

  contexts.forEach(context => {
    if (!seen.has(context.id)) ordered.push(context)
  })

  return ordered
}

function moveId(ids: string[], draggedId: string, targetId: string, afterTarget: boolean) {
  if (draggedId === targetId) return ids
  const next = ids.filter(id => id !== draggedId)
  const targetIndex = next.indexOf(targetId)
  if (targetIndex === -1) return ids
  next.splice(targetIndex + (afterTarget ? 1 : 0), 0, draggedId)
  return next
}

export default function SortableContextList({
  contexts,
  activeContextId,
  className = '',
  getItemClassName,
  onReorder,
  renderContext,
}: Props) {
  const [draftIds, setDraftIds] = useState(() => contexts.map(context => context.id))
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const draftIdsRef = useRef(draftIds)
  const dragRef = useRef<{ id: string; pointerId: number; changed: boolean } | null>(null)
  const listRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    draftIdsRef.current = draftIds
  }, [draftIds])

  useEffect(() => {
    if (draggingId) return
    setDraftIds(contexts.map(context => context.id))
  }, [contexts, draggingId])

  const orderedContexts = useMemo(
    () => getOrderedContexts(contexts, draftIds),
    [contexts, draftIds],
  )

  const finishDrag = () => {
    const drag = dragRef.current
    if (!drag) return

    const nextIds = draftIdsRef.current
    const originalIds = contexts.map(context => context.id)
    dragRef.current = null
    setDraggingId(null)

    if (drag.changed && !sameOrder(nextIds, originalIds)) {
      onReorder(nextIds)
    }
  }

  const handlePointerDown = (event: React.PointerEvent<HTMLButtonElement>, id: string) => {
    if (event.button !== 0) return
    event.preventDefault()
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = { id, pointerId: event.pointerId, changed: false }
    setDraftIds(getOrderedContexts(contexts, draftIdsRef.current).map(context => context.id))
    setDraggingId(id)
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    event.preventDefault()
    event.stopPropagation()

    const rows = Array.from(listRef.current?.querySelectorAll<HTMLElement>('[data-context-id]') || [])
      .filter(row => row.dataset.contextId && row.dataset.contextId !== drag.id)
    if (rows.length === 0) return

    const y = event.clientY
    const target = rows.reduce<{ row: HTMLElement; distance: number } | null>((closest, row) => {
      const rect = row.getBoundingClientRect()
      const center = rect.top + rect.height / 2
      const distance = Math.abs(center - y)
      return !closest || distance < closest.distance ? { row, distance } : closest
    }, null)

    const targetId = target?.row.dataset.contextId
    if (!targetId) return

    const rect = target.row.getBoundingClientRect()
    const afterTarget = y > rect.top + rect.height / 2
    setDraftIds(prev => {
      const next = moveId(prev, drag.id, targetId, afterTarget)
      if (!sameOrder(prev, next)) drag.changed = true
      return next
    })
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
    dragRef.current = null
    setDraggingId(null)
    setDraftIds(contexts.map(context => context.id))
  }

  return (
    <div ref={listRef} className={className}>
      {orderedContexts.map(context => {
        const state = {
          isActive: context.id === activeContextId,
          isDragging: context.id === draggingId,
        }

        return (
          <div
            key={context.id}
            data-context-id={context.id}
            className={getItemClassName(context, state)}
          >
            <button
              type="button"
              aria-label="Drag to reorder context"
              title="Drag to reorder"
              onPointerDown={event => handlePointerDown(event, context.id)}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerCancel}
              className={`flex h-10 w-8 flex-shrink-0 touch-none cursor-grab items-center justify-center rounded-[14px] text-base leading-none text-slate-300 transition-colors hover:bg-slate-100 hover:text-slate-500 active:cursor-grabbing dark:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300 ${state.isDragging ? 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300' : ''}`}
            >
              <span aria-hidden="true">⋮⋮</span>
            </button>
            {renderContext(context, state)}
          </div>
        )
      })}
    </div>
  )
}
