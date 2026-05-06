'use client'
import { useState, useEffect, useCallback } from 'react'
import { Context } from './types'
import { supabase } from './lib/supabase'
import { useUserId } from './UserContext'

export interface ExchangeRate { from: string; to: string; rate: number }

const DEFAULT_RATES: ExchangeRate[] = [
  { from: 'KRW', to: 'USD', rate: 0.00073 },
  { from: 'USD', to: 'KRW', rate: 1370 },
  { from: 'EUR', to: 'USD', rate: 1.08 },
  { from: 'EUR', to: 'KRW', rate: 1480 },
  { from: 'GBP', to: 'USD', rate: 1.27 },
  { from: 'GBP', to: 'KRW', rate: 1740 },
  { from: 'JPY', to: 'USD', rate: 0.0067 },
  { from: 'JPY', to: 'KRW', rate: 9.2 },
]

export function useSettings() {
  const userId = useUserId()
  const [contexts, setContexts] = useState<Context[]>([])
  const [activeContextId, setActiveContextId] = useState<string>('')
  const [rates, setRates] = useState<ExchangeRate[]>(DEFAULT_RATES)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!userId) { setLoaded(true); return }

    try {
      const a = localStorage.getItem('gagyebu-active-context')
      const r = localStorage.getItem('gagyebu-rates')
      if (a) setActiveContextId(a)
      if (r) setRates(JSON.parse(r))
    } catch {}

    supabase.from('contexts').select('*').eq('user_id', userId)
      .then(({ data }) => {
        if (data && data.length > 0) {
          const ctxs = data.map(r => ({
            id: r.id, name: r.name, currency: r.currency,
            homeCurrency: r.home_currency, startDate: r.start_date,
          }))
          setContexts(ctxs)
          setActiveContextId(prev => prev || ctxs[0]?.id || '')
        }
        setLoaded(true)
      })
  }, [userId])

  const addContext = useCallback(async (ctx: Context) => {
    if (!userId) return
    setContexts(prev => {
      if (prev.length === 0) {
        setActiveContextId(ctx.id)
        localStorage.setItem('gagyebu-active-context', ctx.id)
      }
      return [...prev, ctx]
    })
    await supabase.from('contexts').insert({
      id: ctx.id, user_id: userId, name: ctx.name, currency: ctx.currency,
      home_currency: ctx.homeCurrency, start_date: ctx.startDate,
    })
  }, [userId])

  const removeContext = useCallback(async (id: string) => {
    if (!userId) return
    setContexts(prev => prev.filter(c => c.id !== id))
    await supabase.from('contexts').delete().eq('id', id).eq('user_id', userId)
  }, [userId])

  const renameContext = useCallback(async (id: string, name: string) => {
    if (!userId) return
    setContexts(prev => prev.map(c => c.id === id ? { ...c, name: name.trim() } : c))
    await supabase.from('contexts').update({ name: name.trim() }).eq('id', id).eq('user_id', userId)
  }, [userId])

  const switchContext = useCallback((id: string) => {
    setActiveContextId(id)
    localStorage.setItem('gagyebu-active-context', id)
  }, [])

  const saveRates = useCallback((next: ExchangeRate[]) => {
    setRates(next)
    localStorage.setItem('gagyebu-rates', JSON.stringify(next))
  }, [])

  const updateRate = useCallback((from: string, to: string, rate: number) => {
    saveRates([...rates.filter(r => !(r.from === from && r.to === to)), { from, to, rate }])
  }, [rates, saveRates])

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

  return { contexts, addContext, removeContext, renameContext, activeContext, activeContextId, switchContext, rates, updateRate, convert, loaded }
}
