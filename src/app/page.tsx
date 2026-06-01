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
import AuthGate from './components/AuthGate'
import Onboarding from './components/Onboarding'
import { UserContext } from './UserContext'
import { getCurrencySymbol, Context } from './types'
import type { User } from '@supabase/supabase-js'

const YEARS = Array.from({ length: 80 }, (_, i) => 2020 + i)

type Tab = 'overview' | 'entries' | 'calendar' | 'add' | 'settings'

function addMonths(month: number, year: number, delta: number) {
  let m = month + delta, y = year
  while (m > 11) { m -= 12; y++ }
  while (m < 0) { m += 12; y-- }
  return { month: m, year: y }
}

function monthStr(month: number, year: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}`
}

function AppContent({ user }: { user: User }) {
  const { t, i18n } = useTranslation()
  const { entries, loaded: entriesLoaded, addEntry, updateEntry, deleteEntry } = useEntries()
  const { contexts, activeContext, activeContextId, switchContext, addContext, loaded: settingsLoaded } = useSettings()
  const [tab, setTab] = useState<Tab>('overview')
  const [entriesFilter, setEntriesFilter] = useState<string>('all')
  const [dark, setDark] = useState<boolean | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const wheelTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [calendarAddDate, setCalendarAddDate] = useState<string | null>(null)

  const now = new Date()
  const [selMonth, setSelMonth] = useState(now.getMonth())
  const [selYear, setSelYear] = useState(now.getFullYear())

  const month = monthStr(selMonth, selYear)
  const monthLabel = new Date(selYear, selMonth, 1).toLocaleDateString(i18n.language, { month: 'long', year: 'numeric' })

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
    if (e.deltaX > 30) { goNextMonth(); wheelTimeout.current = setTimeout(() => { wheelTimeout.current = null }, 600) }
    else if (e.deltaX < -30) { goPrevMonth(); wheelTimeout.current = setTimeout(() => { wheelTimeout.current = null }, 600) }
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

  if (contexts.length === 0) return (
    <Onboarding onDone={({ name, currency, homeCurrency, startDate }) => {
      const ctx: Context = { id: Date.now().toString(), name, currency, homeCurrency, startDate }
      addContext(ctx)
    }} />
  )

  const tabs = [
    { id: 'overview' as Tab, label: t('overview') },
    { id: 'entries' as Tab, label: t('entries') },
    { id: 'calendar' as Tab, label: t('calendar') },
    { id: 'add' as Tab, label: t('add') },
    { id: 'settings' as Tab, label: t('settings') },
  ]

  const arrowCls = "app-button-secondary flex h-11 w-11 flex-shrink-0 items-center justify-center !px-0 !py-0 text-lg text-zinc-500 dark:text-zinc-300"
  const pickerCls = "app-select w-full min-w-0 py-2.5 text-sm"

  const MonthYearPicker = ({ col = false }: { col?: boolean }) => (
    <div className={`flex gap-2 ${col ? 'flex-col' : 'flex-1'}`}>
      <select value={selMonth} onChange={e => setSelMonth(Number(e.target.value))}
        className={pickerCls}>
        {Array.from({ length: 12 }, (_, i) => (
          <option key={i} value={i}>{new Date(2000, i, 1).toLocaleDateString(i18n.language, { month: 'long' })}</option>
        ))}
      </select>
      <select value={selYear} onChange={e => setSelYear(Number(e.target.value))}
        className={pickerCls}>
        {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
      </select>
    </div>
  )

  const Sidebar = () => (
    <div className="flex h-full flex-col px-4 py-5">
      <div className="mb-6 rounded-[24px] border border-white/70 bg-white/60 px-4 py-4 shadow-[0_18px_38px_-30px_rgba(15,23,42,0.32)] dark:border-white/10 dark:bg-slate-950/45 dark:shadow-[0_20px_36px_-30px_rgba(0,0,0,0.72)]">
        <div className="app-kicker mb-2">{t('appName')}</div>
        <h1 className="text-[1.35rem] font-semibold text-zinc-900 dark:text-zinc-50">{activeContext?.name || t('appName')}</h1>
        <div className="mt-1 text-xs text-zinc-400 truncate">{user.email}</div>
      </div>
      <div className="mb-4">
        <div className="app-kicker mb-2 px-2">{t('contexts')}</div>
        {contexts.map(c => {
          const sym = getCurrencySymbol(c.currency)
          const isActive = c.id === activeContextId
          return (
            <button key={c.id} onClick={() => { switchContext(c.id); setTab('overview') }}
              className={`mb-1 flex w-full items-center justify-between rounded-2xl px-3 py-3 text-left text-sm transition-all ${isActive
                ? 'border border-indigo-100 bg-indigo-50/90 text-indigo-700 shadow-[0_16px_32px_-28px_rgba(99,115,255,0.85)] dark:border-indigo-400/20 dark:bg-indigo-500/15 dark:text-indigo-200'
                : 'text-zinc-500 hover:bg-white/80 hover:text-zinc-900 dark:hover:bg-slate-950/70 dark:hover:text-zinc-100'}`}>
              <span>{c.name}</span>
              <span className="text-xs opacity-60">{sym} {c.currency}</span>
            </button>
          )
        })}
      </div>
      <div className="mx-2 my-3 border-t border-zinc-200/70 dark:border-white/10" />
      <nav className="flex flex-1 flex-col gap-1">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`rounded-2xl px-3 py-3 text-left text-sm transition-all ${tab === t.id
              ? 'bg-white/92 text-zinc-900 font-medium shadow-[0_16px_30px_-28px_rgba(15,23,42,0.55)] dark:bg-slate-950/78 dark:text-zinc-100'
              : 'text-zinc-500 hover:bg-white/70 hover:text-zinc-900 dark:hover:bg-slate-950/70 dark:hover:text-zinc-100'}`}>
            {t.label}
          </button>
        ))}
      </nav>
      <div className="app-panel-soft mt-5 flex flex-col gap-3 p-3">
        <div className="flex items-center gap-2">
          <button onClick={goPrevMonth} className={arrowCls}>‹</button>
          <div className="flex-1 text-center">
            <div className="text-xs uppercase tracking-[0.18em] text-zinc-400">{t('calendar')}</div>
            <div className="mt-1 text-sm font-medium text-zinc-700 dark:text-zinc-200">{monthLabel}</div>
          </div>
          <button onClick={goNextMonth} className={arrowCls}>›</button>
        </div>
        <MonthYearPicker col />
        <button onClick={() => setDark(d => !d)}
          className="app-button-secondary flex w-full items-center justify-center gap-2 py-2.5">
          {dark ? `☀️ ${t('light')}` : `🌙 ${t('dark')}`}
        </button>
        <button onClick={() => document.getElementById('sign-out-btn')?.click()}
          className="rounded-2xl px-3 py-2 text-xs text-zinc-400 transition-colors hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-500/10 dark:hover:text-rose-300">
          Sign out
        </button>
      </div>
    </div>
  )

  const TabContent = () => (
    <>
      {tab === 'overview' && <Overview entries={entries} month={month} onNavigate={navigateTo} />}
      {tab === 'entries' && <Entries entries={entries} month={month} onDelete={deleteEntry} onUpdate={updateEntry} initialTypeFilter={entriesFilter} />}
      {tab === 'calendar' && <Calendar entries={entries} month={month} onUpdate={updateEntry} onDelete={deleteEntry} onAddForDate={(date) => { setCalendarAddDate(date); setTab('add') }} />}
      {tab === 'add' && <AddEntry onAdd={addEntry} onDone={() => setTab('entries')} entries={entries} defaultDate={calendarAddDate} />}
      {tab === 'settings' && <Settings />}
    </>
  )

  return (
    <div className="min-h-screen">
      <div className="hidden min-h-screen gap-6 px-4 py-4 md:flex xl:px-6">
        <div className="app-panel w-[268px] flex-shrink-0 overflow-y-auto">
          <Sidebar />
        </div>
        <div className="flex-1 overflow-y-auto pr-1" onWheel={onWheel}>
          <div className={`${tab === 'calendar' ? 'max-w-6xl' : 'max-w-5xl'} mx-auto py-4`}>
            <div className="app-panel mb-6 px-6 py-6">
              <div className="app-kicker mb-2">{tabs.find(item => item.id === tab)?.label}</div>
              <div className="flex items-end justify-between gap-6">
                <div>
                  <h2 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">{activeContext?.name}</h2>
                  <p className="mt-2 text-base font-medium text-indigo-500 dark:text-indigo-300">{monthLabel}</p>
                  <p className="mt-1 text-sm text-zinc-400">{new Date().toLocaleDateString(i18n.language, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
                </div>
                <div className="hidden rounded-[24px] border border-zinc-200/70 bg-white/70 px-4 py-3 text-right shadow-[0_18px_32px_-30px_rgba(15,23,42,0.28)] dark:border-white/10 dark:bg-slate-950/45 dark:shadow-[0_20px_34px_-30px_rgba(0,0,0,0.7)] lg:block">
                  <div className="text-xs uppercase tracking-[0.18em] text-zinc-400">{t('settings')}</div>
                  <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">{activeContext?.currency}{activeContext?.homeCurrency && activeContext.homeCurrency !== activeContext.currency ? ` → ${activeContext.homeCurrency}` : ''}</div>
                </div>
              </div>
            </div>
            <TabContent />
          </div>
        </div>
      </div>

      <div className="mx-auto flex min-h-dvh w-full max-w-xl flex-col px-4 pb-8 pt-6 md:hidden">
        <div className="app-panel px-4 py-4">
          <div className="flex items-start gap-3">
            <button onClick={() => setMobileMenuOpen(true)}
              className="flex-1 text-left">
              <div className="app-kicker mb-1">{tabs.find(item => item.id === tab)?.label}</div>
              <div className="flex items-center gap-1.5 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                <span className="truncate">{activeContext?.name}</span>
                <span className="text-sm text-zinc-400 flex-shrink-0">▾</span>
              </div>
              <p className="mt-1 text-sm font-medium text-indigo-500 dark:text-indigo-300">{monthLabel}</p>
            </button>
            <button onClick={() => setDark(d => !d)}
              className="app-button-secondary flex h-11 w-11 flex-shrink-0 items-center justify-center !px-0 !py-0 text-sm">
              {dark ? '☀️' : '🌙'}
            </button>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <button onClick={goPrevMonth} className={arrowCls}>‹</button>
            <div className="flex-1 text-center">
              <p className="text-sm text-zinc-500 dark:text-zinc-300">{new Date().toLocaleDateString(i18n.language, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
            </div>
            <button onClick={goNextMonth} className={arrowCls}>›</button>
          </div>

          <div className="mt-3">
            <MonthYearPicker />
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 bg-slate-950/35 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)}>
            <div className="app-panel absolute bottom-0 left-3 right-3 rounded-b-none rounded-t-[30px] p-4 pb-8"
              onClick={e => e.stopPropagation()}>
              <div className="text-xs text-zinc-400 mb-3 truncate">{user.email}</div>
              <div className="app-kicker mb-3">{t('switchContext')}</div>
              {contexts.map(c => {
                const sym = getCurrencySymbol(c.currency)
                const isActive = c.id === activeContextId
                return (
                  <button key={c.id} onClick={() => { switchContext(c.id); setMobileMenuOpen(false); setTab('overview') }}
                    className={`mb-1.5 flex w-full items-center justify-between rounded-2xl px-3 py-3 text-left text-sm transition-all ${isActive
                      ? 'border border-indigo-100 bg-indigo-50/90 text-indigo-700 shadow-[0_16px_32px_-28px_rgba(99,115,255,0.85)] dark:border-indigo-400/20 dark:bg-indigo-500/15 dark:text-indigo-200'
                      : 'bg-white/78 text-zinc-700 dark:bg-slate-950/55 dark:text-zinc-300'}`}>
                    <span>{c.name}</span>
                    <span className="text-xs opacity-60">{sym} {c.currency}</span>
                  </button>
                )
              })}
              <button onClick={() => document.getElementById('sign-out-btn')?.click()}
                className="mt-3 w-full rounded-2xl border border-rose-200 bg-rose-50 py-2.5 text-sm font-medium text-rose-500 dark:border-rose-400/15 dark:bg-rose-500/10 dark:text-rose-300">
                Sign out
              </button>
            </div>
          </div>
        )}

        <div className="app-panel-soft mt-4 grid grid-cols-5 gap-1 p-1.5">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`rounded-2xl px-2 py-2.5 text-sm transition-all ${tab === t.id
                ? 'bg-white/92 text-zinc-900 font-medium shadow-[0_16px_30px_-28px_rgba(15,23,42,0.55)] dark:bg-slate-950/78 dark:text-zinc-100'
                : 'text-zinc-400'}`}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto pt-4">
          <TabContent />
        </div>
      </div>
    </div>
  )
}

function AppWithContext({ user }: { user: User }) {
  return (
    <UserContext.Provider value={user.id}>
      <AppContent user={user} />
    </UserContext.Provider>
  )
}

export default function Home() {
  return <AuthGate>{(user) => <AppWithContext user={user} />}</AuthGate>
}
