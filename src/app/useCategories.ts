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
  hidden?: boolean
}

const CONTEXT_CATEGORY_PREFIX = 'ctxcat__'
const HIDDEN_CATEGORY_PREFIX = 'ctxcat_hidden__'

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

function getScopedCategoryBaseId(id: string) {
  if (!id.startsWith(CONTEXT_CATEGORY_PREFIX)) return id
  const rest = id.slice(CONTEXT_CATEGORY_PREFIX.length)
  const marker = rest.indexOf('__')
  if (marker === -1) return id
  return rest.slice(marker + 2)
}

function getHiddenCategoryId(contextId: string, category: Pick<Category, 'name' | 'type'>) {
  return `${HIDDEN_CATEGORY_PREFIX}${encodeIdPart(contextId)}__${category.type}__${encodeIdPart(category.name.trim())}`
}

function getHiddenCategoryContextFromId(id: string) {
  if (!id.startsWith(HIDDEN_CATEGORY_PREFIX)) return ''
  const rest = id.slice(HIDDEN_CATEGORY_PREFIX.length)
  const marker = rest.indexOf('__')
  if (marker === -1) return ''
  return decodeIdPart(rest.slice(0, marker))
}

function getCategoryContext(row: { id: string; context?: unknown }) {
  return typeof row.context === 'string' && row.context.trim()
    ? row.context.trim()
    : getCategoryContextFromId(row.id) || getHiddenCategoryContextFromId(row.id)
}

function normalizeCategoryKey(value: string, language?: string) {
  return value.trim().toLocaleLowerCase(language)
}

function categoryNameKey(category: Pick<Category, 'name' | 'type'>, language?: string) {
  return `${category.type}:${normalizeCategoryKey(category.name, language)}`
}

function isDefaultCategoryId(id: string, language?: string) {
  const defaultIds = new Set(getDefaultCategoryDefinitions(language).map(category => category.id))
  return defaultIds.has(getScopedCategoryBaseId(id))
}

function isScopedCategory(category: Category) {
  return Boolean(category.context)
}

function isHiddenCategory(category: Category) {
  return Boolean(category.hidden) || category.id.startsWith(HIDDEN_CATEGORY_PREFIX)
}

function getHiddenCategoryKeys(
  allCategories: Category[],
  contextId: string,
  language?: string,
) {
  return new Set(
    allCategories
      .filter(category => isHiddenCategory(category) && category.context === contextId)
      .map(category => categoryNameKey(category, language)),
  )
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
  const hiddenKeys = getHiddenCategoryKeys(allCategories, contextId, language)
  const remember = (category: Category) => {
    if (isHiddenCategory(category)) return
    const key = categoryNameKey(category, language)
    if (hiddenKeys.has(key)) return
    if (!result.has(key)) result.set(key, category)
  }

  allCategories
    .filter(category => !isHiddenCategory(category))
    .filter(category => category.context === contextId)
    .filter(category => {
      if (!isDefaultCategoryId(category.id, language)) return true
      return getUsedContextsForCategory(category, entries, recurringItems, language).has(contextId)
    })
    .forEach(remember)

  allCategories
    .filter(category => !isHiddenCategory(category))
    .filter(category => !isScopedCategory(category) && !isDefaultCategoryId(category.id, language))
    .forEach(category => {
      if (getUsedContextsForCategory(category, entries, recurringItems, language).has(contextId)) {
        remember(category)
      }
    })

  allCategories
    .filter(category => !isHiddenCategory(category))
    .filter(category => !isScopedCategory(category) && isDefaultCategoryId(category.id, language))
    .forEach(remember)

  return [...result.values()]
}

export function useCategories({
  language,
  canSeedDefaults = true,
  activeContextId,
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
          const loadedCategories = data.map(r => ({
            id: r.id,
            name: r.name,
            type: r.type,
            context: getCategoryContext(r) || undefined,
            hidden: typeof r.id === 'string' && r.id.startsWith(HIDDEN_CATEGORY_PREFIX),
          }))

          const hasScopedDefaults = loadedCategories.some(category =>
            !isHiddenCategory(category) && isScopedCategory(category) && isDefaultCategoryId(category.id)
          )
          const hasGlobalDefaults = loadedCategories.some(category =>
            !isHiddenCategory(category) && !isScopedCategory(category) && isDefaultCategoryId(category.id)
          )
          if (canSeedDefaults && hasScopedDefaults && !hasGlobalDefaults) {
            const defaults: Category[] = getDefaultCategoryDefinitions()
            await Promise.all(
              defaults.map(category =>
                supabase.from('categories').upsert(
                  { id: category.id, user_id: userId, name: category.name, type: category.type },
                  { onConflict: 'id,user_id' },
                ),
              ),
            )

            if (cancelled) return
            setAllCategories([...loadedCategories, ...defaults])
            setLoaded(true)
            return
          }

          setAllCategories(loadedCategories)
          setLoaded(true)
          return
        }

        if (!canSeedDefaults) {
          setAllCategories([])
          setLoaded(true)
          return
        }

        const defaults: Category[] = getDefaultCategoryDefinitions()
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
  }, [canSeedDefaults, userId])

  const claimUnusedLegacyCategories = useCallback(async (contextId: string) => {
    if (!userId || !contextId) return
    const hiddenKeys = getHiddenCategoryKeys(allCategories, contextId, language)
    const existingNames = new Set(
      allCategories
        .filter(category => !isHiddenCategory(category))
        .filter(category => category.context === contextId)
        .map(category => categoryNameKey(category, language)),
    )
    const legacyCategories = allCategories
      .filter(category => !isHiddenCategory(category))
      .filter(category => !isScopedCategory(category) && !isDefaultCategoryId(category.id, language))
      .filter(category => getUsedContextsForCategory(category, entries, recurringItems, language).size === 0)
      .filter(category => !existingNames.has(categoryNameKey(category, language)))
      .filter(category => !hiddenKeys.has(categoryNameKey(category, language)))
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
    const trimmed = name.trim()
    const targetKey = categoryNameKey({ name: trimmed, type }, language)
    const hiddenMatches = allCategories.filter(category =>
      isHiddenCategory(category) &&
      category.context === activeContextId &&
      categoryNameKey(category, language) === targetKey
    )
    const hiddenIds = hiddenMatches.map(category => category.id)
    const categoriesAfterUnhide = hiddenIds.length > 0
      ? allCategories.filter(category => !hiddenIds.includes(category.id))
      : allCategories

    if (hiddenIds.length > 0) {
      setAllCategories(prev => prev.filter(category => !hiddenIds.includes(category.id)))
      await Promise.all(
        hiddenIds.map(id => supabase.from('categories').delete().eq('id', id).eq('user_id', userId)),
      )
    }

    const alreadyVisible = getCategoriesForContext(
      categoriesAfterUnhide,
      activeContextId,
      language,
      entries,
      recurringItems,
    ).some(category => categoryNameKey(category, language) === targetKey)
    if (alreadyVisible) return

    const id = getScopedCategoryId(activeContextId, `${type === 'expense' ? 'exp' : 'inc'}_${Date.now()}`)
    const cat: Category = { id, name: trimmed, type, context: activeContextId }
    setAllCategories(prev => [...prev, cat])
    await supabase.from('categories').insert({ id, user_id: userId, name: trimmed, type })
  }, [activeContextId, allCategories, entries, language, recurringItems, userId])

  const updateCategory = useCallback(async (id: string, name: string) => {
    if (!userId || !name.trim()) return
    const trimmed = name.trim()
    setAllCategories(prev => prev.map(c => c.id === id ? { ...c, name: trimmed } : c))
    await supabase.from('categories').update({ name: trimmed }).eq('id', id).eq('user_id', userId)
  }, [userId])

  const removeCategory = useCallback(async (id: string) => {
    if (!userId) return
    const category = allCategories.find(item => item.id === id)
    if (!category || isHiddenCategory(category)) {
      setAllCategories(prev => prev.filter(c => c.id !== id))
      await supabase.from('categories').delete().eq('id', id).eq('user_id', userId)
      return
    }

    if (!activeContextId) {
      setAllCategories(prev => prev.filter(c => c.id !== id))
      await supabase.from('categories').delete().eq('id', id).eq('user_id', userId)
      return
    }

    const hiddenCategory: Category = {
      id: getHiddenCategoryId(activeContextId, category),
      name: category.name,
      type: category.type,
      context: activeContextId,
      hidden: true,
    }

    setAllCategories(prev => {
      const withoutOldScopedRow = category.context === activeContextId
        ? prev.filter(c => c.id !== id)
        : prev
      if (withoutOldScopedRow.some(c => c.id === hiddenCategory.id)) return withoutOldScopedRow
      return [...withoutOldScopedRow, hiddenCategory]
    })

    await Promise.all([
      ...(category.context === activeContextId
        ? [supabase.from('categories').delete().eq('id', id).eq('user_id', userId)]
        : []),
      supabase.from('categories').upsert(
        { id: hiddenCategory.id, user_id: userId, name: hiddenCategory.name, type: hiddenCategory.type },
        { onConflict: 'id,user_id' },
      ),
    ])
  }, [activeContextId, allCategories, userId])

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
