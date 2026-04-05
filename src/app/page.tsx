'use client'
import { useState, useMemo, useEffect } from 'react'
import { useEntries } from './useEntries'
import Overview from './components/Overview'
import Entries from './components/Entries'
import AddEntry from './components/AddEntry'

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function generateMonths() {
  const months = []
  const now = new Date()
  const start = new Date(now.getFullYear() - 1, now.getMonth(), 1)
  for (let i = 0; i < 24; i++) {
    const d = new Date(start.getFullYear(), start.getMonth() + i, 1)
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`
    months.push({ value, label })
  }
  return months
}

const MONTHS = generateMonths()

type Tab = 'overview' | 'entries' | 'add'

export default function Home() {
  const { entries, loaded, addEntry, deleteEntry } = useEntries()
  const [tab, setTab] = useState<Tab>('overview')
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7))
  const [dark, setDark] = useState<boolean | null>(null)

  useEffect(() => {
    const saved = localStorage.getItem('theme')
    if (saved) {
      setDark(saved === 'dark')
    } else {
      setDark(window.matchMedia('(prefers-color-scheme: dark)').matches)
    }
  }, [])

  useEffect(() => {
    if (dark === null) return
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('theme', dark ? 'dark' : 'light')
  }, [dark])

  const monthLabel = useMemo(() =>
    MONTHS.find(m => m.value === month)?.label || month, [month])

  if (!loaded || dark === null) return (
    <div className="flex items-center justify-center min-h-screen text-zinc-400 text-sm">Loading…</div>
  )

  const tabs = [
    { id: 'overview' as Tab, label: 'Overview' },
    { id: 'entries' as Tab, label: 'Entries' },
    { id: 'add' as Tab, label: '+ Add' },
  ]

  return (
    <div className="min-h-screen bg-[#fafaf8] dark:bg-[#0f0f0d]">
      {/* Desktop layout */}
      <div className="hidden md:flex h-screen">
        {/* Sidebar */}
        <div className="w-56 flex-shrink-0 border-r border-zinc-200 dark:border-zinc-800 flex flex-col px-4 py-8">
          <div className="mb-8">
            <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">가계부</h1>
            <p className="text-sm text-amber-600 dark:text-amber-400 font-medium mt-0.5">{monthLabel}</p>
          </div>

          {/* Sidebar nav */}
          <nav className="flex flex-col gap-1 flex-1">
            {tabs.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`text-left px-3 py-2 rounded-lg text-sm transition-colors ${tab === t.id
                  ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 font-medium'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}>
                {t.label}
              </button>
            ))}
          </nav>

          {/* Bottom controls */}
          <div className="flex flex-col gap-3">
            <select
              value={month}
              onChange={e => setMonth(e.target.value)}
              className="text-sm px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 w-full"
            >
              {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
            <button
              onClick={() => setDark(d => !d)}
              className="w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 text-sm"
            >
              {dark ? '☀️ Light mode' : '🌙 Dark mode'}
            </button>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto py-8">
            {tab === 'overview' && <Overview entries={entries} month={month} />}
            {tab === 'entries' && <Entries entries={entries} month={month} onDelete={deleteEntry} />}
            {tab === 'add' && <AddEntry onAdd={addEntry} onDone={() => setTab('entries')} />}
          </div>
        </div>
      </div>

      {/* Mobile layout */}
      <div className="md:hidden max-w-md mx-auto min-h-dvh flex flex-col">
        <div className="px-4 pt-14 pb-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">가계부</h1>
            <p className="text-sm text-amber-600 dark:text-amber-400 font-medium">{monthLabel}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setDark(d => !d)}
              className="w-9 h-9 flex items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-base"
            >
              {dark ? '☀️' : '🌙'}
            </button>
            <select
              value={month}
              onChange={e => setMonth(e.target.value)}
              className="text-sm px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200"
            >
              {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
        </div>

        <div className="flex border-b border-zinc-100 dark:border-zinc-800 px-4 mb-4">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`mr-4 pb-2 text-sm border-b-2 transition-colors ${tab === t.id
                ? 'border-amber-500 text-amber-600 dark:text-amber-400 font-medium'
                : 'border-transparent text-zinc-400'}`}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          {tab === 'overview' && <Overview entries={entries} month={month} />}
          {tab === 'entries' && <Entries entries={entries} month={month} onDelete={deleteEntry} />}
          {tab === 'add' && <AddEntry onAdd={addEntry} onDone={() => setTab('entries')} />}
        </div>
      </div>
    </div>
  )
}
