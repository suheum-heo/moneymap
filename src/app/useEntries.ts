'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from './lib/supabase'
import { Entry, coerceAmount, normalizeCurrencyCode } from './types'
import { useUserId } from './UserContext'

const PAYMENT_META_PREFIX = '[[moneymap:entry-payment-method:'
const PAYMENT_META_SUFFIX = ']]'
const PAYMENT_META_PATTERN = /\n?\[\[moneymap:entry-payment-method:([\s\S]*?)\]\]\s*$/

function decodeEntryPayment(rawRemarks: string, rawPaymentMethod: unknown, rawTime?: unknown) {
  const remarks = rawRemarks || ''
  const match = remarks.match(PAYMENT_META_PATTERN)
  let cleanRemarks = remarks
  let encodedPaymentMethod = ''
  let encodedTime = ''

  if (match?.[1] && match.index != null) {
    cleanRemarks = remarks.slice(0, match.index).trimEnd()
    try {
      const parsed = JSON.parse(match[1]) as { paymentMethod?: unknown; time?: unknown }
      encodedPaymentMethod = typeof parsed.paymentMethod === 'string' ? parsed.paymentMethod : ''
      encodedTime = typeof parsed.time === 'string' ? parsed.time : ''
    } catch {
      encodedPaymentMethod = ''
      encodedTime = ''
    }
  }

  return {
    remarks: cleanRemarks,
    paymentMethod: typeof rawPaymentMethod === 'string' ? rawPaymentMethod : encodedPaymentMethod,
    time: typeof rawTime === 'string' && rawTime.trim() ? rawTime : encodedTime,
  }
}

function encodeEntryRemarks(remarks: string, paymentMethod: string, time = '') {
  const decoded = decodeEntryPayment(remarks, '')
  const cleanRemarks = decoded.remarks.trim()
  const cleanPaymentMethod = paymentMethod.trim()
  const cleanTime = time.trim()
  if (!cleanPaymentMethod && !cleanTime) return cleanRemarks
  const metadata = JSON.stringify({
    ...(cleanPaymentMethod ? { paymentMethod: cleanPaymentMethod } : {}),
    ...(cleanTime ? { time: cleanTime } : {}),
  })
  return `${cleanRemarks}${cleanRemarks ? '\n' : ''}${PAYMENT_META_PREFIX}${metadata}${PAYMENT_META_SUFFIX}`
}

function isMissingEntryPaymentMethodColumn(error: { code?: string; message?: string; details?: string } | null) {
  if (!error) return false
  const message = `${error.message || ''} ${error.details || ''}`.toLowerCase()
  return message.includes('entries.payment_method')
    || message.includes('column entries.payment_method')
    || message.includes("'payment_method' column")
}

function isMissingEntryTimeColumn(error: { code?: string; message?: string; details?: string } | null) {
  if (!error) return false
  const message = `${error.message || ''} ${error.details || ''}`.toLowerCase()
  return message.includes('entries.time')
    || message.includes('column entries.time')
    || message.includes("'time' column")
}

function normalizeSavedValue(value: string) {
  return value.normalize('NFKC').trim().toLocaleLowerCase()
}

function buildEntryRemarksPayload(entry: Entry, includePaymentMethodColumn: boolean, includeTimeColumn: boolean) {
  if (includePaymentMethodColumn && includeTimeColumn) return entry.remarks
  return encodeEntryRemarks(
    entry.remarks,
    includePaymentMethodColumn ? '' : entry.paymentMethod || '',
    includeTimeColumn ? '' : entry.time || '',
  )
}

function buildEntryInsertPayload(entry: Entry, userId: string, includePaymentMethodColumn: boolean, includeTimeColumn: boolean) {
  return {
    id: entry.id, user_id: userId, type: entry.type, date: entry.date,
    ...(includeTimeColumn ? { time: entry.time || null } : {}),
    summary: entry.summary, venue: entry.venue, location: entry.location,
    category: entry.category, amount: entry.amount,
    remarks: buildEntryRemarksPayload(entry, includePaymentMethodColumn, includeTimeColumn),
    ...(includePaymentMethodColumn ? { payment_method: (entry.paymentMethod || '').trim() } : {}),
    currency: entry.currency, context: entry.context,
    home_amount: entry.homeAmount ?? null,
  }
}

function buildEntryUpdatePayload(updated: Entry, includePaymentMethodColumn: boolean, includeTimeColumn: boolean) {
  return {
    type: updated.type, date: updated.date, summary: updated.summary,
    ...(includeTimeColumn ? { time: updated.time || null } : {}),
    venue: updated.venue, location: updated.location, category: updated.category,
    amount: updated.amount,
    remarks: buildEntryRemarksPayload(updated, includePaymentMethodColumn, includeTimeColumn),
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
            const decoded = decodeEntryPayment(r.remarks || '', r.payment_method, r.time)
            return {
              id: r.id, type: r.type, date: r.date, summary: r.summary,
              time: decoded.time || undefined,
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
    let includeTimeColumn = true
    let { error } = await supabase.from('entries').insert(buildEntryInsertPayload(entry, userId, includePaymentMethodColumn, includeTimeColumn))
    if (isMissingEntryPaymentMethodColumn(error) || isMissingEntryTimeColumn(error)) {
      includePaymentMethodColumn = includePaymentMethodColumn && !isMissingEntryPaymentMethodColumn(error)
      includeTimeColumn = includeTimeColumn && !isMissingEntryTimeColumn(error)
      const fallback = await supabase.from('entries').insert(buildEntryInsertPayload(entry, userId, includePaymentMethodColumn, includeTimeColumn))
      error = fallback.error
    }
    if (error) setEntries(prev => prev.filter(e => e.id !== optimisticEntry.id))
  }, [userId])

  const updateEntry = useCallback(async (updated: Entry) => {
    if (!userId) return
    setEntries(prev => prev.map(e => e.id === updated.id ? { ...updated, createdAt: updated.createdAt || e.createdAt } : e))
    let includePaymentMethodColumn = true
    let includeTimeColumn = true
    let { error } = await supabase.from('entries')
      .update(buildEntryUpdatePayload(updated, includePaymentMethodColumn, includeTimeColumn))
      .eq('id', updated.id)
      .eq('user_id', userId)
    if (isMissingEntryPaymentMethodColumn(error) || isMissingEntryTimeColumn(error)) {
      includePaymentMethodColumn = includePaymentMethodColumn && !isMissingEntryPaymentMethodColumn(error)
      includeTimeColumn = includeTimeColumn && !isMissingEntryTimeColumn(error)
      await supabase.from('entries')
        .update(buildEntryUpdatePayload(updated, includePaymentMethodColumn, includeTimeColumn))
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

  const renamePaymentMethod = useCallback(async (from: string, to: string, contextId?: string) => {
    if (!userId || !from.trim() || !to.trim()) return
    const sourceKey = normalizeSavedValue(from)
    const target = to.trim()
    if (!sourceKey || sourceKey === normalizeSavedValue(target)) return
    const matches = entries.filter(entry =>
      normalizeSavedValue(entry.paymentMethod || '') === sourceKey && (!contextId || entry.context === contextId),
    )
    if (matches.length === 0) return
    await Promise.all(matches.map(entry => updateEntry({ ...entry, paymentMethod: target })))
  }, [entries, updateEntry, userId])

  const renameVenue = useCallback(async (from: string, to: string, contextId?: string) => {
    if (!userId || !from.trim() || !to.trim()) return
    const sourceKey = normalizeSavedValue(from)
    const target = to.trim()
    if (!sourceKey || sourceKey === normalizeSavedValue(target)) return
    const matches = entries.filter(entry =>
      normalizeSavedValue(entry.venue || '') === sourceKey && (!contextId || entry.context === contextId),
    )
    if (matches.length === 0) return
    await Promise.all(matches.map(entry => updateEntry({ ...entry, venue: target })))
  }, [entries, updateEntry, userId])

  const renameLocation = useCallback(async (from: string, to: string, contextId?: string) => {
    if (!userId || !from.trim() || !to.trim()) return
    const sourceKey = normalizeSavedValue(from)
    const target = to.trim()
    if (!sourceKey || sourceKey === normalizeSavedValue(target)) return
    const matches = entries.filter(entry =>
      normalizeSavedValue(entry.location || '') === sourceKey && (!contextId || entry.context === contextId),
    )
    if (matches.length === 0) return
    await Promise.all(matches.map(entry => updateEntry({ ...entry, location: target })))
  }, [entries, updateEntry, userId])

  const deleteEntry = useCallback(async (id: string) => {
    if (!userId) return
    setEntries(prev => prev.filter(e => e.id !== id))
    await supabase.from('entries').delete().eq('id', id).eq('user_id', userId)
  }, [userId])

  return { entries, loaded, addEntry, updateEntry, renameCategory, renamePaymentMethod, renameVenue, renameLocation, deleteEntry }
}
