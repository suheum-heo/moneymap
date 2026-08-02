'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from './lib/supabase'
import { Entry, coerceAmount, normalizeCurrencyCode } from './types'
import { useUserId } from './UserContext'

const PAYMENT_META_PREFIX = '[[moneymap:entry-payment-method:'
const PAYMENT_META_SUFFIX = ']]'
const PAYMENT_META_PATTERN = /\n?\[\[moneymap:entry-payment-method:([\s\S]*?)\]\]\s*$/

function decodeEntryPayment(rawRemarks: string, rawPaymentMethod: unknown) {
  const remarks = rawRemarks || ''
  const match = remarks.match(PAYMENT_META_PATTERN)
  let cleanRemarks = remarks
  let encodedPaymentMethod = ''

  if (match?.[1] && match.index != null) {
    cleanRemarks = remarks.slice(0, match.index).trimEnd()
    try {
      const parsed = JSON.parse(match[1]) as { paymentMethod?: unknown }
      encodedPaymentMethod = typeof parsed.paymentMethod === 'string' ? parsed.paymentMethod : ''
    } catch {
      encodedPaymentMethod = ''
    }
  }

  return {
    remarks: cleanRemarks,
    paymentMethod: typeof rawPaymentMethod === 'string' ? rawPaymentMethod : encodedPaymentMethod,
  }
}

function encodeEntryRemarks(remarks: string, paymentMethod: string) {
  const decoded = decodeEntryPayment(remarks, '')
  const cleanRemarks = decoded.remarks.trim()
  const cleanPaymentMethod = paymentMethod.trim()
  if (!cleanPaymentMethod) return cleanRemarks
  const metadata = JSON.stringify({ paymentMethod: cleanPaymentMethod })
  return `${cleanRemarks}${cleanRemarks ? '\n' : ''}${PAYMENT_META_PREFIX}${metadata}${PAYMENT_META_SUFFIX}`
}

function isMissingEntryPaymentMethodColumn(error: { code?: string; message?: string; details?: string } | null) {
  if (!error) return false
  const message = `${error.message || ''} ${error.details || ''}`.toLowerCase()
  return message.includes('entries.payment_method')
    || message.includes('column entries.payment_method')
    || message.includes("'payment_method' column")
}

function buildEntryInsertPayload(entry: Entry, userId: string, includePaymentMethodColumn: boolean) {
  return {
    id: entry.id, user_id: userId, type: entry.type, date: entry.date,
    summary: entry.summary, venue: entry.venue, location: entry.location,
    category: entry.category, amount: entry.amount,
    remarks: includePaymentMethodColumn ? entry.remarks : encodeEntryRemarks(entry.remarks, entry.paymentMethod || ''),
    ...(includePaymentMethodColumn ? { payment_method: (entry.paymentMethod || '').trim() } : {}),
    currency: entry.currency, context: entry.context,
    home_amount: entry.homeAmount ?? null,
  }
}

function buildEntryUpdatePayload(updated: Entry, includePaymentMethodColumn: boolean) {
  return {
    type: updated.type, date: updated.date, summary: updated.summary,
    venue: updated.venue, location: updated.location, category: updated.category,
    amount: updated.amount,
    remarks: includePaymentMethodColumn ? updated.remarks : encodeEntryRemarks(updated.remarks, updated.paymentMethod || ''),
    ...(includePaymentMethodColumn ? { payment_method: (updated.paymentMethod || '').trim() } : {}),
    currency: updated.currency,
    home_amount: updated.homeAmount ?? null,
  }
}

export function useEntries() {
  const userId = useUserId()
  const [entries, setEntries] = useState<Entry[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!userId) { setLoaded(true); return }
    supabase.from('entries').select('*').eq('user_id', userId).order('date')
      .then(({ data }) => {
        setEntries((data || []).map(r => ({
          ...(() => {
            const decoded = decodeEntryPayment(r.remarks || '', r.payment_method)
            return {
              id: r.id, type: r.type, date: r.date, summary: r.summary,
              time: typeof r.time === 'string' ? r.time : undefined,
              venue: r.venue || '', location: r.location || '', category: r.category,
              amount: coerceAmount(r.amount), remarks: decoded.remarks,
              paymentMethod: decoded.paymentMethod,
              currency: normalizeCurrencyCode(r.currency || 'USD'),
              context: r.context,
              createdAt: typeof r.created_at === 'string' ? r.created_at : undefined,
              homeAmount: r.home_amount == null ? undefined : coerceAmount(r.home_amount),
            }
          })()
        })))
        setLoaded(true)
      })
  }, [userId])

  const addEntry = useCallback(async (entry: Entry) => {
    if (!userId) return
    const optimisticEntry = { ...entry, createdAt: entry.createdAt || new Date().toISOString() }
    setEntries(prev => [...prev, optimisticEntry])
    let includePaymentMethodColumn = true
    let { error } = await supabase.from('entries').insert(buildEntryInsertPayload(entry, userId, includePaymentMethodColumn))
    if (isMissingEntryPaymentMethodColumn(error)) {
      includePaymentMethodColumn = false
      const fallback = await supabase.from('entries').insert(buildEntryInsertPayload(entry, userId, includePaymentMethodColumn))
      error = fallback.error
    }
    if (error) setEntries(prev => prev.filter(e => e.id !== optimisticEntry.id))
  }, [userId])

  const updateEntry = useCallback(async (updated: Entry) => {
    if (!userId) return
    setEntries(prev => prev.map(e => e.id === updated.id ? { ...updated, createdAt: updated.createdAt || e.createdAt, time: updated.time || e.time } : e))
    let includePaymentMethodColumn = true
    let { error } = await supabase.from('entries')
      .update(buildEntryUpdatePayload(updated, includePaymentMethodColumn))
      .eq('id', updated.id)
      .eq('user_id', userId)
    if (isMissingEntryPaymentMethodColumn(error)) {
      includePaymentMethodColumn = false
      await supabase.from('entries')
        .update(buildEntryUpdatePayload(updated, includePaymentMethodColumn))
        .eq('id', updated.id)
        .eq('user_id', userId)
    }
  }, [userId])

  const renameCategory = useCallback(async (from: string, to: string, type: 'expense' | 'income', contextId?: string) => {
    if (!userId || !from.trim() || !to.trim()) return
    const source = from.trim()
    const target = to.trim()
    if (source === target) return
    setEntries(prev => prev.map(e =>
      e.type === type && e.category === source && (!contextId || e.context === contextId)
        ? { ...e, category: target }
        : e,
    ))
    let query = supabase.from('entries')
      .update({ category: target })
      .eq('user_id', userId)
      .eq('type', type)
      .eq('category', source)
    if (contextId) query = query.eq('context', contextId)
    await query
  }, [userId])

  const deleteEntry = useCallback(async (id: string) => {
    if (!userId) return
    setEntries(prev => prev.filter(e => e.id !== id))
    await supabase.from('entries').delete().eq('id', id).eq('user_id', userId)
  }, [userId])

  return { entries, loaded, addEntry, updateEntry, renameCategory, deleteEntry }
}
