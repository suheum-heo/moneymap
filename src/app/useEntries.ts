'use client'
import { useState, useEffect, useCallback } from 'react'
import { Entry } from './types'

export function useEntries() {
  const [entries, setEntries] = useState<Entry[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    fetch('/api/entries')
      .then(r => r.json())
      .then(data => {
        setEntries(Array.isArray(data) ? data : [])
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
  }, [])

  const addEntry = useCallback(async (entry: Entry) => {
    // Optimistic update
    setEntries(prev => [...prev, entry])
    try {
      await fetch('/api/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
      })
    } catch {
      // Revert on failure
      setEntries(prev => prev.filter(e => e.id !== entry.id))
    }
  }, [])

  const deleteEntry = useCallback(async (id: string) => {
    // Optimistic update
    setEntries(prev => prev.filter(e => e.id !== id))
    try {
      await fetch(`/api/entries/${id}`, { method: 'DELETE' })
    } catch {
      // Refetch on failure
      fetch('/api/entries').then(r => r.json()).then(data => setEntries(data))
    }
  }, [])

  return { entries, loaded, addEntry, deleteEntry }
}
