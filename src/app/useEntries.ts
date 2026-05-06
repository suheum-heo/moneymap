'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from './lib/supabase'
import { Entry } from './types'

export function useEntries(userId?: string) {
  const [entries, setEntries] = useState<Entry[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!userId) { setLoaded(true); return }
    supabase.from('entries').select('*').eq('user_id', userId).order('date')
      .then(({ data }) => {
        setEntries((data || []).map(r => ({
          id: r.id, type: r.type, date: r.date, summary: r.summary,
          venue: r.venue || '', location: r.location || '', category: r.category,
          amount: r.amount, remarks: r.remarks || '', currency: r.currency || 'USD', context: r.context,
        })))
        setLoaded(true)
      })
  }, [userId])

  const addEntry = useCallback(async (entry: Entry) => {
    if (!userId) return
    setEntries(prev => [...prev, entry])
    const { error } = await supabase.from('entries').insert({
      id: entry.id, user_id: userId, type: entry.type, date: entry.date,
      summary: entry.summary, venue: entry.venue, location: entry.location,
      category: entry.category, amount: entry.amount, remarks: entry.remarks,
      currency: entry.currency, context: entry.context,
    })
    if (error) setEntries(prev => prev.filter(e => e.id !== entry.id))
  }, [userId])

  const updateEntry = useCallback(async (updated: Entry) => {
    if (!userId) return
    setEntries(prev => prev.map(e => e.id === updated.id ? updated : e))
    await supabase.from('entries').update({
      type: updated.type, date: updated.date, summary: updated.summary,
      venue: updated.venue, location: updated.location, category: updated.category,
      amount: updated.amount, remarks: updated.remarks, currency: updated.currency,
    }).eq('id', updated.id).eq('user_id', userId)
  }, [userId])

  const deleteEntry = useCallback(async (id: string) => {
    if (!userId) return
    setEntries(prev => prev.filter(e => e.id !== id))
    await supabase.from('entries').delete().eq('id', id).eq('user_id', userId)
  }, [userId])

  return { entries, loaded, addEntry, updateEntry, deleteEntry }
}
