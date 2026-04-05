'use client'
import { useState, useEffect, useCallback } from 'react'

export interface Budget {
  context: string
  category: string
  amount: number
}

export function useBudgets() {
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    fetch('/api/budgets')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setBudgets(data)
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
  }, [])

  const setBudget = useCallback(async (context: string, category: string, amount: number) => {
    // Optimistic update
    setBudgets(prev => {
      const next = prev.filter(b => !(b.context === context && b.category === category))
      if (amount > 0) next.push({ context, category, amount })
      return next
    })
    if (amount > 0) {
      await fetch('/api/budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context, category, amount }),
      })
    }
  }, [])

  const getBudget = useCallback((context: string, category: string): number | null => {
    const b = budgets.find(b => b.context === context && b.category === category)
    return b ? b.amount : null
  }, [budgets])

  return { budgets, setBudget, getBudget, loaded }
}
