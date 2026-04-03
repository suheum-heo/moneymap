'use client'
import { useState, useEffect, useCallback } from 'react'
import { Entry, SEED } from './types'

const KEY = 'gaegyebu-entries'

export function useEntries() {
  const [entries, setEntries] = useState<Entry[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY)
      setEntries(raw ? JSON.parse(raw) : [])
    } catch {
      setEntries(SEED)
    }
    setLoaded(true)
  }, [])

  const save = useCallback((next: Entry[]) => {
    setEntries(next)
    try { localStorage.setItem(KEY, JSON.stringify(next)) } catch {}
  }, [])

  const addEntry = useCallback((e: Entry) => {
    save([...entries, e])
  }, [entries, save])

  const deleteEntry = useCallback((id: string) => {
    save(entries.filter(e => e.id !== id))
  }, [entries, save])

  return { entries, loaded, addEntry, deleteEntry }
}
