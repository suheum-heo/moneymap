'use client'
import { useState, useEffect, useCallback } from 'react'

export interface RecurringItem {
  id: string
  context: string
  label: string
  category: string
  amount: number
  currency: string
  summary: string
  remarks: string
}

export function useRecurring() {
  const [items, setItems] = useState<RecurringItem[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    fetch('/api/recurring')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setItems(data)
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
  }, [])

  const addItem = useCallback(async (item: RecurringItem) => {
    setItems(prev => [...prev, item])
    try {
      await fetch('/api/recurring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
      })
    } catch {
      setItems(prev => prev.filter(i => i.id !== item.id))
    }
  }, [])

  const updateItem = useCallback(async (updated: RecurringItem) => {
    setItems(prev => prev.map(i => i.id === updated.id ? updated : i))
    try {
      await fetch(`/api/recurring/${updated.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      })
    } catch {
      fetch('/api/recurring').then(r => r.json()).then(data => setItems(data))
    }
  }, [])

  const deleteItem = useCallback(async (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id))
    try {
      await fetch(`/api/recurring/${id}`, { method: 'DELETE' })
    } catch {
      fetch('/api/recurring').then(r => r.json()).then(data => setItems(data))
    }
  }, [])

  return { items, loaded, addItem, updateItem, deleteItem }
}
