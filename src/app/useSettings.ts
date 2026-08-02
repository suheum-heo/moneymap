'use client'
import { useState, useEffect, useCallback } from 'react'
import { Context, normalizeCurrencyCode } from './types'
import { supabase } from './lib/supabase'
import { useUserId } from './UserContext'

export interface ExchangeRate { from: string; to: string; rate: number }

const FALLBACK_RATES: ExchangeRate[] = [
  { from: 'KRW', to: 'USD', rate: 0.00073 },
  { from: 'USD', to: 'KRW', rate: 1370 },
  { from: 'EUR', to: 'USD', rate: 1.08 },
  { from: 'EUR', to: 'KRW', rate: 1480 },
  { from: 'GBP', to: 'USD', rate: 1.27 },
  { from: 'GBP', to: 'KRW', rate: 1740 },
  { from: 'JPY', to: 'USD', rate: 0.0067 },
  { from: 'JPY', to: 'KRW', rate: 9.2 },
]

const CURRENCIES_TO_FETCH = ['USD', 'KRW', 'EUR', 'GBP', 'JPY', 'CNY', 'CAD', 'AUD', 'SGD', 'HKD', 'THB', 'VND', 'MXN', 'BRL', 'INR']
const CONTEXT_ORDER_KEY_PREFIX = 'gagyebu-context-order'

async function fetchLiveRates(): Promise<ExchangeRate[]> {
  try {
    const res = await fetch('/api/rates')
    if (!res.ok) throw new Error('Failed')
    const data = await res.json()
    const rates: ExchangeRate[] = []
    const usdRates: Record<string, number> = data.rates

    for (const [to, rate] of Object.entries(usdRates)) {
      rates.push({ from: 'USD', to, rate: rate as number })
      rates.push({ from: to, to: 'USD', rate: 1 / (rate as number) })
    }

    const currencies = Object.keys(usdRates)
    for (const from of currencies) {
      for (const to of currencies) {
        if (from === to) continue
        const fromUSD = 1 / (usdRates[from] as number)
        const toRate = usdRates[to] as number
        rates.push({ from, to, rate: fromUSD * toRate })
      }
    }

    return rates
  } catch {
    return []
  }
}

function getContextOrderKey(userId: string) {
  return `${CONTEXT_ORDER_KEY_PREFIX}:${userId}`
}

function readStoredContextOrder(userId: string): string[] {
  try {
    const raw = localStorage.getItem(getContextOrderKey(userId))
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : []
  } catch {
    return []
  }
}

function writeStoredContextOrder(userId: string, ids: string[]) {
  try {
    localStorage.setItem(getContextOrderKey(userId), JSON.stringify(ids))
  } catch {}
}

function orderContexts(contexts: Context[], storedOrder: string[] = []): Context[] {
  const storedRanks = new Map(storedOrder.map((id, index) => [id, index]))
  return contexts
    .map((context, index) => ({ context, index }))
    .sort((a, b) => {
      const aStored = storedRanks.get(a.context.id)
      const bStored = storedRanks.get(b.context.id)
      if (aStored != null && bStored != null && aStored !== bStored) return aStored - bStored
      if (aStored != null) return -1
      if (bStored != null) return 1

      const aSort = a.context.sortOrder
      const bSort = b.context.sortOrder
      if (aSort != null && bSort != null && aSort !== bSort) return aSort - bSort
      if (aSort != null) return -1
      if (bSort != null) return 1

      return a.index - b.index
    })
    .map(({ context }) => context)
}

function mergeOrderedContextIds(contexts: Context[], orderedIds: string[]) {
  const knownIds = new Set(contexts.map(context => context.id))
  const seen = new Set<string>()
  const nextIds = orderedIds.filter(id => {
    if (!knownIds.has(id) || seen.has(id)) return false
    seen.add(id)
    return true
  })

  contexts.forEach(context => {
    if (!seen.has(context.id)) nextIds.push(context.id)
  })

  return nextIds
}

function isMissingContextSortOrderColumn(error: { code?: string; message?: string; details?: string } | null) {
  if (!error) return false
  const message = `${error.message || ''} ${error.details || ''}`.toLowerCase()
  return message.includes('contexts.sort_order')
    || message.includes('column contexts.sort_order')
    || message.includes("'sort_order' column")
}

export function useSettings() {
  const userId = useUserId()
  const [contexts, setContexts] = useState<Context[]>([])
  const [activeContextId, setActiveContextId] = useState<string>('')
  const [rates, setRates] = useState<ExchangeRate[]>(FALLBACK_RATES)
  const [loaded, setLoaded] = useState(false)
  const [ratesUpdated, setRatesUpdated] = useState<Date | null>(null)

  useEffect(() => {
    if (!userId) { setLoaded(true); return }

    try {
      const a = localStorage.getItem('gagyebu-active-context')
      const r = localStorage.getItem('gagyebu-rates')
      const rts = localStorage.getItem('gagyebu-rates-timestamp')
      if (a) setActiveContextId(a)
      if (r) setRates(JSON.parse(r))
      if (rts) setRatesUpdated(new Date(rts))
    } catch {}

    supabase.from('contexts').select('*').eq('user_id', userId)
      .then(({ data }) => {
        if (data && data.length > 0) {
          const ctxs = orderContexts(data.map(r => ({
            id: r.id, name: r.name, currency: normalizeCurrencyCode(r.currency || 'USD'),
            homeCurrency: normalizeCurrencyCode(r.home_currency || r.currency || 'USD'), startDate: r.start_date,
            sortOrder: typeof r.sort_order === 'number' ? r.sort_order : undefined,
          })), readStoredContextOrder(userId))
          setContexts(ctxs)
          setActiveContextId(prev => prev || ctxs[0]?.id || '')
        }
        setLoaded(true)
      })

    const lastFetch = localStorage.getItem('gagyebu-rates-timestamp')
    const shouldFetch = !lastFetch || Date.now() - new Date(lastFetch).getTime() > 60 * 60 * 1000

    if (shouldFetch) {
      fetchLiveRates().then(liveRates => {
        if (liveRates.length > 0) {
          setRates(liveRates)
          const now = new Date()
          localStorage.setItem('gagyebu-rates', JSON.stringify(liveRates))
          localStorage.setItem('gagyebu-rates-timestamp', now.toISOString())
          setRatesUpdated(now)
        }
      })
    }
  }, [userId])

  const addContext = useCallback(async (ctx: Context) => {
    if (!userId) return
    let sortOrder = 0
    setContexts(prev => {
      sortOrder = prev.length
      const next = [...prev, { ...ctx, sortOrder }]
      if (prev.length === 0) {
        setActiveContextId(ctx.id)
        localStorage.setItem('gagyebu-active-context', ctx.id)
      }
      writeStoredContextOrder(userId, next.map(context => context.id))
      return next
    })
    const payload = {
      id: ctx.id, user_id: userId, name: ctx.name, currency: ctx.currency,
      home_currency: ctx.homeCurrency, start_date: ctx.startDate,
      sort_order: sortOrder,
    }
    const { error } = await supabase.from('contexts').insert(payload)
    if (isMissingContextSortOrderColumn(error)) {
      await supabase.from('contexts').insert({
        id: ctx.id, user_id: userId, name: ctx.name, currency: ctx.currency,
        home_currency: ctx.homeCurrency, start_date: ctx.startDate,
      })
    }
  }, [userId])

  const removeContext = useCallback(async (id: string) => {
    if (!userId) return
    setContexts(prev => {
      const next = prev.filter(c => c.id !== id)
      writeStoredContextOrder(userId, next.map(context => context.id))
      return next
    })
    await supabase.from('contexts').delete().eq('id', id).eq('user_id', userId)
  }, [userId])

  const renameContext = useCallback(async (id: string, name: string) => {
    if (!userId) return
    setContexts(prev => prev.map(c => c.id === id ? { ...c, name: name.trim() } : c))
    await supabase.from('contexts').update({ name: name.trim() }).eq('id', id).eq('user_id', userId)
  }, [userId])

  const updateContext = useCallback(async (ctx: Context) => {
    if (!userId) return
    setContexts(prev => prev.map(c => c.id === ctx.id ? ctx : c))
    await supabase.from('contexts').update({
      name: ctx.name, currency: ctx.currency,
      home_currency: ctx.homeCurrency, start_date: ctx.startDate,
    }).eq('id', ctx.id).eq('user_id', userId)
  }, [userId])

  const reorderContexts = useCallback(async (orderedIds: string[]) => {
    if (!userId) return
    const nextIds = mergeOrderedContextIds(contexts, orderedIds)
    if (nextIds.length === 0) return

    setContexts(prev => {
      const byId = new Map(prev.map(context => [context.id, context]))
      const next: Context[] = []
      mergeOrderedContextIds(prev, nextIds).forEach(id => {
        const context = byId.get(id)
        if (context) next.push({ ...context, sortOrder: next.length })
      })
      return next
    })

    writeStoredContextOrder(userId, nextIds)

    const first = await supabase.from('contexts')
      .update({ sort_order: 0 })
      .eq('id', nextIds[0])
      .eq('user_id', userId)
    if (isMissingContextSortOrderColumn(first.error)) return
    await Promise.all(nextIds.slice(1).map((id, index) =>
      supabase.from('contexts')
        .update({ sort_order: index + 1 })
        .eq('id', id)
        .eq('user_id', userId),
    ))
  }, [contexts, userId])

  const switchContext = useCallback((id: string) => {
    setActiveContextId(id)
    localStorage.setItem('gagyebu-active-context', id)
  }, [])

  const updateRate = useCallback((from: string, to: string, rate: number) => {
    setRates(prev => {
      const next = [...prev.filter(r => !(r.from === from && r.to === to)), { from, to, rate }]
      localStorage.setItem('gagyebu-rates', JSON.stringify(next))
      return next
    })
  }, [])

  const convert = useCallback((amount: number, from: string, to: string): number => {
    if (from === to) return amount
    const direct = rates.find(r => r.from === from && r.to === to)
    if (direct) return amount * direct.rate
    const inverse = rates.find(r => r.from === to && r.to === from)
    if (inverse) return amount / inverse.rate
    const toUSD = rates.find(r => r.from === from && r.to === 'USD')
    const fromUSD = rates.find(r => r.from === 'USD' && r.to === to)
    if (toUSD && fromUSD) return amount * toUSD.rate * fromUSD.rate
    return amount
  }, [rates])

  const activeContext = contexts.find(c => c.id === activeContextId) || contexts[0]

  return { contexts, addContext, removeContext, renameContext, updateContext, reorderContexts, activeContext, activeContextId, switchContext, rates, updateRate, convert, loaded, ratesUpdated }
}
