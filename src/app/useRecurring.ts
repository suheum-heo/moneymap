'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from './lib/supabase'
import { coerceAmount, normalizeCurrencyCode } from './types'
import { useUserId } from './UserContext'

export interface RecurringItem {
  id: string; context: string; category: string
  amount: number; currency: string; summary: string; remarks: string
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
      id: r.id, context: r.context, category: r.category,
      amount: coerceAmount(r.amount), currency: normalizeCurrencyCode(r.currency || 'USD'),
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
    const { error } = await supabase.from('recurring').insert({
      id: item.id, user_id: userId, context: item.context, category: item.category,
      amount: item.amount, currency: item.currency, summary: item.summary, remarks: item.remarks,
    })
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
    const { error } = await supabase.from('recurring').update({
      summary: updated.summary, category: updated.category,
      amount: updated.amount, currency: updated.currency, remarks: updated.remarks,
    }).eq('id', updated.id).eq('user_id', userId)
    if (error) {
      if (previous) setItems(prev => prev.map(item => item.id === previous.id ? previous : item))
      throw error
    }
    await refreshItems()
  }, [items, refreshItems, userId])

  const renameCategory = useCallback(async (from: string, to: string) => {
    if (!userId || !from.trim() || !to.trim()) return
    const source = from.trim()
    const target = to.trim()
    if (source === target) return
    setItems(prev => prev.map(item => item.category === source ? { ...item, category: target } : item))
    await supabase.from('recurring')
      .update({ category: target })
      .eq('user_id', userId)
      .eq('category', source)
  }, [userId])

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
