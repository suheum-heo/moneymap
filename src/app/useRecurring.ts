'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from './lib/supabase'
import { EntryType, coerceAmount, normalizeCurrencyCode } from './types'
import { useUserId } from './UserContext'

export interface RecurringItem {
  id: string; type: EntryType; context: string; category: string
  amount: number | null; currency: string; summary: string; remarks: string
}

function normalizeRecurringType(value: unknown, id: unknown): EntryType {
  if (value === 'income') return 'income'
  if (typeof id === 'string' && /^(rec_)?income_/.test(id)) return 'income'
  return 'expense'
}

function isMissingRecurringTypeColumn(error: { code?: string; message?: string; details?: string } | null) {
  if (!error) return false
  const message = `${error.message || ''} ${error.details || ''}`.toLowerCase()
  return error.code === 'PGRST204'
    || message.includes("could not find the 'type' column")
    || message.includes('recurring.type')
}

function normalizeRecurringAmount(value: unknown): number | null {
  const amount = coerceAmount(value)
  return amount > 0 ? amount : null
}

function getStoredRecurringAmount(amount: number | null): number {
  return amount ?? 0
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
      summary: r.summary, remarks: r.remarks || '',
    })))
    setLoaded(true)
  }, [userId])

  useEffect(() => {
    void refreshItems()
  }, [refreshItems])

  const addItem = useCallback(async (item: RecurringItem) => {
    if (!userId) return
    setItems(prev => [...prev, item])
    let { error } = await supabase.from('recurring').insert({
      id: item.id, user_id: userId, context: item.context, category: item.category,
      type: item.type, amount: getStoredRecurringAmount(item.amount), currency: item.currency, summary: item.summary, remarks: item.remarks,
    })
    if (isMissingRecurringTypeColumn(error)) {
      const fallback = await supabase.from('recurring').insert({
        id: item.id, user_id: userId, context: item.context, category: item.category,
        amount: getStoredRecurringAmount(item.amount), currency: item.currency, summary: item.summary, remarks: item.remarks,
      })
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
    let { error } = await supabase.from('recurring').update({
      summary: updated.summary, category: updated.category,
      type: updated.type, amount: getStoredRecurringAmount(updated.amount), currency: updated.currency, remarks: updated.remarks,
    }).eq('id', updated.id).eq('user_id', userId)
    if (isMissingRecurringTypeColumn(error)) {
      const fallback = await supabase.from('recurring').update({
        summary: updated.summary, category: updated.category,
        amount: getStoredRecurringAmount(updated.amount), currency: updated.currency, remarks: updated.remarks,
      }).eq('id', updated.id).eq('user_id', userId)
      error = fallback.error
    }
    if (error) {
      if (previous) setItems(prev => prev.map(item => item.id === previous.id ? previous : item))
      throw error
    }
    await refreshItems()
  }, [items, refreshItems, userId])

  const renameCategory = useCallback(async (from: string, to: string, type?: EntryType) => {
    if (!userId || !from.trim() || !to.trim()) return
    const source = from.trim()
    const target = to.trim()
    if (source === target) return
    const matches = items.filter(item => item.category === source && (!type || item.type === type))
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
