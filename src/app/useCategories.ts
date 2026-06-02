'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from './lib/supabase'
import { getDefaultCategoryDefinitions, isOtherCategoryName } from './types'
import { useUserId } from './UserContext'

export interface Category {
  id: string
  name: string
  type: 'expense' | 'income'
}

export function useCategories({
  language,
  canSeedDefaults = true,
}: {
  language?: string
  canSeedDefaults?: boolean
} = {}) {
  const userId = useUserId()
  const [categories, setCategories] = useState<Category[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false

    if (!userId) {
      setCategories([])
      setLoaded(true)
      return () => {
        cancelled = true
      }
    }

    supabase.from('categories').select('*').eq('user_id', userId)
      .then(async ({ data }) => {
        if (cancelled) return

        if (data && data.length > 0) {
          setCategories(data.map(r => ({ id: r.id, name: r.name, type: r.type })))
          setLoaded(true)
          return
        }

        if (!canSeedDefaults) {
          setCategories([])
          setLoaded(true)
          return
        }

        const defaults: Category[] = getDefaultCategoryDefinitions(language)
        await Promise.all(
          defaults.map(category =>
            supabase.from('categories').upsert(
              { id: category.id, user_id: userId, name: category.name, type: category.type },
              { onConflict: 'id,user_id' },
            ),
          ),
        )

        if (cancelled) return
        setCategories(defaults)
        setLoaded(true)
      })

    return () => {
      cancelled = true
    }
  }, [canSeedDefaults, language, userId])

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
    const others = arr.filter(isOtherCategoryName)
    const rest = arr.filter(c => !isOtherCategoryName(c)).sort((a, b) => a.localeCompare(b, language))
    return [...rest, ...others]
  }
  const expenseCategories = sortWithOtherLast(categories.filter(c => c.type === 'expense').map(c => c.name))
  const incomeCategories = sortWithOtherLast(categories.filter(c => c.type === 'income').map(c => c.name))

  return { categories, expenseCategories, incomeCategories, addCategory, removeCategory, loaded }
}
