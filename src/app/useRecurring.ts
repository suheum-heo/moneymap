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

  useEffect(() => {
    if (!userId) { setLoaded(true); return }
    supabase.from('recurring').select('*').eq('user_id', userId)
      .then(({ data }) => {
        setItems((data || []).map(r => ({
          id: r.id, context: r.context, category: r.category,
          amount: coerceAmount(r.amount), currency: normalizeCurrencyCode(r.currency || 'USD'),
          summary: r.summary, remarks: r.remarks || '',
        })))
        setLoaded(true)
      })
  }, [userId])

  const addItem = useCallback(async (item: RecurringItem) => {
    if (!userId) return
    setItems(prev => [...prev, item])
    await supabase.from('recurring').insert({
      id: item.id, user_id: userId, context: item.context, category: item.category,
      amount: item.amount, currency: item.currency, summary: item.summary, remarks: item.remarks,
    })
  }, [userId])

  const updateItem = useCallback(async (updated: RecurringItem) => {
    if (!userId) return
    setItems(prev => prev.map(i => i.id === updated.id ? updated : i))
    await supabase.from('recurring').update({
      summary: updated.summary, category: updated.category,
      amount: updated.amount, currency: updated.currency, remarks: updated.remarks,
    }).eq('id', updated.id).eq('user_id', userId)
  }, [userId])

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
    setItems(prev => prev.filter(i => i.id !== id))
    await supabase.from('recurring').delete().eq('id', id).eq('user_id', userId)
  }, [userId])

  return { items, loaded, addItem, updateItem, renameCategory, deleteItem }
}
