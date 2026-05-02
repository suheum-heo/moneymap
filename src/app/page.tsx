'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useEntries } from './useEntries'
import { useSettings } from './useSettings'
import Overview from './components/Overview'
import Entries from './components/Entries'
import AddEntry from './components/AddEntry'
import Settings from './components/Settings'
import Calendar from './components/Calendar'
import { getCurrencySymbol } from './types'

const MONTH_NAMES_EN = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const YEARS = Array.from({ length: 80 }, (_, i) => 2020 + i)

type Tab = 'overview' | 'entries' | 'calendar' | 'add' | 'settings'

function addMonths(month: number, year: number, delta: number) {
  let m = month + delta
  let y = year
  while (m > 11) { m -= 12; y++ }
  while (m < 0) { m += 12; y-- }
  return { month: m, year: y }
}

function monthStr(month: number, year: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}`
}

export default function Home() {
  const { t } = useTranslation()
  const { entries, loaded: entriesLoaded, addEntry, updateEntry, deleteEntry } = useEntries()
  const { contexts, activeContext, activeContextId, switchContext, loaded: settingsLoaded } = useSettings()
  const [tab, setTab] = useState<Tab>('overview')
  const [entriesFilter, setEntriesFilter] = useState<string>('all')
  const [dark, setDark] = useState<boolean | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const wheelTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const now = new Date()
  const [selMonth, setSelMonth] = useState(now.getMonth())
  const [selYear, setSelYear] = useState(now.getFullYear())

  const month = monthStr(selMonth, selYear)
  const monthLabel = `${MONTH_NAMES_EN[selMonth]} ${selYear}`

  const navigateTo = (newTab: string, filter?: string) => {
    setTab(newTab as Tab)
    if (filter) setEntriesFilter(filter)
  }

  const goNextMonth = useCallback(() => {
    const next = addMonths(selMonth, selYear, 1)
    setSelMonth(next.month); setSelYear(next.year)
  }, [selMonth, selYear])

  const goPrevMonth = useCallback(() => {
    const prev = addMonths(selMonth, selYear, -1)
    setSelMonth(prev.month); setSelYear(prev.year)
  }, [selMonth, selYear])

  const onWheel = useCallback((e: React.WheelEvent) => {
    if (Math.abs(e.deltaX) < Math.abs(e.deltaY)) return
    if (wheelTimeout.current) return
    if (e.deltaX > 30) {
      goNextMonth()
      wheelTimeout.current = setTimeout(() => { wheelTimeout.current = null }, 600)
    } else if (e.deltaX < -30) {
      goPrevMonth()
      wheelTimeout.current = setTimeout(() => { wheelTimeout.current = null }, 600)
    }
  }, [goNextMonth, goPrevMonth])

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
    <div className="flex items-center justify-center min-h-screen text-zinc-400 text-sm">{t('loading')}</div>
  )

  const tabs = [
    { id: 'overview' as Tab, label: t('overview') },
    { id: 'entries' as Tab, label: t('entries') },
    { id: 'calendar' as Tab, label: t('calendar') },
    { id: 'add' as Tab, label: t('add') },
    { id: 'settings' as Tab, label: t('settings') },
  ]

  const MonthYearPicker = ({ col = false }: { col?: boolean }) => (
    <div className={`flex gap-1.5 ${col ? 'flex-col' : ''}`}>
      <select value={selMonth} onChange={e => setSelMonth(Number(e.target.value))}
        className="text-sm px-2 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200">
        {MONTH_NAMES_EN.map((m, i) => <option key={m} value={i}>{m}</option>)}
      </select>
      <select value={selYear} onChange={e => setSelYear(Number(e.target.value))}
        className="text-sm px-2 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200">
        {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
      </select>
    </div>
  )

  const arrowCls = "w-9 h-9 flex items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 text-lg hover:border-amber-400 hover:text-amber-500 transition-colors flex-shrink-0"

  const Sidebar = () => (
    <div className="flex flex-col h-full px-3 py-6">
      <div className="px-2 mb-6">
        <h1 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">{t('appName')}</h1>
      </div>
      <div className="mb-4">
        <div className="text-xs font-medium text-zinc-400 uppercase tracking-widest px-2 mb-2">{t('contexts')}</div>
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
        <div className="flex items-center gap-1">
          <button onClick={goPrevMonth} className={arrowCls}>‹</button>
          <div className="flex-1 text-center text-xs text-zinc-500">{monthLabel}</div>
          <button onClick={goNextMonth} className={arrowCls}>›</button>
        </div>
        <MonthYearPicker col />
        <button onClick={() => setDark(d => !d)}
          className="w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 text-sm mt-1">
          {dark ? `☀️ ${t('light')}` : `🌙 ${t('dark')}`}
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
        <div className="flex-1 overflow-y-auto" onWheel={onWheel}>
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
        <div className="flex items-center gap-2 pt-14 px-3">
          <button onClick={() => setMobileMenuOpen(true)}
            className="flex-1 text-left text-lg font-semibold text-zinc-900 dark:text-zinc-50 flex items-center gap-1">
            <span className="truncate">{activeContext?.name}</span>
            <span className="text-sm text-zinc-400 flex-shrink-0">▾</span>
          </button>
          <button onClick={() => setDark(d => !d)}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm flex-shrink-0">
            {dark ? '☀️' : '🌙'}
          </button>
          <MonthYearPicker />
        </div>

        <div className="flex items-center gap-2 px-3 pt-2 pb-3">
          <button onClick={goPrevMonth} className={arrowCls}>‹</button>
          <div className="flex-1 flex flex-col items-center">
            <p className="text-sm text-amber-600 dark:text-amber-400 font-medium">{monthLabel}</p>
            <p className="text-xs text-zinc-400">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
          </div>
          <button onClick={goNextMonth} className={arrowCls}>›</button>
        </div>

        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 bg-black/40" onClick={() => setMobileMenuOpen(false)}>
            <div className="absolute bottom-0 left-0 right-0 bg-[#fafaf8] dark:bg-[#1a1a18] rounded-t-2xl p-4 pb-8"
              onClick={e => e.stopPropagation()}>
              <div className="text-xs font-medium text-zinc-400 uppercase tracking-widest mb-3">{t('switchContext')}</div>
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

        <div className="flex-1 overflow-y-auto">
          <TabContent />
        </div>
      </div>
    </div>
  )
}
