'use client'
import { useState, useEffect, useCallback } from 'react'

export interface ExchangeRate {
  from: string
  to: string
  rate: number
}

const DEFAULT_CONTEXTS = ['Madison']
const DEFAULT_RATES: ExchangeRate[] = [
  { from: 'KRW', to: 'USD', rate: 0.00073 },
  { from: 'EUR', to: 'USD', rate: 1.08 },
  { from: 'GBP', to: 'USD', rate: 1.27 },
  { from: 'JPY', to: 'USD', rate: 0.0067 },
]

export function useSettings() {
  const [contexts, setContexts] = useState<string[]>(DEFAULT_CONTEXTS)
  const [rates, setRates] = useState<ExchangeRate[]>(DEFAULT_RATES)
  const [baseCurrency, setBaseCurrency] = useState<string>('USD')

  useEffect(() => {
    try {
      const c = localStorage.getItem('gagyebu-contexts')
      const r = localStorage.getItem('gagyebu-rates')
      const b = localStorage.getItem('gagyebu-base')
      if (c) setContexts(JSON.parse(c))
      if (r) setRates(JSON.parse(r))
      if (b) setBaseCurrency(b)
    } catch {}
  }, [])

  const saveContexts = useCallback((next: string[]) => {
    setContexts(next)
    localStorage.setItem('gagyebu-contexts', JSON.stringify(next))
  }, [])

  const addContext = useCallback((name: string) => {
    const trimmed = name.trim()
    if (!trimmed) return
    saveContexts([...contexts, trimmed])
  }, [contexts, saveContexts])

  const removeContext = useCallback((name: string) => {
    saveContexts(contexts.filter(c => c !== name))
  }, [contexts, saveContexts])

  const saveRates = useCallback((next: ExchangeRate[]) => {
    setRates(next)
    localStorage.setItem('gagyebu-rates', JSON.stringify(next))
  }, [])

  const updateRate = useCallback((from: string, to: string, rate: number) => {
    const next = rates.filter(r => !(r.from === from && r.to === to))
    saveRates([...next, { from, to, rate }])
  }, [rates, saveRates])

  const saveBase = useCallback((b: string) => {
    setBaseCurrency(b)
    localStorage.setItem('gagyebu-base', b)
  }, [])

  // Convert any amount to base currency
  const convert = useCallback((amount: number, from: string): number => {
    if (from === baseCurrency) return amount
    // Try direct rate
    const direct = rates.find(r => r.from === from && r.to === baseCurrency)
    if (direct) return amount * direct.rate
    // Try via USD
    const toUSD = rates.find(r => r.from === from && r.to === 'USD')
    const fromUSD = rates.find(r => r.from === 'USD' && r.to === baseCurrency)
    if (toUSD && fromUSD) return amount * toUSD.rate * fromUSD.rate
    // Try inverse
    const inverse = rates.find(r => r.from === baseCurrency && r.to === from)
    if (inverse) return amount / inverse.rate
    return amount
  }, [rates, baseCurrency])

  return {
    contexts, addContext, removeContext,
    rates, updateRate,
    baseCurrency, setBaseCurrency: saveBase,
    convert,
  }
}
