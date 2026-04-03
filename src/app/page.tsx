'use client'
import { useState, useMemo } from 'react'
import { useEntries } from './useEntries'
import Overview from './components/Overview'
import Entries from './components/Entries'
import AddEntry from './components/AddEntry'

const MONTHS = [
  { value: '2026-02', label: 'Feb 2026' },
  { value: '2026-03', label: 'Mar 2026' },
  { value: '2026-04', label: 'Apr 2026' },
  { value: '2026-05', label: 'May 2026' },
  { value: '2026-06', label: 'Jun 2026' },
  { value: '2026-07', label: 'Jul 2026' },
  { value: '2026-08', label: 'Aug 2026' },
]

type Tab = 'overview' | 'entries' | 'add'

export default function Home() {
  const { entries, loaded, addEntry, deleteEntry } = useEntries()
  const [tab, setTab] = useState<Tab>('overview')
  const [month, setMonth] = useState('2026-02')

  const monthLabel = useMemo(() =>
    MONTHS.find(m => m.value === month)?.label || month, [month])

  if (!loaded) return (
    <div className="flex items-center justify-center min-h-screen text-zinc-400 text-sm">Loading…</div>
  )

  return (
    <div className="max-w-md mx-auto min-h-dvh flex flex-col bg-white dark:bg-zinc-900">
      {/* Header */}
      <div className="px-4 pt-14 pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">가계부</h1>
          <p className="text-sm text-zinc-400">{monthLabel}</p>
        </div>
        <select
          value={month}
          onChange={e => setMonth(e.target.value)}
          className="text-sm px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200"
        >
          {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-100 dark:border-zinc-800 px-4 mb-4">
        {([
          { id: 'overview', label: 'Overview' },
          { id: 'entries', label: 'Entries' },
          { id: 'add', label: '+ Add' },
        ] as { id: Tab; label: string }[]).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`mr-4 pb-2 text-sm border-b-2 transition-colors ${tab === t.id
              ? 'border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100 font-medium'
              : 'border-transparent text-zinc-400'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {tab === 'overview' && <Overview entries={entries} month={month} />}
        {tab === 'entries' && <Entries entries={entries} month={month} onDelete={deleteEntry} />}
        {tab === 'add' && <AddEntry onAdd={addEntry} onDone={() => setTab('entries')} />}
      </div>
    </div>
  )
}
