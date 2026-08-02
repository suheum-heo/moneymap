'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from './lib/supabase'
import { EntryType, coerceAmount, normalizeCurrencyCode } from './types'
import { useUserId } from './UserContext'

export interface RecurringItem {
  id: string; type: EntryType; context: string; category: string
  amount: number | null; currency: string; summary: string; remarks: string
  venue: string; location: string
}

const PLACE_META_PREFIX = '[[moneymap:recurring-place:'
const PLACE_META_SUFFIX = ']]'
const PLACE_META_PATTERN = /\n?\[\[moneymap:recurring-place:([\s\S]*?)\]\]\s*$/

function normalizeRecurringType(value: unknown, id: unknown): EntryType {
  if (value === 'income') return 'income'
  if (typeof id === 'string' && /^(rec_)?income_/.test(id)) return 'income'
  return 'expense'
}

function getMissingRecurringColumns(error: { code?: string; message?: string; details?: string } | null) {
  if (!error) return null
  const message = `${error.message || ''} ${error.details || ''}`.toLowerCase()
  const missing = new Set<string>()
  ;(['type', 'venue', 'location'] as const).forEach(column => {
    if (
      message.includes(`'${column}' column`) ||
      message.includes(`recurring.${column}`) ||
      message.includes(`column recurring.${column}`)
    ) {
      missing.add(column)
    }
  })
  if (error.code === 'PGRST204' && missing.size === 0) missing.add('type')
  return missing.size > 0 ? missing : null
}

function decodeRecurringRemarks(raw: string) {
  const remarks = raw || ''
  const match = remarks.match(PLACE_META_PATTERN)
  if (!match || match.index == null) return { remarks, venue: '', location: '' }

  try {
    const parsed = JSON.parse(match[1]) as { venue?: unknown; location?: unknown }
    return {
      remarks: remarks.slice(0, match.index).trimEnd(),
      venue: typeof parsed.venue === 'string' ? parsed.venue : '',
      location: typeof parsed.location === 'string' ? parsed.location : '',
    }
  } catch {
    return { remarks, venue: '', location: '' }
  }
}

function encodeRecurringRemarks(remarks: string, venue: string, location: string) {
  const decoded = decodeRecurringRemarks(remarks)
  const cleanRemarks = decoded.remarks.trim()
  const cleanVenue = venue.trim()
  const cleanLocation = location.trim()
  if (!cleanVenue && !cleanLocation) return cleanRemarks
  const metadata = JSON.stringify({ venue: cleanVenue, location: cleanLocation })
  return `${cleanRemarks}${cleanRemarks ? '\n' : ''}${PLACE_META_PREFIX}${metadata}${PLACE_META_SUFFIX}`
}

function normalizeRecurringAmount(value: unknown): number | null {
  const amount = coerceAmount(value)
  return amount > 0 ? amount : null
}

function getStoredRecurringAmount(amount: number | null): number {
  return amount ?? 0
}

function buildRecurringInsertPayload(
  item: RecurringItem,
  userId: string,
  includeTypeColumn: boolean,
  includePlaceColumns: boolean,
) {
  return {
    id: item.id,
    user_id: userId,
    context: item.context,
    category: item.category,
    ...(includeTypeColumn ? { type: item.type } : {}),
    amount: getStoredRecurringAmount(item.amount),
    currency: item.currency,
    summary: item.summary,
    remarks: includePlaceColumns ? item.remarks : encodeRecurringRemarks(item.remarks, item.venue, item.location),
    ...(includePlaceColumns ? { venue: item.venue.trim(), location: item.location.trim() } : {}),
  }
}

function buildRecurringUpdatePayload(
  item: RecurringItem,
  includeTypeColumn: boolean,
  includePlaceColumns: boolean,
) {
  return {
    summary: item.summary,
    category: item.category,
    ...(includeTypeColumn ? { type: item.type } : {}),
    amount: getStoredRecurringAmount(item.amount),
    currency: item.currency,
    remarks: includePlaceColumns ? item.remarks : encodeRecurringRemarks(item.remarks, item.venue, item.location),
    ...(includePlaceColumns ? { venue: item.venue.trim(), location: item.location.trim() } : {}),
  }
}

export function useRecurring() {
  const userId = useUserId()
  const [items, setItems] = useState<RecurringItem[]>([])
  const [loaded, setLoaded] = useState(false)

  const refreshItems = useCallback(async () => {
    if (!userId) {
      setItems([])
      setLoaded(true)
      return
    }

    const { data } = await supabase.from('recurring').select('*').eq('user_id', userId)
    setItems((data || []).map(r => ({
      id: r.id, type: normalizeRecurringType(r.type, r.id), context: r.context, category: r.category,
      amount: normalizeRecurringAmount(r.amount), currency: normalizeCurrencyCode(r.currency || 'USD'),
      summary: r.summary,
      ...(() => {
        const decoded = decodeRecurringRemarks(r.remarks || '')
        return {
          remarks: decoded.remarks,
          venue: typeof r.venue === 'string' ? r.venue : decoded.venue,
          location: typeof r.location === 'string' ? r.location : decoded.location,
        }
      })(),
    })))
    setLoaded(true)
  }, [userId])

  useEffect(() => {
    void refreshItems()
  }, [refreshItems])

  const addItem = useCallback(async (item: RecurringItem) => {
    if (!userId) return
    setItems(prev => [...prev, item])
    let includeTypeColumn = true
    let includePlaceColumns = true
    let { error } = await supabase.from('recurring').insert(buildRecurringInsertPayload(item, userId, includeTypeColumn, includePlaceColumns))
    for (let attempt = 0; attempt < 2 && error; attempt += 1) {
      const missingColumns = getMissingRecurringColumns(error)
      if (!missingColumns) break
      includeTypeColumn = includeTypeColumn && !missingColumns.has('type')
      includePlaceColumns = includePlaceColumns && !missingColumns.has('venue') && !missingColumns.has('location')
      const fallback = await supabase.from('recurring').insert(buildRecurringInsertPayload(item, userId, includeTypeColumn, includePlaceColumns))
      error = fallback.error
    }
    if (error) {
      setItems(prev => prev.filter(existing => existing.id !== item.id))
      throw error
    }
    await refreshItems()
  }, [refreshItems, userId])

  const updateItem = useCallback(async (updated: RecurringItem) => {
    if (!userId) return
    const previous = items.find(item => item.id === updated.id)
    setItems(prev => prev.map(i => i.id === updated.id ? updated : i))
    let includeTypeColumn = true
    let includePlaceColumns = true
    let { error } = await supabase.from('recurring')
      .update(buildRecurringUpdatePayload(updated, includeTypeColumn, includePlaceColumns))
      .eq('id', updated.id)
      .eq('user_id', userId)
    for (let attempt = 0; attempt < 2 && error; attempt += 1) {
      const missingColumns = getMissingRecurringColumns(error)
      if (!missingColumns) break
      includeTypeColumn = includeTypeColumn && !missingColumns.has('type')
      includePlaceColumns = includePlaceColumns && !missingColumns.has('venue') && !missingColumns.has('location')
      const fallback = await supabase.from('recurring')
        .update(buildRecurringUpdatePayload(updated, includeTypeColumn, includePlaceColumns))
        .eq('id', updated.id)
        .eq('user_id', userId)
      error = fallback.error
    }
    if (error) {
      if (previous) setItems(prev => prev.map(item => item.id === previous.id ? previous : item))
      throw error
    }
    await refreshItems()
  }, [items, refreshItems, userId])

  const renameCategory = useCallback(async (from: string, to: string, type?: EntryType, contextId?: string) => {
    if (!userId || !from.trim() || !to.trim()) return
    const source = from.trim()
    const target = to.trim()
    if (source === target) return
    const matches = items.filter(item => item.category === source && (!type || item.type === type) && (!contextId || item.context === contextId))
    if (matches.length === 0) return
    setItems(prev => prev.map(item => matches.some(match => match.id === item.id) ? { ...item, category: target } : item))
    await Promise.all(matches.map(item =>
      supabase.from('recurring')
        .update({ category: target })
        .eq('id', item.id)
        .eq('user_id', userId),
    ))
  }, [items, userId])

  const deleteItem = useCallback(async (id: string) => {
    if (!userId) return
    const previous = items
    setItems(prev => prev.filter(i => i.id !== id))
    const { error } = await supabase.from('recurring').delete().eq('id', id).eq('user_id', userId)
    if (error) {
      setItems(previous)
      throw error
    }
    await refreshItems()
  }, [items, refreshItems, userId])

  return { items, loaded, addItem, updateItem, renameCategory, deleteItem }
}
