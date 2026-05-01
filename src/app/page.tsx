'use client'
import { useState, useEffect } from 'react'
import { useEntries } from './useEntries'
import { useSettings } from './useSettings'
import { useSwipe } from './useSwipe'
import Overview from './components/Overview'
import Entries from './components/Entries'
import AddEntry from './components/AddEntry'
import Settings from './components/Settings'
import Calendar from './components/Calendar'
import { getCurrencySymbol } from './types'

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const YEARS = Array.from({ length: 80 }, (_, i) => 2020 + i)

type Tab = 'overview' | 'entries' | 'calendar' | 'add' | 'settings'

export default function Home() {
  const { entries, loaded: entriesLoaded, addEntry, updateEntry, deleteEntry } = useEntries()
  const { contexts, activeContext, activeContextId, switchContext, loaded: settingsLoaded } = useSettings()
  const [tab, setTab] = useState<Tab>('overview')
  const [entriesFilter, setEntriesFilter] = useState<string>('all')
  const [dark, setDark] = useState<boolean | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const now = new Date()
  const [selMonth, setSelMonth] = useState(now.getMonth())
  const [selYear, setSelYear] = useState(now.getFullYear())

  const month = `${selYear}-${String(selMonth + 1).padStart(2, '0')}`
  const monthLabel = `${MONTH_NAMES[selMonth]} ${selYear}`

  const navigateTo = (newTab: string, filter?: string) => {
    setTab(newTab as Tab)
    if (filter) setEntriesFilter(filter)
  }

  const goNextMonth = () => {
    if (selMonth === 11) { setSelMonth(0); setSelYear(y => y + 1) }
    else setSelMonth(m => m + 1)
  }

  const goPrevMonth = () => {
    if (selMonth === 0) { setSelMonth(11); setSelYear(y => y - 1) }
    else setSelMonth(m => m - 1)
  }

  const { onTouchStart, onTouchEnd } = useSwipe({ onSwipeLeft: goNextMonth, onSwipeRight: goPrevMonth })

  useEffect(() => {
    const saved = localStorage.getItem('theme')
    if (saved) setDark(saved === 'dark')
    else setDark(window.matchMedia('(prefers-color-scheme: dark)').matches)
  }, [])

  useEffect(() => {
    if (dark === null) return
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('theme', dark ? 'dark' : 'light')
  }, [dark])

  if (!entriesLoaded || !settingsLoaded || dark === null) return (
    <div className="flex items-center justify-center min-h-screen text-zinc-400 text-sm">Loading…</div>
  )

  const tabs = [
    { id: 'overview' as Tab, label: 'Overview' },
    { id: 'entries' as Tab, label: 'Entries' },
    { id: 'calendar' as Tab, label: 'Calendar' },
    { id: 'add' as Tab, label: '+ Add' },
    { id: 'settings' as Tab, label: 'Settings' },
  ]

  const MonthYearPicker = ({ col = false }: { col?: boolean }) => (
    <div className={`flex gap-1.5 ${col ? 'flex-col' : ''}`}>
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

  const Sidebar = () => (
    <div className="flex flex-col h-full px-3 py-6">
      <div className="px-2 mb-6">
        <h1 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">가계부</h1>
      </div>
      <div className="mb-4">
        <div className="text-xs font-medium text-zinc-400 uppercase tracking-widest px-2 mb-2">Contexts</div>
        {contexts.map(c => {
          const sym = getCurrencySymbol(c.currency)
          const isActive = c.id === activeContextId
          return (
            <button key={c.id} onClick={() => { switchContext(c.id); setTab('overview') }}
              className={`w-full text-left px-2 py-2 rounded-lg text-sm mb-0.5 transition-colors flex items-center justify-between ${isActive
                ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 font-medium'
                : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}>
              <span>{c.name}</span>
              <span className="text-xs opacity-60">{sym} {c.currency}</span>
            </button>
          )
        })}
      </div>
      <div className="border-t border-zinc-100 dark:border-zinc-800 my-2" />
      <nav className="flex flex-col gap-0.5 flex-1">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`text-left px-2 py-2 rounded-lg text-sm transition-colors ${tab === t.id
              ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-medium'
              : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}>
            {t.label}
          </button>
        ))}
      </nav>
      <div className="flex flex-col gap-2 mt-4">
        <div className="text-xs text-zinc-400 px-1">{monthLabel}</div>
        <MonthYearPicker col />
        <button onClick={() => setDark(d => !d)}
          className="w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 text-sm mt-1">
          {dark ? '☀️ Light' : '🌙 Dark'}
        </button>
      </div>
    </div>
  )

  const TabContent = () => (
    <>
      {tab === 'overview' && <Overview entries={entries} month={month} onNavigate={navigateTo} />}
      {tab === 'entries' && <Entries entries={entries} month={month} onDelete={deleteEntry} onUpdate={updateEntry} initialTypeFilter={entriesFilter} />}
      {tab === 'calendar' && <Calendar entries={entries} month={month} onUpdate={updateEntry} onDelete={deleteEntry} />}
      {tab === 'add' && <AddEntry onAdd={addEntry} onDone={() => setTab('entries')} entries={entries} />}
      {tab === 'settings' && <Settings />}
    </>
  )

  return (
    <div className="min-h-screen bg-[#fafaf8] dark:bg-[#0f0f0d]">
      {/* Desktop */}
      <div className="hidden md:flex h-screen">
        <div className="w-52 flex-shrink-0 border-r border-zinc-200 dark:border-zinc-800 overflow-y-auto">
          <Sidebar />
        </div>
        <div className="flex-1 overflow-y-auto">
          <div className={`${tab === 'calendar' ? 'max-w-4xl' : 'max-w-2xl'} mx-auto py-8`}>
            <div className="px-4 mb-6">
              <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">{activeContext?.name}</h2>
              <p className="text-sm text-amber-600 dark:text-amber-400 font-medium">{monthLabel}</p>
              <p className="text-xs text-zinc-400">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
            </div>
            <TabContent />
          </div>
        </div>
      </div>

      {/* Mobile */}
      <div className="md:hidden max-w-md mx-auto min-h-dvh flex flex-col">
        <div className="px-4 pt-14 pb-3 flex items-center justify-between">
          <div>
            <button onClick={() => setMobileMenuOpen(true)}
              className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 flex items-center gap-1.5">
              {activeContext?.name}
              <span className="text-base text-zinc-400">▾</span>
            </button>
            <p className="text-sm text-amber-600 dark:text-amber-400 font-medium">{monthLabel}</p>
            <p className="text-xs text-zinc-400">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setDark(d => !d)}
              className="w-9 h-9 flex items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-base">
              {dark ? '☀️' : '🌙'}
            </button>
            <MonthYearPicker />
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 bg-black/40" onClick={() => setMobileMenuOpen(false)}>
            <div className="absolute bottom-0 left-0 right-0 bg-[#fafaf8] dark:bg-[#1a1a18] rounded-t-2xl p-4 pb-8"
              onClick={e => e.stopPropagation()}>
              <div className="text-xs font-medium text-zinc-400 uppercase tracking-widest mb-3">Switch context</div>
              {contexts.map(c => {
                const sym = getCurrencySymbol(c.currency)
                const isActive = c.id === activeContextId
                return (
                  <button key={c.id} onClick={() => { switchContext(c.id); setMobileMenuOpen(false); setTab('overview') }}
                    className={`w-full text-left px-3 py-3 rounded-xl text-sm mb-1.5 flex items-center justify-between ${isActive
                      ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 font-medium'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'}`}>
                    <span>{c.name}</span>
                    <span className="text-xs opacity-60">{sym} {c.currency}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

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

        <div className="flex-1 overflow-y-auto" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
          <TabContent />
        </div>
      </div>
    </div>
  )
}
