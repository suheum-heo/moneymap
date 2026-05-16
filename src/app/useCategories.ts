'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from './lib/supabase'
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from './types'
import { useUserId } from './UserContext'

export interface Category {
  id: string
  name: string
  type: 'expense' | 'income'
}

export function useCategories() {
  const userId = useUserId()
  const [categories, setCategories] = useState<Category[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!userId) { setLoaded(true); return }

    supabase.from('categories').select('*').eq('user_id', userId)
      .then(async ({ data }) => {
        if (data && data.length > 0) {
          setCategories(data.map(r => ({ id: r.id, name: r.name, type: r.type })))
        } else {
          const defaults: Category[] = [
            ...EXPENSE_CATEGORIES.map(name => ({ id: `exp_${name.toLowerCase().replace(/[\s\/]+/g, '_')}`, name, type: 'expense' as const })),
            ...INCOME_CATEGORIES.map(name => ({ id: `inc_${name.toLowerCase().replace(/[\s\/]+/g, '_')}`, name, type: 'income' as const })),
          ]
          for (const c of defaults) {
            await supabase.from('categories').upsert({ id: c.id, user_id: userId, name: c.name, type: c.type }, { onConflict: 'id,user_id' })
          }
          setCategories(defaults)
        }
        setLoaded(true)
      })
  }, [userId])

  const addCategory = useCallback(async (name: string, type: 'expense' | 'income') => {
    if (!userId || !name.trim()) return
    const id = `${type === 'expense' ? 'exp' : 'inc'}_${Date.now()}`
    const cat: Category = { id, name: name.trim(), type }
    setCategories(prev => [...prev, cat])
    await supabase.from('categories').insert({ id, user_id: userId, name: name.trim(), type })
  }, [userId])

  const removeCategory = useCallback(async (id: string) => {
    if (!userId) return
    setCategories(prev => prev.filter(c => c.id !== id))
    await supabase.from('categories').delete().eq('id', id).eq('user_id', userId)
  }, [userId])

  const sortWithOtherLast = (arr: string[]) => {
    const others = arr.filter(c => c.toLowerCase() === 'other')
    const rest = arr.filter(c => c.toLowerCase() !== 'other').sort()
    return [...rest, ...others]
  }
  const expenseCategories = sortWithOtherLast(categories.filter(c => c.type === 'expense').map(c => c.name))
  const incomeCategories = sortWithOtherLast(categories.filter(c => c.type === 'income').map(c => c.name))

  return { categories, expenseCategories, incomeCategories, addCategory, removeCategory, loaded }
}
