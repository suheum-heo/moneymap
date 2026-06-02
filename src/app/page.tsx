'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useEntries } from './useEntries'
import { useSettings } from './useSettings'
import { useRecurring } from './useRecurring'
import { useBudgets } from './useBudgets'
import { useCategories } from './useCategories'
import Overview from './components/Overview'
import Entries from './components/Entries'
import AddEntry from './components/AddEntry'
import Settings from './components/Settings'
import Calendar from './components/Calendar'
import AuthGate from './components/AuthGate'
import Onboarding from './components/Onboarding'
import { UserContext } from './UserContext'
import { formatFullDate, getCurrencySymbol, getEntryCurrency, shouldRepairLegacyEntryCurrency, Context, EntrySortOrder } from './types'
import type { User } from '@supabase/supabase-js'

const YEARS = Array.from({ length: 80 }, (_, i) => 2020 + i)
const ENTRY_SORT_ORDER_KEY = 'gagyebu-entry-sort-order'

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
  const language = i18n.resolvedLanguage || i18n.language
  const { entries, loaded: entriesLoaded, addEntry, updateEntry, deleteEntry } = useEntries()
  const { contexts, activeContext, activeContextId, switchContext, addContext, removeContext, updateContext: saveContext, convert, loaded: settingsLoaded, ratesUpdated } = useSettings()
  const { items, loaded: recurringLoaded, addItem, updateItem, deleteItem: deleteRecurringItem } = useRecurring()
  const { setBudget, getBudget, loaded: budgetsLoaded } = useBudgets()
  const { categories, expenseCategories, incomeCategories, addCategory, removeCategory, loaded: categoriesLoaded } = useCategories()
  const [tab, setTab] = useState<Tab>('overview')
  const [entriesFilter, setEntriesFilter] = useState<string>('all')
  const [entriesCategoryFilter, setEntriesCategoryFilter] = useState<string>('all')
  const [entrySortOrder, setEntrySortOrder] = useState<EntrySortOrder | null>(null)
  const [dark, setDark] = useState<boolean | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const wheelTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const repairedLegacyEntryIds = useRef<Set<string>>(new Set())
  const [calendarAddDate, setCalendarAddDate] = useState<string | null>(null)

  const now = new Date()
  const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const [selMonth, setSelMonth] = useState(now.getMonth())
  const [selYear, setSelYear] = useState(now.getFullYear())

  const month = monthStr(selMonth, selYear)
  const monthLabel = new Date(selYear, selMonth, 1).toLocaleDateString(language, { month: 'long', year: 'numeric' })
  const currentTabLabel = tab === 'add' ? t('addEntry') : ({
    overview: t('overview'),
    entries: t('entries'),
    calendar: t('calendar'),
    settings: t('settings'),
  } as const)[tab]

  const navigateTo = (newTab: string, filter?: string, categoryFilter?: string) => {
    setTab(newTab as Tab)
    setEntriesFilter(filter || 'all')
    setEntriesCategoryFilter(categoryFilter || 'all')
  }

  const openAddEntry = useCallback((date: string | null = null) => {
    setCalendarAddDate(date)
    setTab('add')
  }, [])

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

    const savedSortOrder = localStorage.getItem(ENTRY_SORT_ORDER_KEY)
    setEntrySortOrder(savedSortOrder === 'oldest' ? 'oldest' : 'newest')
  }, [])

  useEffect(() => {
    if (dark === null) return
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('theme', dark ? 'dark' : 'light')
  }, [dark])

  useEffect(() => {
    if (!entrySortOrder) return
    localStorage.setItem(ENTRY_SORT_ORDER_KEY, entrySortOrder)
  }, [entrySortOrder])

  useEffect(() => {
    if (!entriesLoaded || !settingsLoaded || contexts.length === 0) return
    const contextsById = new Map(contexts.map(ctx => [ctx.id, ctx]))
    const legacyEntries = entries.filter(entry => {
      if (repairedLegacyEntryIds.current.has(entry.id)) return false
      const ctx = contextsById.get(entry.context)
      return !!ctx && shouldRepairLegacyEntryCurrency(entry, ctx.currency, ctx.homeCurrency)
    })

    legacyEntries.forEach(entry => {
      const ctx = contextsById.get(entry.context)
      if (!ctx) return
      repairedLegacyEntryIds.current.add(entry.id)
      void updateEntry({
        ...entry,
        currency: getEntryCurrency(entry, ctx.currency, ctx.homeCurrency),
      })
    })
  }, [contexts, entries, entriesLoaded, settingsLoaded, updateEntry])

  if (!entriesLoaded || !settingsLoaded || !recurringLoaded || !budgetsLoaded || !categoriesLoaded || dark === null || entrySortOrder === null) return (
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
    { id: 'settings' as Tab, label: t('settings') },
  ]

  const arrowCls = "app-button-secondary flex h-11 w-11 flex-shrink-0 items-center justify-center !px-0 !py-0 text-lg text-slate-500 dark:text-slate-300"
  const pickerCls = "app-select w-full min-w-0 py-2.5 text-sm"

  const MonthYearPicker = ({ col = false }: { col?: boolean }) => (
          <div className={`flex gap-2 ${col ? 'flex-col' : 'flex-1'}`}>
      <select value={selMonth} onChange={e => setSelMonth(Number(e.target.value))}
        className={pickerCls}>
        {Array.from({ length: 12 }, (_, i) => (
          <option key={i} value={i}>{new Date(2000, i, 1).toLocaleDateString(language, { month: 'long' })}</option>
        ))}
      </select>
      <select value={selYear} onChange={e => setSelYear(Number(e.target.value))}
        className={pickerCls}>
        {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
      </select>
    </div>
  )

  const Sidebar = () => (
    <div className="flex h-full flex-col px-4 py-4">
      <div className="mb-5 rounded-[26px] border border-slate-200/75 bg-white/88 px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] dark:border-white/10 dark:bg-slate-900/70">
        <img src="/moneymap-logo.png" alt={t('appName')} className="mb-3 h-10 w-10 rounded-2xl object-cover" />
        <div className="app-kicker mb-2">{t('appName')}</div>
        <h1 className="text-[1.35rem] font-semibold text-slate-900 dark:text-zinc-50">{activeContext?.name || t('appName')}</h1>
        <div className="mt-1 text-xs text-slate-400 truncate">{user.email}</div>
      </div>
      <div className="mb-3">
        <div className="app-kicker mb-2 px-2">{t('contexts')}</div>
        <div className="app-panel-soft p-2">
          {contexts.map(c => {
            const sym = getCurrencySymbol(c.currency)
            const isActive = c.id === activeContextId
            return (
              <button key={c.id} onClick={() => { switchContext(c.id); setTab('overview') }}
                className={`mb-1 flex w-full items-center justify-between rounded-[20px] px-3 py-3 text-left text-sm transition-all last:mb-0 ${isActive
                  ? 'border border-[#d6e6ff] bg-white text-[#245ec6] shadow-[0_12px_24px_-20px_rgba(49,130,246,0.42)] dark:border-sky-400/20 dark:bg-slate-950/90 dark:text-sky-200'
                  : 'text-slate-500 hover:bg-white/85 hover:text-slate-900 dark:hover:bg-slate-900/80 dark:hover:text-zinc-100'}`}>
                <span>{c.name}</span>
                <span className="text-xs opacity-60">{sym} {c.currency}</span>
              </button>
            )
          })}
        </div>
      </div>
      <nav className="app-panel-soft flex flex-1 flex-col gap-1 p-2">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`rounded-[20px] px-3 py-3 text-left text-sm transition-all ${tab === t.id
              ? 'border border-slate-200/85 bg-white text-slate-900 font-medium shadow-[0_12px_24px_-22px_rgba(15,23,42,0.18)] dark:border-white/10 dark:bg-slate-950/85 dark:text-zinc-100'
              : 'text-slate-500 hover:bg-white/85 hover:text-slate-900 dark:hover:bg-slate-900/80 dark:hover:text-zinc-100'}`}>
            {t.label}
          </button>
        ))}
      </nav>
      <div className="app-panel-soft mt-4 flex flex-col gap-3 p-3">
        <div className="flex items-center gap-2">
          <button onClick={goPrevMonth} className={arrowCls}>‹</button>
          <div className="flex-1 text-center">
            <div className="text-xs uppercase tracking-[0.16em] text-slate-400">{t('calendar')}</div>
            <div className="mt-1 text-sm font-medium text-slate-700 dark:text-zinc-200">{monthLabel}</div>
          </div>
          <button onClick={goNextMonth} className={arrowCls}>›</button>
        </div>
        <MonthYearPicker col />
        <button onClick={() => setDark(d => !d)}
          className="app-button-secondary flex w-full items-center justify-center gap-2 py-2.5">
          {dark ? `☀️ ${t('light')}` : `🌙 ${t('dark')}`}
        </button>
        <button onClick={() => document.getElementById('sign-out-btn')?.click()}
          className="rounded-[18px] px-3 py-2 text-xs text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-500/10 dark:hover:text-rose-300">
          {t('signOut')}
        </button>
      </div>
    </div>
  )

  const TabContent = () => (
    <>
      {tab === 'overview' && <Overview entries={entries} month={month} onNavigate={navigateTo} onUpdate={updateEntry} sortOrder={entrySortOrder} activeContext={activeContext} convert={convert} getBudget={getBudget} expenseCategories={expenseCategories} incomeCategories={incomeCategories} />}
      {tab === 'entries' && <Entries entries={entries} month={month} onDelete={deleteEntry} onUpdate={updateEntry} initialTypeFilter={entriesFilter} initialCategoryFilter={entriesCategoryFilter} sortOrder={entrySortOrder} onSortOrderChange={setEntrySortOrder} activeContext={activeContext} convert={convert} expenseCategories={expenseCategories} incomeCategories={incomeCategories} />}
      {tab === 'calendar' && <Calendar entries={entries} month={month} onUpdate={updateEntry} onDelete={deleteEntry} onAddForDate={openAddEntry} sortOrder={entrySortOrder} activeContext={activeContext} expenseCategories={expenseCategories} incomeCategories={incomeCategories} />}
      {tab === 'add' && <AddEntry onAdd={addEntry} onDone={() => setTab('entries')} entries={entries} defaultDate={calendarAddDate} activeContext={activeContext} items={items} expenseCategories={expenseCategories} incomeCategories={incomeCategories} />}
      {tab === 'settings' && <Settings userEmail={user.email || ''} contexts={contexts} addContext={addContext} removeContext={removeContext} updateContext={saveContext} convert={convert} activeContext={activeContext} ratesUpdated={ratesUpdated} setBudget={setBudget} getBudget={getBudget} items={items} addItem={addItem} updateItem={updateItem} deleteItem={deleteRecurringItem} categories={categories} addCategory={addCategory} removeCategory={removeCategory} />}
    </>
  )

  return (
    <div className="min-h-screen">
      <div className="hidden min-h-screen gap-5 px-4 py-4 md:flex xl:px-6">
        <div className="app-panel w-[268px] flex-shrink-0 overflow-y-auto">
          <Sidebar />
        </div>
        <div className="flex-1 overflow-y-auto pr-1" onWheel={onWheel}>
          <div className={`${tab === 'calendar' ? 'max-w-6xl' : 'max-w-5xl'} mx-auto py-4`}>
            <div className="app-panel mb-5 px-5 py-5">
              <div className="app-kicker mb-2">{currentTabLabel}</div>
              <div className="flex items-end justify-between gap-6">
                <div>
                  <h2 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-zinc-50">{activeContext?.name}</h2>
                  <p className="mt-2 text-base font-medium text-[#3182f6] dark:text-sky-300">{monthLabel}</p>
                  <p className="mt-1 text-sm text-slate-400">{formatFullDate(todayKey, language)}</p>
                </div>
                <div className="flex flex-col items-end gap-3">
                  {tab !== 'add' && (
                    <button onClick={() => openAddEntry()}
                      className="app-button-primary px-5 py-3 text-sm shadow-[0_16px_30px_-22px_rgba(49,130,246,0.5)]">
                      + {t('addEntry')}
                    </button>
                  )}
                  <div className="hidden rounded-[22px] border border-slate-200/75 bg-slate-50/80 px-4 py-3 text-right lg:block dark:border-white/10 dark:bg-slate-900/70">
                    <div className="text-xs uppercase tracking-[0.16em] text-slate-400">{t('settings')}</div>
                    <div className="mt-1 text-sm text-slate-700 dark:text-zinc-300">{activeContext?.currency}{activeContext?.homeCurrency && activeContext.homeCurrency !== activeContext.currency ? ` → ${activeContext.homeCurrency}` : ''}</div>
                  </div>
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
              <div className="app-kicker mb-1">{currentTabLabel}</div>
              <div className="flex items-center gap-1.5 text-lg font-semibold text-slate-900 dark:text-zinc-50">
                <span className="truncate">{activeContext?.name}</span>
                <span className="text-sm text-slate-400 flex-shrink-0">▾</span>
              </div>
              <p className="mt-1 text-sm font-medium text-[#3182f6] dark:text-sky-300">{monthLabel}</p>
            </button>
            <button onClick={() => setDark(d => !d)}
              className="app-button-secondary flex h-11 w-11 flex-shrink-0 items-center justify-center !px-0 !py-0 text-sm">
              {dark ? '☀️' : '🌙'}
            </button>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <button onClick={goPrevMonth} className={arrowCls}>‹</button>
            <div className="flex-1 text-center">
              <p className="text-sm text-slate-500 dark:text-zinc-300">{formatFullDate(todayKey, language)}</p>
            </div>
            <button onClick={goNextMonth} className={arrowCls}>›</button>
          </div>

          <div className="mt-3">
            <MonthYearPicker />
          </div>

          {tab !== 'add' && (
            <button onClick={() => openAddEntry()}
              className="app-button-primary mt-3 w-full shadow-[0_16px_30px_-22px_rgba(49,130,246,0.5)]">
              + {t('addEntry')}
            </button>
          )}
        </div>

        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 bg-slate-950/35 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)}>
            <div className="app-panel absolute bottom-0 left-3 right-3 rounded-b-none rounded-t-[30px] p-4 pb-8"
              onClick={e => e.stopPropagation()}>
              <div className="text-xs text-slate-400 mb-3 truncate">{user.email}</div>
              <div className="app-kicker mb-3">{t('switchContext')}</div>
              {contexts.map(c => {
                const sym = getCurrencySymbol(c.currency)
                const isActive = c.id === activeContextId
                return (
                  <button key={c.id} onClick={() => { switchContext(c.id); setMobileMenuOpen(false); setTab('overview') }}
                    className={`mb-1.5 flex w-full items-center justify-between rounded-[20px] px-3 py-3 text-left text-sm transition-all ${isActive
                      ? 'border border-[#d6e6ff] bg-white text-[#245ec6] shadow-[0_12px_24px_-20px_rgba(49,130,246,0.42)] dark:border-sky-400/20 dark:bg-slate-950/90 dark:text-sky-200'
                      : 'bg-white/88 text-slate-700 dark:bg-slate-900/70 dark:text-zinc-300'}`}>
                    <span>{c.name}</span>
                    <span className="text-xs opacity-60">{sym} {c.currency}</span>
                  </button>
                )
              })}
              <button onClick={() => document.getElementById('sign-out-btn')?.click()}
                className="mt-3 w-full rounded-[18px] border border-rose-200 bg-rose-50 py-2.5 text-sm font-medium text-rose-400 dark:border-rose-400/15 dark:bg-rose-500/10 dark:text-rose-300">
                {t('signOut')}
              </button>
            </div>
          </div>
        )}

        <div className="app-panel-soft mt-4 grid grid-cols-4 gap-1 p-1.5">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`rounded-[18px] px-2 py-2.5 text-sm transition-all ${tab === t.id
                ? 'border border-slate-200/85 bg-white text-slate-900 font-medium shadow-[0_12px_20px_-18px_rgba(15,23,42,0.16)] dark:border-white/10 dark:bg-slate-900/90 dark:text-zinc-100'
                : 'text-slate-400 dark:text-slate-500'}`}>
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
