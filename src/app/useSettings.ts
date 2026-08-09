'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { Context, normalizeCurrencyCode } from './types'
import { supabase } from './lib/supabase'
import { useUserId } from './UserContext'

export interface ExchangeRate { from: string; to: string; rate: number }
export type RateSource = 'market' | 'visa' | 'mastercard'

interface LiveRatesResult {
  rates: ExchangeRate[]
  source: RateSource
  fallback: boolean
}

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
const RATE_SOURCE_KEY = 'gagyebu-rate-source'
const CARD_FEE_KEY = 'gagyebu-card-fee-pct'
const RATES_KEY_PREFIX = 'gagyebu-rates'
const RATES_TIMESTAMP_KEY_PREFIX = 'gagyebu-rates-timestamp'

function normalizeRateSource(value: unknown): RateSource {
  if (value === 'visa' || value === 'mastercard') return value
  return 'market'
}

function normalizeCardFeePct(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(parsed)) return 0
  return Math.min(Math.max(parsed, 0), 20)
}

function getRatesKey(source: RateSource, fee: number) {
  return `${RATES_KEY_PREFIX}:${source}:${fee.toFixed(4)}`
}

function getRatesTimestampKey(source: RateSource, fee: number) {
  return `${RATES_TIMESTAMP_KEY_PREFIX}:${source}:${fee.toFixed(4)}`
}

function buildRatesFromUsdBase(usdRates: Record<string, number>): ExchangeRate[] {
  const rates: ExchangeRate[] = []

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
}

async function fetchLiveRates(source: RateSource, cardFeePct: number): Promise<LiveRatesResult> {
  try {
    const params = new URLSearchParams({ source, fee: cardFeePct.toString() })
    const res = await fetch(`/api/rates?${params.toString()}`)
    if (!res.ok) throw new Error('Failed')
    const data = await res.json()
    const effectiveSource = normalizeRateSource(data.source)
    const fallback = Boolean(data.fallback)
    if (Array.isArray(data.pairs)) {
      const rates = data.pairs
        .filter((rate: ExchangeRate) =>
          typeof rate?.from === 'string' &&
          typeof rate?.to === 'string' &&
          Number.isFinite(Number(rate.rate)) &&
          Number(rate.rate) > 0,
        )
        .map((rate: ExchangeRate) => ({
          from: normalizeCurrencyCode(rate.from),
          to: normalizeCurrencyCode(rate.to),
          rate: Number(rate.rate),
        }))
      return { rates, source: effectiveSource, fallback }
    }
    const usdRates: Record<string, number> = data.rates
    return { rates: buildRatesFromUsdBase(usdRates), source: effectiveSource, fallback }
  } catch {
    return { rates: [], source: 'market', fallback: source !== 'market' }
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
  const hasServerOrder = contexts.some(context => context.sortOrder != null)
  return contexts
    .map((context, index) => ({ context, index }))
    .sort((a, b) => {
      const aSort = a.context.sortOrder
      const bSort = b.context.sortOrder
      if (hasServerOrder) {
        if (aSort != null && bSort != null && aSort !== bSort) return aSort - bSort
        if (aSort != null) return -1
        if (bSort != null) return 1
      }

      const aStored = storedRanks.get(a.context.id)
      const bStored = storedRanks.get(b.context.id)
      if (aStored != null && bStored != null && aStored !== bStored) return aStored - bStored
      if (aStored != null) return -1
      if (bStored != null) return 1

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
  const contextsRef = useRef<Context[]>([])
  const [activeContextId, setActiveContextId] = useState<string>('')
  const [rates, setRates] = useState<ExchangeRate[]>(FALLBACK_RATES)
  const [loaded, setLoaded] = useState(false)
  const [ratesUpdated, setRatesUpdated] = useState<Date | null>(null)
  const [rateSource, setRateSourceState] = useState<RateSource>('market')
  const [effectiveRateSource, setEffectiveRateSource] = useState<RateSource>('market')
  const [rateFallback, setRateFallback] = useState(false)
  const [cardFeePct, setCardFeePctState] = useState(0)

  useEffect(() => {
    contextsRef.current = contexts
  }, [contexts])

  useEffect(() => {
    if (!userId) { setLoaded(true); return }

    try {
      const a = localStorage.getItem('gagyebu-active-context')
      const storedRateSource = normalizeRateSource(localStorage.getItem(RATE_SOURCE_KEY))
      const storedCardFeePct = normalizeCardFeePct(localStorage.getItem(CARD_FEE_KEY))
      if (a) setActiveContextId(a)
      setRateSourceState(storedRateSource)
      setCardFeePctState(storedCardFeePct)
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
          contextsRef.current = ctxs
          writeStoredContextOrder(userId, ctxs.map(context => context.id))
          setActiveContextId(prev => prev || ctxs[0]?.id || '')
        }
        setLoaded(true)
      })

  }, [userId])

  useEffect(() => {
    if (!userId) return
    const normalizedFee = normalizeCardFeePct(cardFeePct)
    const ratesKey = getRatesKey(rateSource, normalizedFee)
    const timestampKey = getRatesTimestampKey(rateSource, normalizedFee)

    try {
      const legacyRates = rateSource === 'market' ? localStorage.getItem(RATES_KEY_PREFIX) : null
      const legacyTimestamp = rateSource === 'market' ? localStorage.getItem(RATES_TIMESTAMP_KEY_PREFIX) : null
      const storedRates = localStorage.getItem(ratesKey) || legacyRates
      const storedTimestamp = localStorage.getItem(timestampKey) || legacyTimestamp
      if (storedRates) setRates(JSON.parse(storedRates))
      else setRates(FALLBACK_RATES)
      if (storedTimestamp) setRatesUpdated(new Date(storedTimestamp))
      else setRatesUpdated(null)
      setEffectiveRateSource(rateSource)
      setRateFallback(false)
    } catch {
      setRates(FALLBACK_RATES)
      setRatesUpdated(null)
      setEffectiveRateSource('market')
      setRateFallback(rateSource !== 'market')
    }

    const lastFetch = localStorage.getItem(timestampKey)
      || (rateSource === 'market' ? localStorage.getItem(RATES_TIMESTAMP_KEY_PREFIX) : null)
    const shouldFetch = !lastFetch || Date.now() - new Date(lastFetch).getTime() > 60 * 60 * 1000

    if (shouldFetch) {
      fetchLiveRates(rateSource, normalizedFee).then(result => {
        if (result.rates.length > 0) {
          setRates(result.rates)
          setEffectiveRateSource(result.source)
          setRateFallback(result.fallback)
          const now = new Date()
          if (!result.fallback) {
            localStorage.setItem(ratesKey, JSON.stringify(result.rates))
            localStorage.setItem(timestampKey, now.toISOString())
          }
          if (result.source === 'market') {
            localStorage.setItem(RATES_KEY_PREFIX, JSON.stringify(result.rates))
            localStorage.setItem(RATES_TIMESTAMP_KEY_PREFIX, now.toISOString())
          }
          setRatesUpdated(now)
        }
      })
    }
  }, [cardFeePct, rateSource, userId])

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
      contextsRef.current = next
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
      contextsRef.current = next
      writeStoredContextOrder(userId, next.map(context => context.id))
      return next
    })
    await supabase.from('contexts').delete().eq('id', id).eq('user_id', userId)
  }, [userId])

  const renameContext = useCallback(async (id: string, name: string) => {
    if (!userId) return
    setContexts(prev => {
      const next = prev.map(c => c.id === id ? { ...c, name: name.trim() } : c)
      contextsRef.current = next
      return next
    })
    await supabase.from('contexts').update({ name: name.trim() }).eq('id', id).eq('user_id', userId)
  }, [userId])

  const updateContext = useCallback(async (ctx: Context) => {
    if (!userId) return
    setContexts(prev => {
      const next = prev.map(c => c.id === ctx.id ? ctx : c)
      contextsRef.current = next
      return next
    })
    await supabase.from('contexts').update({
      name: ctx.name, currency: ctx.currency,
      home_currency: ctx.homeCurrency, start_date: ctx.startDate,
    }).eq('id', ctx.id).eq('user_id', userId)
  }, [userId])

  const reorderContexts = useCallback(async (orderedIds: string[]) => {
    if (!userId) return
    const nextIds = mergeOrderedContextIds(contextsRef.current, orderedIds)
    if (nextIds.length === 0) return

    setContexts(prev => {
      const byId = new Map(prev.map(context => [context.id, context]))
      const next: Context[] = []
      mergeOrderedContextIds(prev, nextIds).forEach(id => {
        const context = byId.get(id)
        if (context) next.push({ ...context, sortOrder: next.length })
      })
      contextsRef.current = next
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
  }, [userId])

  const switchContext = useCallback((id: string) => {
    setActiveContextId(id)
    localStorage.setItem('gagyebu-active-context', id)
  }, [])

  const updateRate = useCallback((from: string, to: string, rate: number) => {
    setRates(prev => {
      const next = [...prev.filter(r => !(r.from === from && r.to === to)), { from, to, rate }]
      localStorage.setItem(getRatesKey(rateSource, cardFeePct), JSON.stringify(next))
      return next
    })
  }, [cardFeePct, rateSource])

  const setRateSource = useCallback((source: RateSource) => {
    const next = normalizeRateSource(source)
    setRateSourceState(next)
    localStorage.setItem(RATE_SOURCE_KEY, next)
  }, [])

  const setCardFeePct = useCallback((fee: number) => {
    const next = normalizeCardFeePct(fee)
    setCardFeePctState(next)
    localStorage.setItem(CARD_FEE_KEY, String(next))
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

  return {
    contexts, addContext, removeContext, renameContext, updateContext, reorderContexts,
    activeContext, activeContextId, switchContext,
    rates, updateRate, convert, loaded, ratesUpdated,
    rateSource, effectiveRateSource, rateFallback, setRateSource, cardFeePct, setCardFeePct,
  }
}
