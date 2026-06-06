'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from './lib/supabase'
import { coerceAmount } from './types'
import { useUserId } from './UserContext'

export interface Budget { context: string; category: string; amount: number }

export function useBudgets() {
  const userId = useUserId()
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!userId) { setLoaded(true); return }
    supabase.from('budgets').select('*').eq('user_id', userId)
      .then(({ data }) => {
        setBudgets((data || []).map(r => ({ context: r.context, category: r.category, amount: coerceAmount(r.amount) })))
        setLoaded(true)
      })
  }, [userId])

  const setBudget = useCallback(async (context: string, category: string, amount: number) => {
    if (!userId) return
    setBudgets(prev => {
      const next = prev.filter(b => !(b.context === context && b.category === category))
      if (amount > 0) next.push({ context, category, amount })
      return next
    })
    if (amount > 0) {
      await supabase.from('budgets').upsert({ user_id: userId, context, category, amount })
    } else {
      await supabase.from('budgets').delete().eq('user_id', userId).eq('context', context).eq('category', category)
    }
  }, [userId])

  const renameCategory = useCallback(async (from: string, to: string) => {
    if (!userId || !from.trim() || !to.trim()) return
    const source = from.trim()
    const target = to.trim()
    if (source === target) return
    setBudgets(prev => prev.map(budget => budget.category === source ? { ...budget, category: target } : budget))
    await supabase.from('budgets')
      .update({ category: target })
      .eq('user_id', userId)
      .eq('category', source)
  }, [userId])

  const getBudget = useCallback((context: string, category: string): number | null => {
    const b = budgets.find(b => b.context === context && b.category === category)
    return b ? b.amount : null
  }, [budgets])

  return { budgets, setBudget, renameCategory, getBudget, loaded }
}
