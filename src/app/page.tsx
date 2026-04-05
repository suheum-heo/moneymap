'use client'
import { useState, useEffect } from 'react'
import { useEntries } from './useEntries'
import Overview from './components/Overview'
import Entries from './components/Entries'
import AddEntry from './components/AddEntry'

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const YEARS = Array.from({ length: 80 }, (_, i) => 2020 + i) // 2020–2029

type Tab = 'overview' | 'entries' | 'add'

export default function Home() {
  const { entries, loaded, addEntry, deleteEntry } = useEntries()
  const [tab, setTab] = useState<Tab>('overview')
  const [dark, setDark] = useState<boolean | null>(null)

  const now = new Date()
  const [selMonth, setSelMonth] = useState(now.getMonth())
  const [selYear, setSelYear] = useState(now.getFullYear())

  const month = `${selYear}-${String(selMonth + 1).padStart(2, '0')}`
  const monthLabel = `${MONTH_NAMES[selMonth]} ${selYear}`

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

  if (!loaded || dark === null) return (
    <div className="flex items-center justify-center min-h-screen text-zinc-400 text-sm">Loading…</div>
  )

  const tabs = [
    { id: 'overview' as Tab, label: 'Overview' },
    { id: 'entries' as Tab, label: 'Entries' },
    { id: 'add' as Tab, label: '+ Add' },
  ]

  const MonthYearPicker = ({ className }: { className?: string }) => (
    <div className={`flex gap-1.5 ${className}`}>
      <select value={selMonth} onChange={e => setSelMonth(Number(e.target.value))}
        className="text-sm px-2 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200">
        {MONTH_NAMES.map((m, i) => <option key={m} value={i}>{m}</option>)}
      </select>
      <select value={selYear} onChange={e => setSelYear(Number(e.target.value))}
        className="text-sm px-2 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200">
        {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
      </select>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#fafaf8] dark:bg-[#0f0f0d]">
      {/* Desktop layout */}
      <div className="hidden md:flex h-screen">
        <div className="w-56 flex-shrink-0 border-r border-zinc-200 dark:border-zinc-800 flex flex-col px-4 py-8">
          <div className="mb-8">
            <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">가계부</h1>
            <p className="text-sm text-amber-600 dark:text-amber-400 font-medium mt-0.5">{monthLabel}</p>
          </div>
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
          <div className="flex flex-col gap-3">
            <MonthYearPicker className="flex-col" />
            <button onClick={() => setDark(d => !d)}
              className="w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 text-sm">
              {dark ? '☀️ Light mode' : '🌙 Dark mode'}
            </button>
          </div>
        </div>
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
            <button onClick={() => setDark(d => !d)}
              className="w-9 h-9 flex items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-base">
              {dark ? '☀️' : '🌙'}
            </button>
            <MonthYearPicker />
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
