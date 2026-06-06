'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from './lib/supabase'
import { Entry, coerceAmount, normalizeCurrencyCode } from './types'
import { useUserId } from './UserContext'

export function useEntries() {
  const userId = useUserId()
  const [entries, setEntries] = useState<Entry[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!userId) { setLoaded(true); return }
    supabase.from('entries').select('*').eq('user_id', userId).order('date')
      .then(({ data }) => {
        setEntries((data || []).map(r => ({
          id: r.id, type: r.type, date: r.date, summary: r.summary,
          time: typeof r.time === 'string' ? r.time : undefined,
          venue: r.venue || '', location: r.location || '', category: r.category,
          amount: coerceAmount(r.amount), remarks: r.remarks || '', currency: normalizeCurrencyCode(r.currency || 'USD'),
          context: r.context,
          createdAt: typeof r.created_at === 'string' ? r.created_at : undefined,
          homeAmount: r.home_amount == null ? undefined : coerceAmount(r.home_amount),
        })))
        setLoaded(true)
      })
  }, [userId])

  const addEntry = useCallback(async (entry: Entry) => {
    if (!userId) return
    const optimisticEntry = { ...entry, createdAt: entry.createdAt || new Date().toISOString() }
    setEntries(prev => [...prev, optimisticEntry])
    const { error } = await supabase.from('entries').insert({
      id: entry.id, user_id: userId, type: entry.type, date: entry.date,
      summary: entry.summary, venue: entry.venue, location: entry.location,
      category: entry.category, amount: entry.amount, remarks: entry.remarks,
      currency: entry.currency, context: entry.context,
      home_amount: entry.homeAmount ?? null,
    })
    if (error) setEntries(prev => prev.filter(e => e.id !== optimisticEntry.id))
  }, [userId])

  const updateEntry = useCallback(async (updated: Entry) => {
    if (!userId) return
    setEntries(prev => prev.map(e => e.id === updated.id ? { ...updated, createdAt: updated.createdAt || e.createdAt, time: updated.time || e.time } : e))
    await supabase.from('entries').update({
      type: updated.type, date: updated.date, summary: updated.summary,
      venue: updated.venue, location: updated.location, category: updated.category,
      amount: updated.amount, remarks: updated.remarks, currency: updated.currency,
      home_amount: updated.homeAmount ?? null,
    }).eq('id', updated.id).eq('user_id', userId)
  }, [userId])

  const renameCategory = useCallback(async (from: string, to: string, type: 'expense' | 'income') => {
    if (!userId || !from.trim() || !to.trim()) return
    const source = from.trim()
    const target = to.trim()
    if (source === target) return
    setEntries(prev => prev.map(e => e.type === type && e.category === source ? { ...e, category: target } : e))
    await supabase.from('entries')
      .update({ category: target })
      .eq('user_id', userId)
      .eq('type', type)
      .eq('category', source)
  }, [userId])

  const deleteEntry = useCallback(async (id: string) => {
    if (!userId) return
    setEntries(prev => prev.filter(e => e.id !== id))
    await supabase.from('entries').delete().eq('id', id).eq('user_id', userId)
  }, [userId])

  return { entries, loaded, addEntry, updateEntry, renameCategory, deleteEntry }
}
