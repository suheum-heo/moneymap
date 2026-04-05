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
    setEntries(prev => [...prev, entry])
    try {
      await fetch('/api/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
      })
    } catch {
      setEntries(prev => prev.filter(e => e.id !== entry.id))
    }
  }, [])

  const updateEntry = useCallback(async (updated: Entry) => {
    setEntries(prev => prev.map(e => e.id === updated.id ? updated : e))
    try {
      await fetch(`/api/entries/${updated.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      })
    } catch {
      // Refetch on failure
      fetch('/api/entries').then(r => r.json()).then(data => setEntries(data))
    }
  }, [])

  const deleteEntry = useCallback(async (id: string) => {
    setEntries(prev => prev.filter(e => e.id !== id))
    try {
      await fetch(`/api/entries/${id}`, { method: 'DELETE' })
    } catch {
      fetch('/api/entries').then(r => r.json()).then(data => setEntries(data))
    }
  }, [])

  return { entries, loaded, addEntry, updateEntry, deleteEntry }
}
