'use client'
import { useState, useEffect, useCallback } from 'react'
import { Context } from './types'

export interface ExchangeRate {
  from: string
  to: string
  rate: number
}

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
  const [contexts, setContexts] = useState<Context[]>([])
  const [activeContextId, setActiveContextId] = useState<string>('madison')
  const [rates, setRates] = useState<ExchangeRate[]>(DEFAULT_RATES)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    // Load contexts from Google Sheets
    fetch('/api/contexts')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) setContexts(data)
      })
      .catch(() => {})

    // Load active context and rates from localStorage only
    try {
      const a = localStorage.getItem('gagyebu-active-context')
      const r = localStorage.getItem('gagyebu-rates')
      if (a) setActiveContextId(a)
      if (r) setRates(JSON.parse(r))
    } catch {}

    setLoaded(true)
  }, [])

  const addContext = useCallback(async (ctx: Context) => {
    setContexts(prev => [...prev, ctx])
    try {
      await fetch('/api/contexts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ctx),
      })
    } catch {
      setContexts(prev => prev.filter(c => c.id !== ctx.id))
    }
  }, [])

  const removeContext = useCallback(async (id: string) => {
    setContexts(prev => prev.filter(c => c.id !== id))
    if (activeContextId === id) {
      const remaining = contexts.filter(c => c.id !== id)
      if (remaining.length > 0) {
        setActiveContextId(remaining[0].id)
        localStorage.setItem('gagyebu-active-context', remaining[0].id)
      }
    }
    try {
      await fetch(`/api/contexts/${id}`, { method: 'DELETE' })
    } catch {
      fetch('/api/contexts').then(r => r.json()).then(data => setContexts(data))
    }
  }, [contexts, activeContextId])

  const renameContext = useCallback(async (id: string, name: string) => {
    const updated = contexts.map(c => c.id === id ? { ...c, name: name.trim() } : c)
    setContexts(updated)
    const ctx = updated.find(c => c.id === id)
    if (!ctx) return
    try {
      await fetch(`/api/contexts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ctx),
      })
    } catch {
      fetch('/api/contexts').then(r => r.json()).then(data => setContexts(data))
    }
  }, [contexts])

  const switchContext = useCallback((id: string) => {
    setActiveContextId(id)
    localStorage.setItem('gagyebu-active-context', id)
  }, [])

  const saveRates = useCallback((next: ExchangeRate[]) => {
    setRates(next)
    localStorage.setItem('gagyebu-rates', JSON.stringify(next))
  }, [])

  const updateRate = useCallback((from: string, to: string, rate: number) => {
    const next = rates.filter(r => !(r.from === from && r.to === to))
    saveRates([...next, { from, to, rate }])
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

  return {
    contexts, addContext, removeContext, renameContext,
    activeContext, activeContextId, switchContext,
    rates, updateRate,
    convert,
    loaded,
  }
}
