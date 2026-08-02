'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from './lib/supabase'
import { Context, Entry, getDefaultCategoryDefinitions, isOtherCategoryName } from './types'
import { RecurringItem } from './useRecurring'
import { useUserId } from './UserContext'

export interface Category {
  id: string
  name: string
  type: 'expense' | 'income'
  context?: string
}

const CONTEXT_CATEGORY_PREFIX = 'ctxcat__'

function encodeIdPart(value: string) {
  return encodeURIComponent(value)
}

function decodeIdPart(value: string) {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function getScopedCategoryId(contextId: string, id: string) {
  return `${CONTEXT_CATEGORY_PREFIX}${encodeIdPart(contextId)}__${id}`
}

function getCategoryContextFromId(id: string) {
  if (!id.startsWith(CONTEXT_CATEGORY_PREFIX)) return ''
  const rest = id.slice(CONTEXT_CATEGORY_PREFIX.length)
  const marker = rest.indexOf('__')
  if (marker === -1) return ''
  return decodeIdPart(rest.slice(0, marker))
}

function getCategoryContext(row: { id: string; context?: unknown }) {
  return typeof row.context === 'string' && row.context.trim()
    ? row.context.trim()
    : getCategoryContextFromId(row.id)
}

function normalizeCategoryKey(value: string, language?: string) {
  return value.trim().toLocaleLowerCase(language)
}

function categoryNameKey(category: Pick<Category, 'name' | 'type'>, language?: string) {
  return `${category.type}:${normalizeCategoryKey(category.name, language)}`
}

function isDefaultCategoryId(id: string, language?: string) {
  const defaultIds = new Set(getDefaultCategoryDefinitions(language).map(category => category.id))
  return defaultIds.has(id)
}

function isScopedCategory(category: Category) {
  return Boolean(category.context)
}

function getUsedContextsForCategory(
  category: Category,
  entries: Entry[],
  recurringItems: RecurringItem[],
  language?: string,
) {
  const contexts = new Set<string>()
  const categoryName = normalizeCategoryKey(category.name, language)

  entries.forEach(entry => {
    if (entry.type !== category.type) return
    if (normalizeCategoryKey(entry.category, language) === categoryName) contexts.add(entry.context)
  })

  recurringItems.forEach(item => {
    if (item.type !== category.type) return
    if (normalizeCategoryKey(item.category, language) === categoryName) contexts.add(item.context)
  })

  return contexts
}

function getCategoriesForContext(
  allCategories: Category[],
  contextId: string | undefined,
  language: string | undefined,
  entries: Entry[],
  recurringItems: RecurringItem[],
) {
  if (!contextId) return []

  const result = new Map<string, Category>()
  const remember = (category: Category) => {
    const key = categoryNameKey(category, language)
    if (!result.has(key)) result.set(key, category)
  }

  allCategories
    .filter(category => category.context === contextId)
    .forEach(remember)

  allCategories
    .filter(category => !isScopedCategory(category) && !isDefaultCategoryId(category.id, language))
    .forEach(category => {
      if (getUsedContextsForCategory(category, entries, recurringItems, language).has(contextId)) {
        remember(category)
      }
    })

  allCategories
    .filter(category => !isScopedCategory(category) && isDefaultCategoryId(category.id, language))
    .forEach(remember)

  return [...result.values()]
}

export function useCategories({
  language,
  canSeedDefaults = true,
  activeContextId,
  contexts = [],
  entries = [],
  recurringItems = [],
}: {
  language?: string
  canSeedDefaults?: boolean
  activeContextId?: string
  contexts?: Context[]
  entries?: Entry[]
  recurringItems?: RecurringItem[]
} = {}) {
  const userId = useUserId()
  const [allCategories, setAllCategories] = useState<Category[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false

    if (!userId) {
      setAllCategories([])
      setLoaded(true)
      return () => {
        cancelled = true
      }
    }

    supabase.from('categories').select('*').eq('user_id', userId)
      .then(async ({ data }) => {
        if (cancelled) return

        if (data && data.length > 0) {
          setAllCategories(data.map(r => ({
            id: r.id,
            name: r.name,
            type: r.type,
            context: getCategoryContext(r) || undefined,
          })))
          setLoaded(true)
          return
        }

        if (!canSeedDefaults) {
          setAllCategories([])
          setLoaded(true)
          return
        }

        const seedContextId = activeContextId || contexts[0]?.id || ''
        const defaults: Category[] = getDefaultCategoryDefinitions(language).map(category => ({
          ...category,
          id: seedContextId ? getScopedCategoryId(seedContextId, category.id) : category.id,
          context: seedContextId || undefined,
        }))
        await Promise.all(
          defaults.map(category =>
            supabase.from('categories').upsert(
              { id: category.id, user_id: userId, name: category.name, type: category.type },
              { onConflict: 'id,user_id' },
            ),
          ),
        )

        if (cancelled) return
        setAllCategories(defaults)
        setLoaded(true)
      })

    return () => {
      cancelled = true
    }
  }, [activeContextId, canSeedDefaults, contexts, language, userId])

  const ensureContextDefaults = useCallback(async (contextId: string) => {
    if (!userId || !contextId || !canSeedDefaults) return
    const defaults = getDefaultCategoryDefinitions(language)
    const visible = getCategoriesForContext(allCategories, contextId, language, entries, recurringItems)
    const visibleNames = new Set(visible.map(category => categoryNameKey(category, language)))
    const missing = defaults
      .filter(category => !visibleNames.has(categoryNameKey(category, language)))
      .map(category => ({
        ...category,
        id: getScopedCategoryId(contextId, category.id),
        context: contextId,
      }))

    if (missing.length === 0) return
    setAllCategories(prev => {
      const existingIds = new Set(prev.map(category => category.id))
      return [...prev, ...missing.filter(category => !existingIds.has(category.id))]
    })
    await Promise.all(
      missing.map(category =>
        supabase.from('categories').upsert(
          { id: category.id, user_id: userId, name: category.name, type: category.type },
          { onConflict: 'id,user_id' },
        ),
      ),
    )
  }, [allCategories, canSeedDefaults, entries, language, recurringItems, userId])

  useEffect(() => {
    if (!loaded || !activeContextId) return
    void ensureContextDefaults(activeContextId)
  }, [activeContextId, ensureContextDefaults, loaded])

  const claimUnusedLegacyCategories = useCallback(async (contextId: string) => {
    if (!userId || !contextId) return
    const existingNames = new Set(
      allCategories
        .filter(category => category.context === contextId)
        .map(category => categoryNameKey(category, language)),
    )
    const legacyCategories = allCategories
      .filter(category => !isScopedCategory(category) && !isDefaultCategoryId(category.id, language))
      .filter(category => getUsedContextsForCategory(category, entries, recurringItems, language).size === 0)
      .filter(category => !existingNames.has(categoryNameKey(category, language)))
      .map(category => ({
        ...category,
        id: getScopedCategoryId(contextId, `legacy_${category.id}`),
        context: contextId,
      }))

    if (legacyCategories.length === 0) return
    setAllCategories(prev => {
      const existingIds = new Set(prev.map(category => category.id))
      return [...prev, ...legacyCategories.filter(category => !existingIds.has(category.id))]
    })
    await Promise.all(
      legacyCategories.map(category =>
        supabase.from('categories').upsert(
          { id: category.id, user_id: userId, name: category.name, type: category.type },
          { onConflict: 'id,user_id' },
        ),
      ),
    )
  }, [allCategories, entries, language, recurringItems, userId])

  useEffect(() => {
    if (!loaded || !activeContextId) return
    void claimUnusedLegacyCategories(activeContextId)
  }, [activeContextId, claimUnusedLegacyCategories, loaded])

  const addCategory = useCallback(async (name: string, type: 'expense' | 'income') => {
    if (!userId || !activeContextId || !name.trim()) return
    const id = getScopedCategoryId(activeContextId, `${type === 'expense' ? 'exp' : 'inc'}_${Date.now()}`)
    const cat: Category = { id, name: name.trim(), type, context: activeContextId }
    setAllCategories(prev => [...prev, cat])
    await supabase.from('categories').insert({ id, user_id: userId, name: name.trim(), type })
  }, [activeContextId, userId])

  const updateCategory = useCallback(async (id: string, name: string) => {
    if (!userId || !name.trim()) return
    const trimmed = name.trim()
    setAllCategories(prev => prev.map(c => c.id === id ? { ...c, name: trimmed } : c))
    await supabase.from('categories').update({ name: trimmed }).eq('id', id).eq('user_id', userId)
  }, [userId])

  const removeCategory = useCallback(async (id: string) => {
    if (!userId) return
    setAllCategories(prev => prev.filter(c => c.id !== id))
    await supabase.from('categories').delete().eq('id', id).eq('user_id', userId)
  }, [userId])

  const importCategoriesFromContext = useCallback(async (sourceContextId: string, targetContextId: string) => {
    if (!userId || !sourceContextId || !targetContextId || sourceContextId === targetContextId) return
    const sourceCategories = getCategoriesForContext(allCategories, sourceContextId, language, entries, recurringItems)
    const targetCategories = getCategoriesForContext(allCategories, targetContextId, language, entries, recurringItems)
    const targetNames = new Set(targetCategories.map(category => categoryNameKey(category, language)))
    const now = Date.now()
    const imports = sourceCategories
      .filter(category => !targetNames.has(categoryNameKey(category, language)))
      .map((category, index) => ({
        id: getScopedCategoryId(targetContextId, `${category.type === 'expense' ? 'exp' : 'inc'}_import_${now}_${index}`),
        name: category.name,
        type: category.type,
        context: targetContextId,
      }))

    if (imports.length === 0) return
    setAllCategories(prev => [...prev, ...imports])
    await Promise.all(
      imports.map(category =>
        supabase.from('categories').insert({
          id: category.id,
          user_id: userId,
          name: category.name,
          type: category.type,
        }),
      ),
    )
  }, [allCategories, entries, language, recurringItems, userId])

  const sortWithOtherLast = (arr: string[]) => {
    const others = arr.filter(isOtherCategoryName)
    const rest = arr.filter(c => !isOtherCategoryName(c)).sort((a, b) => a.localeCompare(b, language))
    return [...rest, ...others]
  }
  const categories = getCategoriesForContext(allCategories, activeContextId, language, entries, recurringItems)
  const expenseCategories = sortWithOtherLast(categories.filter(c => c.type === 'expense').map(c => c.name))
  const incomeCategories = sortWithOtherLast(categories.filter(c => c.type === 'income').map(c => c.name))

  return {
    categories,
    allCategories,
    expenseCategories,
    incomeCategories,
    addCategory,
    updateCategory,
    removeCategory,
    importCategoriesFromContext,
    loaded,
  }
}
