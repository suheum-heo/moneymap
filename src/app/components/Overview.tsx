'use client'
import { useMemo, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Entry,
  Context,
  EntrySortOrder,
  convertEntryAmount,
  formatAmount,
  formatEntryDate,
  formatMonthYear,
  getCategoryColor,
  getEntryCurrency,
  sortEntriesForDisplay,
} from '../types'
import type { RecurringItem } from '../useRecurring'
import EntryEditModal from './EntryEditModal'
import ChevronDownIcon from './ChevronDownIcon'
import LocalizedMonthPicker from './LocalizedMonthPicker'
import { Chart, registerables } from 'chart.js'
Chart.register(...registerables)

interface Props {
  entries: Entry[]
  items?: RecurringItem[]
  month: string
  onNavigate: (tab: string, filter?: string, categoryFilter?: string) => void
  onUpdate: (entry: Entry) => void
  sortOrder: EntrySortOrder
  activeContext?: Context
  convert: (amount: number, from: string, to: string) => number
  getBudget: (context: string, category: string) => number | null
  expenseCategories: string[]
  incomeCategories: string[]
}

type PeriodMode = 'all' | 'year' | 'custom'
const PERIOD_TOTALS_EXPANDED_KEY = 'gagyebu-period-totals-expanded'
const UNSPECIFIED_PAYMENT_METHOD = '__unspecified__'

function softenColor(hex: string, mix = 0.16, alpha = 0.88) {
  const raw = hex.replace('#', '')
  if (raw.length !== 3 && raw.length !== 6) return hex
  const full = raw.length === 3 ? raw.split('').map(char => char + char).join('') : raw
  const channels = [0, 2, 4].map(i => parseInt(full.slice(i, i + 2), 16))
  const softened = channels.map(channel => Math.round(channel + (255 - channel) * mix))
  return `rgba(${softened[0]}, ${softened[1]}, ${softened[2]}, ${alpha})`
}

const US_STATE_NAMES: Record<string, string> = {
  AL: 'Alabama',
  AK: 'Alaska',
  AZ: 'Arizona',
  AR: 'Arkansas',
  CA: 'California',
  CO: 'Colorado',
  CT: 'Connecticut',
  DE: 'Delaware',
  FL: 'Florida',
  GA: 'Georgia',
  HI: 'Hawaii',
  ID: 'Idaho',
  IL: 'Illinois',
  IN: 'Indiana',
  IA: 'Iowa',
  KS: 'Kansas',
  KY: 'Kentucky',
  LA: 'Louisiana',
  ME: 'Maine',
  MD: 'Maryland',
  MA: 'Massachusetts',
  MI: 'Michigan',
  MN: 'Minnesota',
  MS: 'Mississippi',
  MO: 'Missouri',
  MT: 'Montana',
  NE: 'Nebraska',
  NV: 'Nevada',
  NH: 'New Hampshire',
  NJ: 'New Jersey',
  NM: 'New Mexico',
  NY: 'New York',
  NC: 'North Carolina',
  ND: 'North Dakota',
  OH: 'Ohio',
  OK: 'Oklahoma',
  OR: 'Oregon',
  PA: 'Pennsylvania',
  RI: 'Rhode Island',
  SC: 'South Carolina',
  SD: 'South Dakota',
  TN: 'Tennessee',
  TX: 'Texas',
  UT: 'Utah',
  VT: 'Vermont',
  VA: 'Virginia',
  WA: 'Washington',
  WV: 'West Virginia',
  WI: 'Wisconsin',
  WY: 'Wyoming',
  DC: 'District of Columbia',
}

type PrefectureNames = { en: string; ja: string; ko: string }

const JP_PREFECTURE_NAMES: Record<string, PrefectureNames> = {
  'JP-01': { en: 'Hokkaido', ja: '北海道', ko: '홋카이도' },
  'JP-02': { en: 'Aomori', ja: '青森', ko: '아오모리' },
  'JP-03': { en: 'Iwate', ja: '岩手', ko: '이와테' },
  'JP-04': { en: 'Miyagi', ja: '宮城', ko: '미야기' },
  'JP-05': { en: 'Akita', ja: '秋田', ko: '아키타' },
  'JP-06': { en: 'Yamagata', ja: '山形', ko: '야마가타' },
  'JP-07': { en: 'Fukushima', ja: '福島', ko: '후쿠시마' },
  'JP-08': { en: 'Ibaraki', ja: '茨城', ko: '이바라키' },
  'JP-09': { en: 'Tochigi', ja: '栃木', ko: '도치기' },
  'JP-10': { en: 'Gunma', ja: '群馬', ko: '군마' },
  'JP-11': { en: 'Saitama', ja: '埼玉', ko: '사이타마' },
  'JP-12': { en: 'Chiba', ja: '千葉', ko: '치바' },
  'JP-13': { en: 'Tokyo', ja: '東京', ko: '도쿄' },
  'JP-14': { en: 'Kanagawa', ja: '神奈川', ko: '가나가와' },
  'JP-15': { en: 'Niigata', ja: '新潟', ko: '니가타' },
  'JP-16': { en: 'Toyama', ja: '富山', ko: '도야마' },
  'JP-17': { en: 'Ishikawa', ja: '石川', ko: '이시카와' },
  'JP-18': { en: 'Fukui', ja: '福井', ko: '후쿠이' },
  'JP-19': { en: 'Yamanashi', ja: '山梨', ko: '야마나시' },
  'JP-20': { en: 'Nagano', ja: '長野', ko: '나가노' },
  'JP-21': { en: 'Gifu', ja: '岐阜', ko: '기후' },
  'JP-22': { en: 'Shizuoka', ja: '静岡', ko: '시즈오카' },
  'JP-23': { en: 'Aichi', ja: '愛知', ko: '아이치' },
  'JP-24': { en: 'Mie', ja: '三重', ko: '미에' },
  'JP-25': { en: 'Shiga', ja: '滋賀', ko: '시가' },
  'JP-26': { en: 'Kyoto', ja: '京都', ko: '교토' },
  'JP-27': { en: 'Osaka', ja: '大阪', ko: '오사카' },
  'JP-28': { en: 'Hyogo', ja: '兵庫', ko: '효고' },
  'JP-29': { en: 'Nara', ja: '奈良', ko: '나라' },
  'JP-30': { en: 'Wakayama', ja: '和歌山', ko: '와카야마' },
  'JP-31': { en: 'Tottori', ja: '鳥取', ko: '돗토리' },
  'JP-32': { en: 'Shimane', ja: '島根', ko: '시마네' },
  'JP-33': { en: 'Okayama', ja: '岡山', ko: '오카야마' },
  'JP-34': { en: 'Hiroshima', ja: '広島', ko: '히로시마' },
  'JP-35': { en: 'Yamaguchi', ja: '山口', ko: '야마구치' },
  'JP-36': { en: 'Tokushima', ja: '徳島', ko: '도쿠시마' },
  'JP-37': { en: 'Kagawa', ja: '香川', ko: '가가와' },
  'JP-38': { en: 'Ehime', ja: '愛媛', ko: '에히메' },
  'JP-39': { en: 'Kochi', ja: '高知', ko: '고치' },
  'JP-40': { en: 'Fukuoka', ja: '福岡', ko: '후쿠오카' },
  'JP-41': { en: 'Saga', ja: '佐賀', ko: '사가' },
  'JP-42': { en: 'Nagasaki', ja: '長崎', ko: '나가사키' },
  'JP-43': { en: 'Kumamoto', ja: '熊本', ko: '구마모토' },
  'JP-44': { en: 'Oita', ja: '大分', ko: '오이타' },
  'JP-45': { en: 'Miyazaki', ja: '宮崎', ko: '미야자키' },
  'JP-46': { en: 'Kagoshima', ja: '鹿児島', ko: '가고시마' },
  'JP-47': { en: 'Okinawa', ja: '沖縄', ko: '오키나와' },
}

function isUsStateCode(part: string) {
  const code = part.replace(/[^A-Za-z]/g, '').toUpperCase()
  return /^[A-Z]{2}$/.test(code) && Boolean(US_STATE_NAMES[code])
}

function resolveLanguageKey(language?: string): keyof PrefectureNames {
  const base = (language || 'en').toLowerCase().split('-')[0]
  if (base === 'ja' || base === 'ko') return base
  return 'en'
}

function expandIsoSubdivisionCode(part: string, language?: string) {
  const code = part.trim().toUpperCase()
  const prefecture = JP_PREFECTURE_NAMES[code]
  if (!prefecture) return null
  return prefecture[resolveLanguageKey(language)]
}

function formatLocationLabel(location: string, language?: string) {
  const trimmed = location.trim()
  if (!trimmed) return trimmed

  const commaParts = trimmed.split(',').map(part => part.trim()).filter(Boolean)
  if (commaParts.length < 2) return trimmed

  const lastPart = commaParts[commaParts.length - 1]
  if (isUsStateCode(lastPart)) {
    const stateCode = lastPart.replace(/[^A-Za-z]/g, '').toUpperCase()
    return [...commaParts.slice(0, -1), US_STATE_NAMES[stateCode]].join(', ')
  }

  const expanded = expandIsoSubdivisionCode(lastPart, language)
  if (expanded) {
    return [...commaParts.slice(0, -1), expanded].join(', ')
  }

  return trimmed
}

function getLocationRegion(location: string, language?: string) {
  const trimmed = location.trim()
  if (!trimmed) return null

  const commaParts = trimmed.split(',').map(part => part.trim()).filter(Boolean)
  if (commaParts.length > 1) {
    const lastPart = commaParts[commaParts.length - 1]

    if (isUsStateCode(lastPart)) {
      const stateCode = lastPart.replace(/[^A-Za-z]/g, '').toUpperCase()
      return US_STATE_NAMES[stateCode]
    }

    // e.g. "成田市, JP-12" → Chiba / 千葉 / 치바
    const expanded = expandIsoSubdivisionCode(lastPart, language)
    if (expanded) return expanded

    return lastPart
  }

  const spaceParts = trimmed.split(/\s+/).filter(Boolean)
  if (spaceParts.length > 1) {
    return spaceParts[0]
  }

  return null
}

function getEntryMonth(date: string) {
  return date.slice(0, 7)
}

export default function Overview({ entries, items = [], month, onNavigate, onUpdate, sortOrder, activeContext, convert, getBudget, expenseCategories, incomeCategories }: Props) {
  const { t, i18n } = useTranslation()
  const language = i18n.resolvedLanguage || i18n.language
  const catChartRef = useRef<HTMLCanvasElement>(null)
  const locChartRef = useRef<HTMLCanvasElement>(null)
  const regionChartRef = useRef<HTMLCanvasElement>(null)
  const catChartInstance = useRef<Chart | null>(null)
  const locChartInstance = useRef<Chart | null>(null)
  const regionChartInstance = useRef<Chart | null>(null)
  const [expandedCat, setExpandedCat] = useState<string | null>(null)
  const [expandedPaymentMethod, setExpandedPaymentMethod] = useState<string | null>(null)
  const [expandedLocation, setExpandedLocation] = useState<string | null>(null)
  const [editEntry, setEditEntry] = useState<Entry | null>(null)
  const [periodMode, setPeriodMode] = useState<PeriodMode>('all')
  const [selectedPeriodYear, setSelectedPeriodYear] = useState(() => new Date().getFullYear())
  const [periodStartMonth, setPeriodStartMonth] = useState('')
  const [periodEndMonth, setPeriodEndMonth] = useState('')
  const [periodExpanded, setPeriodExpanded] = useState(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem(PERIOD_TOTALS_EXPANDED_KEY) === 'true'
  })
  const periodContextRef = useRef<string | undefined>(undefined)

  const cur = activeContext?.currency || 'USD'
  const homeCur = activeContext?.homeCurrency || cur
  const showConversion = cur !== homeCur
  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
  const chartGridColor = isDark ? 'rgba(148,163,184,0.12)' : 'rgba(203,213,225,0.62)'
  const chartTextColor = isDark ? '#95a2b3' : '#7b8794'
  const locationChartTextColor = isDark ? '#cbd5e1' : '#475569'
  const accentBarColor = isDark ? 'rgba(112, 167, 250, 0.8)' : 'rgba(91, 142, 240, 0.86)'
  const regionBarColor = isDark ? 'rgba(45, 212, 191, 0.66)' : 'rgba(20, 184, 166, 0.72)'
  const tooltipBackground = isDark ? 'rgba(15, 23, 42, 0.96)' : 'rgba(255, 255, 255, 0.97)'
  const tooltipBorder = isDark ? 'rgba(148, 163, 184, 0.18)' : 'rgba(203, 213, 225, 0.9)'
  const tooltipTitle = isDark ? '#f8fafc' : '#0f172a'
  const tooltipBody = isDark ? '#dbe4ef' : '#334155'

  const contextEntries = useMemo(() =>
    entries.filter(e => e.context === activeContext?.id),
    [entries, activeContext?.id])

  const availableMonths = useMemo(() =>
    [...new Set(contextEntries.map(e => getEntryMonth(e.date)).filter(value => /^\d{4}-\d{2}$/.test(value)))].sort(),
    [contextEntries])

  const minEntryMonth = availableMonths[0] || month
  const maxEntryMonth = availableMonths[availableMonths.length - 1] || month

  const availableYears = useMemo(() =>
    [...new Set(availableMonths.map(value => Number(value.slice(0, 4))).filter(Number.isFinite))].sort((a, b) => b - a),
    [availableMonths])

  const currentMonthYear = Number(month.slice(0, 4))
  const defaultPeriodYear = availableYears.includes(currentMonthYear)
    ? currentMonthYear
    : availableYears[0] || currentMonthYear

  useEffect(() => {
    const periodContextId = activeContext?.id
    if (periodContextRef.current === periodContextId) return
    periodContextRef.current = periodContextId
    setPeriodMode('all')
    setSelectedPeriodYear(defaultPeriodYear)
    setPeriodStartMonth(minEntryMonth)
    setPeriodEndMonth(maxEntryMonth)
  }, [activeContext?.id, defaultPeriodYear, minEntryMonth, maxEntryMonth])

  useEffect(() => {
    if (availableYears.length === 0) return
    if (!availableYears.includes(selectedPeriodYear)) setSelectedPeriodYear(defaultPeriodYear)
  }, [availableYears, defaultPeriodYear, selectedPeriodYear])

  useEffect(() => {
    localStorage.setItem(PERIOD_TOTALS_EXPANDED_KEY, periodExpanded ? 'true' : 'false')
  }, [periodExpanded])

  const monthEntries = useMemo(() =>
    entries.filter(e => e.date.startsWith(month) && e.context === activeContext?.id),
    [entries, month, activeContext])

  const toLocal = (e: Entry) => convertEntryAmount(e, cur, homeCur, cur, convert)

  // Sum in local currency (cur) for display
  const expenses = useMemo(() =>
    monthEntries.filter(e => e.type === 'expense').reduce((s, e) => s + toLocal(e), 0),
    [monthEntries, cur, homeCur, convert])

  const income = useMemo(() =>
    monthEntries.filter(e => e.type === 'income').reduce((s, e) => s + toLocal(e), 0),
    [monthEntries, cur, homeCur, convert])

  const net = income - expenses

  // Sum in home currency: use homeAmount if set, otherwise convert via live rate
  const toHome = (e: Entry) => convertEntryAmount(e, cur, homeCur, homeCur, convert)

  const periodBounds = useMemo(() => {
    if (periodMode === 'year') {
      return { start: `${selectedPeriodYear}-01`, end: `${selectedPeriodYear}-12` }
    }

    if (periodMode === 'custom') {
      const customStart = periodStartMonth || minEntryMonth
      const customEnd = periodEndMonth || maxEntryMonth
      return customStart <= customEnd
        ? { start: customStart, end: customEnd }
        : { start: customEnd, end: customStart }
    }

    return { start: minEntryMonth, end: maxEntryMonth }
  }, [maxEntryMonth, minEntryMonth, periodEndMonth, periodMode, periodStartMonth, selectedPeriodYear])

  const periodEntries = useMemo(() =>
    contextEntries.filter(e => {
      const entryMonth = getEntryMonth(e.date)
      return entryMonth >= periodBounds.start && entryMonth <= periodBounds.end
    }),
    [contextEntries, periodBounds.end, periodBounds.start])

  const periodExpenses = useMemo(() =>
    periodEntries.filter(e => e.type === 'expense').reduce((s, e) => s + toLocal(e), 0),
    [periodEntries, cur, homeCur, convert])

  const periodIncome = useMemo(() =>
    periodEntries.filter(e => e.type === 'income').reduce((s, e) => s + toLocal(e), 0),
    [periodEntries, cur, homeCur, convert])

  const periodNet = periodIncome - periodExpenses

  const periodExpensesHome = useMemo(() =>
    periodEntries.filter(e => e.type === 'expense').reduce((s, e) => s + toHome(e), 0),
    [periodEntries, cur, homeCur, convert])

  const periodIncomeHome = useMemo(() =>
    periodEntries.filter(e => e.type === 'income').reduce((s, e) => s + toHome(e), 0),
    [periodEntries, cur, homeCur, convert])

  const periodNetHome = periodIncomeHome - periodExpensesHome

  const periodLabel = useMemo(() => {
    if (periodMode === 'all') return t('allTime')
    if (periodMode === 'year') return String(selectedPeriodYear)
    if (periodBounds.start === periodBounds.end) return formatMonthYear(periodBounds.start, language)
    return `${formatMonthYear(periodBounds.start, language)} - ${formatMonthYear(periodBounds.end, language)}`
  }, [language, periodBounds.end, periodBounds.start, periodMode, selectedPeriodYear, t])

  const expensesHome = useMemo(() =>
    monthEntries.filter(e => e.type === 'expense').reduce((s, e) => s + toHome(e), 0),
    [monthEntries, showConversion, cur, homeCur, convert])

  const incomeHome = useMemo(() =>
    monthEntries.filter(e => e.type === 'income').reduce((s, e) => s + toHome(e), 0),
    [monthEntries, showConversion, cur, homeCur, convert])

  const netHome = incomeHome - expensesHome

  const lastMonth = useMemo(() => {
    const [y, m] = month.split('-').map(Number)
    return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`
  }, [month])

  const lastMonthEntries = useMemo(() =>
    entries.filter(e => e.date.startsWith(lastMonth) && e.context === activeContext?.id),
    [entries, lastMonth, activeContext])

  const lastMonthExpenses = useMemo(() =>
    lastMonthEntries.filter(e => e.type === 'expense').reduce((s, e) => s + toLocal(e), 0),
    [lastMonthEntries, cur, homeCur, convert])

  const sameDayLastMonth = useMemo(() => {
    const today = new Date()
    const cutoff = `${lastMonth}-${String(today.getDate()).padStart(2, '0')}`
    return lastMonthEntries.filter(e => e.type === 'expense' && e.date <= cutoff).reduce((s, e) => s + toLocal(e), 0)
  }, [lastMonthEntries, lastMonth, cur, homeCur, convert])

  const isCurrentMonth = useMemo(() => {
    const now = new Date()
    return month === `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  }, [month])

  const byCategory = useMemo(() => {
    const cats: Record<string, number> = {}
    monthEntries.filter(e => e.type === 'expense').forEach(e => {
      cats[e.category] = (cats[e.category] || 0) + toLocal(e)
    })
    return Object.entries(cats).sort((a, b) => b[1] - a[1])
  }, [monthEntries, cur, homeCur, convert])

  const byPaymentMethod = useMemo(() => {
    const methods: Record<string, number> = {}
    const counts: Record<string, number> = {}
    monthEntries.filter(e => e.type === 'expense').forEach(e => {
      const key = e.paymentMethod?.trim() || UNSPECIFIED_PAYMENT_METHOD
      methods[key] = (methods[key] || 0) + toLocal(e)
      counts[key] = (counts[key] || 0) + 1
    })
    return Object.entries(methods)
      .sort((a, b) => b[1] - a[1])
      .map(([key, amount]) => ({
        key,
        label: key === UNSPECIFIED_PAYMENT_METHOD ? t('paymentMethodUnspecified') : key,
        amount,
        count: counts[key] || 0,
      }))
  }, [monthEntries, cur, homeCur, convert, t])

  const paymentMethodSummary = useMemo(() => {
    if (byPaymentMethod.length === 0 || expenses <= 0) return ''
    return byPaymentMethod.slice(0, 3).map(item => {
      const pct = ((item.amount / expenses) * 100).toFixed(0)
      return `${item.label} ${pct}%`
    }).join(' · ')
  }, [byPaymentMethod, expenses])

  const byLocation = useMemo(() => {
    const locs: Record<string, number> = {}
    monthEntries.filter(e => e.type === 'expense' && e.location?.trim()).forEach(e => {
      locs[e.location.trim()] = (locs[e.location.trim()] || 0) + toLocal(e)
    })
    return Object.entries(locs).sort((a, b) => b[1] - a[1])
  }, [monthEntries, cur, homeCur, convert])

  const locationEntryCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    monthEntries.filter(e => e.type === 'expense' && e.location?.trim()).forEach(e => {
      const loc = e.location.trim()
      counts[loc] = (counts[loc] || 0) + 1
    })
    return counts
  }, [monthEntries])

  const byLocationRegion = useMemo(() => {
    const regions: Record<string, number> = {}
    monthEntries.filter(e => e.type === 'expense' && e.location?.trim()).forEach(e => {
      const region = getLocationRegion(e.location, language)
      if (!region) return
      regions[region] = (regions[region] || 0) + toLocal(e)
    })
    return Object.entries(regions).sort((a, b) => b[1] - a[1])
  }, [monthEntries, cur, homeCur, convert, language])

  const locationEntries = useMemo(() => {
    if (!expandedLocation) return []
    return sortEntriesForDisplay(
      monthEntries.filter(e => e.type === 'expense' && e.location?.trim() === expandedLocation),
      sortOrder,
    )
  }, [expandedLocation, monthEntries, sortOrder])

  useEffect(() => {
    if (expandedLocation && !byLocation.some(([loc]) => loc === expandedLocation)) {
      setExpandedLocation(null)
    }
  }, [byLocation, expandedLocation])

  useEffect(() => {
    if (expandedPaymentMethod && !byPaymentMethod.some(item => item.key === expandedPaymentMethod)) {
      setExpandedPaymentMethod(null)
    }
  }, [byPaymentMethod, expandedPaymentMethod])

  useEffect(() => {
    if (!catChartRef.current || byCategory.length === 0) return
    if (catChartInstance.current) catChartInstance.current.destroy()
    catChartInstance.current = new Chart(catChartRef.current, {
      type: 'bar',
      data: {
        labels: byCategory.map(([c]) => c),
        datasets: [{
          data: byCategory.map(([, v]) => parseFloat(v.toFixed(2))),
          backgroundColor: byCategory.map(([c]) => softenColor(getCategoryColor(c, 'expense'), isDark ? 0.08 : 0.16, isDark ? 0.78 : 0.9)),
          borderRadius: 12,
          borderSkipped: false,
          maxBarThickness: 26,
          categoryPercentage: 0.74,
          barPercentage: 0.88,
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: tooltipBackground,
            borderColor: tooltipBorder,
            borderWidth: 1,
            displayColors: false,
            cornerRadius: 14,
            padding: 12,
            titleColor: tooltipTitle,
            bodyColor: tooltipBody,
            callbacks: { label: ctx => ` ${formatAmount(ctx.raw as number, cur)}` }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            border: { display: false },
            ticks: { color: chartTextColor, font: { size: 11, weight: 500 }, maxRotation: 32, autoSkipPadding: 12 }
          },
          y: {
            grid: { color: chartGridColor, drawTicks: false },
            border: { display: false },
            ticks: { color: chartTextColor, callback: v => formatAmount(Number(v), cur), font: { size: 11, weight: 500 }, padding: 8 }
          }
        }
      }
    })
    return () => { catChartInstance.current?.destroy() }
  }, [byCategory, chartGridColor, chartTextColor, cur])

  useEffect(() => {
    if (!locChartRef.current || byLocation.length === 0) return
    if (locChartInstance.current) locChartInstance.current.destroy()
    locChartInstance.current = new Chart(locChartRef.current, {
      type: 'bar',
      data: {
        labels: byLocation.map(([l]) => formatLocationLabel(l, language)),
        datasets: [{
          data: byLocation.map(([, v]) => parseFloat(v.toFixed(2))),
          backgroundColor: accentBarColor,
          borderRadius: 12,
          borderSkipped: false,
          maxBarThickness: 20,
          categoryPercentage: 0.76,
          barPercentage: 0.88,
        }]
      },
      options: {
        indexAxis: 'y' as const, responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: tooltipBackground,
            borderColor: tooltipBorder,
            borderWidth: 1,
            displayColors: false,
            cornerRadius: 14,
            padding: 12,
            titleColor: tooltipTitle,
            bodyColor: tooltipBody,
            callbacks: { label: ctx => ` ${formatAmount(ctx.raw as number, cur)}` }
          }
        },
        scales: {
          x: {
            grid: { color: chartGridColor, drawTicks: false },
            border: { display: false },
            ticks: { color: chartTextColor, callback: v => formatAmount(Number(v), cur), font: { size: 11, weight: 500 }, padding: 8 }
          },
          y: {
            grid: { display: false },
            border: { display: false },
            ticks: { color: locationChartTextColor, font: { size: 12, weight: 600 }, padding: 8, autoSkip: false }
          }
        }
      }
    })
    return () => { locChartInstance.current?.destroy() }
  }, [byLocation, chartGridColor, chartTextColor, locationChartTextColor, accentBarColor, cur, language])

  useEffect(() => {
    if (!regionChartRef.current || byLocationRegion.length === 0) {
      regionChartInstance.current?.destroy()
      regionChartInstance.current = null
      return
    }
    if (regionChartInstance.current) regionChartInstance.current.destroy()
    regionChartInstance.current = new Chart(regionChartRef.current, {
      type: 'bar',
      data: {
        labels: byLocationRegion.map(([region]) => region),
        datasets: [{
          data: byLocationRegion.map(([, v]) => parseFloat(v.toFixed(2))),
          backgroundColor: regionBarColor,
          borderRadius: 12,
          borderSkipped: false,
          maxBarThickness: 22,
          categoryPercentage: 0.76,
          barPercentage: 0.88,
        }]
      },
      options: {
        indexAxis: 'y' as const, responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: tooltipBackground,
            borderColor: tooltipBorder,
            borderWidth: 1,
            displayColors: false,
            cornerRadius: 14,
            padding: 12,
            titleColor: tooltipTitle,
            bodyColor: tooltipBody,
            callbacks: { label: ctx => ` ${formatAmount(ctx.raw as number, cur)}` }
          }
        },
        scales: {
          x: {
            grid: { color: chartGridColor, drawTicks: false },
            border: { display: false },
            ticks: { color: chartTextColor, callback: v => formatAmount(Number(v), cur), font: { size: 11, weight: 500 }, padding: 8 }
          },
          y: {
            grid: { display: false },
            border: { display: false },
            ticks: { color: chartTextColor, font: { size: 11, weight: 500 } }
          }
        }
      }
    })
    return () => { regionChartInstance.current?.destroy() }
  }, [byLocationRegion, chartGridColor, chartTextColor, regionBarColor, cur])

  // Big number = local cur, small grey = home cur equivalent
  const fmt = (n: number) => formatAmount(Math.abs(n), cur)
  const fmtHome = (n: number) => showConversion ? `(≈${formatAmount(Math.abs(n), homeCur)})` : ''

  const periodMetrics = [
    { label: t('expenses'), value: fmt(periodExpenses), sub: fmtHome(periodExpensesHome), color: 'app-negative' },
    { label: t('income'), value: fmt(periodIncome), sub: fmtHome(periodIncomeHome), color: 'app-positive' },
    { label: t('net'), value: (periodNet < 0 ? '-' : '') + fmt(periodNet), sub: fmtHome(periodNetHome), color: periodNet < 0 ? 'app-negative' : 'app-accent' },
  ]

  return (
    <div className="overflow-x-hidden px-4 pb-6">
      <EntryEditModal
        entry={editEntry}
        entries={entries}
        items={items}
        activeContext={activeContext}
        expenseCategories={expenseCategories}
        incomeCategories={incomeCategories}
        onClose={() => setEditEntry(null)}
        onUpdate={onUpdate}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: t('expenses'), value: fmt(expenses), sub: fmtHome(expensesHome), color: 'app-negative', filter: 'expense' },
          { label: t('income'), value: fmt(income), sub: fmtHome(incomeHome), color: 'app-positive', filter: 'income' },
          { label: t('net'), value: (net < 0 ? '-' : '') + fmt(net), sub: fmtHome(netHome), color: net < 0 ? 'app-negative' : 'app-accent', filter: 'all' },
        ].map(m => (
          <button
            key={m.label}
            onClick={() => onNavigate('entries', m.filter)}
            className="app-panel flex flex-col items-start gap-2.5 p-5 text-left transition-transform hover:-translate-y-0.5"
          >
            <span className="app-kicker">{m.label}</span>
            <span className={`whitespace-nowrap text-[1.58rem] font-semibold tracking-tight sm:text-[1.72rem] xl:text-[1.82rem] ${m.color}`}>{m.value}</span>
            {m.sub && <span className="text-sm text-slate-400">{m.sub}</span>}
          </button>
        ))}
      </div>

      <div className="app-panel mt-4 p-4 sm:p-5">
        <button
          type="button"
          onClick={() => setPeriodExpanded(prev => !prev)}
          className="flex w-full items-center justify-between gap-3 text-left"
          aria-expanded={periodExpanded}
        >
          <div className="min-w-0 flex-1">
            <div className="app-kicker mb-2">{t('periodTotals')}</div>
            <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-end sm:gap-3">
              <h3 className="truncate text-lg font-semibold text-slate-900 dark:text-zinc-50">{periodLabel}</h3>
              <span className="text-xs text-slate-400">{t('entriesInPeriod', { count: periodEntries.length })}</span>
            </div>
          </div>
          <div className="flex flex-shrink-0 items-center gap-3">
            <div className="text-right">
              <div className={`whitespace-nowrap text-[1.18rem] font-semibold tracking-tight sm:text-[1.32rem] ${periodNet < 0 ? 'app-negative' : 'app-accent'}`}>
                {(periodNet < 0 ? '-' : '') + fmt(periodNet)}
              </div>
              {fmtHome(periodNetHome) && <div className="mt-1 hidden text-xs text-slate-400 sm:block">{fmtHome(periodNetHome)}</div>}
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/80 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
              <span className="hidden sm:inline">{periodExpanded ? t('hideDetails') : t('showDetails')}</span>
              <ChevronDownIcon className={`h-4 w-4 transition-transform ${periodExpanded ? 'rotate-180' : ''}`} />
            </div>
          </div>
        </button>

        {periodExpanded && (
          <div className="mt-4">
            <div className="mb-4 inline-flex rounded-full border border-slate-200/80 bg-slate-50/90 p-1 dark:border-white/10 dark:bg-slate-900/80">
              {([
                ['all', t('allTime')],
                ['year', t('year')],
                ['custom', t('customRange')],
              ] as const).map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setPeriodMode(mode)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${periodMode === mode
                    ? 'bg-white text-slate-900 shadow-[0_8px_18px_-14px_rgba(15,23,42,0.26)] dark:bg-slate-950 dark:text-zinc-100'
                    : 'text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-zinc-200'}`}
                >
                  {label}
                </button>
              ))}
            </div>

            {availableYears.length > 0 && (
              <div className="mb-4 flex flex-wrap gap-2">
                {availableYears.map(year => (
                  <button
                    key={year}
                    type="button"
                    onClick={() => {
                      setPeriodMode('year')
                      setSelectedPeriodYear(year)
                    }}
                    className={`app-segment px-3 py-2 text-xs ${periodMode === 'year' && selectedPeriodYear === year ? 'app-segment-active' : ''}`}
                  >
                    {year}
                  </button>
                ))}
              </div>
            )}

            {periodMode === 'custom' && (
              <div className="mb-4 grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="app-kicker mb-2 block">{t('startMonth')}</label>
                  <LocalizedMonthPicker
                    value={periodStartMonth}
                    onChange={setPeriodStartMonth}
                    placeholder={t('startMonth')}
                  />
                </div>
                <div>
                  <label className="app-kicker mb-2 block">{t('endMonth')}</label>
                  <LocalizedMonthPicker
                    value={periodEndMonth}
                    onChange={setPeriodEndMonth}
                    placeholder={t('endMonth')}
                  />
                </div>
              </div>
            )}

            <div className="divide-y divide-slate-200/75 overflow-hidden rounded-[22px] border border-slate-200/80 dark:divide-white/10 dark:border-white/10">
              {periodMetrics.map(metric => (
                <div key={metric.label} className="flex items-center justify-between gap-4 px-4 py-3">
                  <div className="app-kicker">{metric.label}</div>
                  <div className="min-w-0 text-right">
                    <div className={`whitespace-nowrap text-[1.2rem] font-semibold tracking-tight sm:text-[1.35rem] ${metric.color}`}>{metric.value}</div>
                    {metric.sub && <div className="mt-1 text-xs text-slate-400">{metric.sub}</div>}
                  </div>
                </div>
              ))}
            </div>

            {periodEntries.length === 0 && (
              <div className="mt-3 text-center text-xs text-slate-400">{t('noEntriesForPeriod')}</div>
            )}
          </div>
        )}
      </div>

      {lastMonthExpenses > 0 && (
        <div className="app-panel mt-4 px-4 py-4 sm:px-5">
          <div className="app-kicker mb-3">{t('vsLastMonth')}</div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="text-slate-500 dark:text-zinc-300">{t('vsLastMonth')}</span>
              <span className={expenses <= lastMonthExpenses ? 'app-positive font-medium' : 'app-negative font-medium'}>
                {expenses <= lastMonthExpenses ? '▼' : '▲'} {fmt(Math.abs(expenses - lastMonthExpenses))} {expenses <= lastMonthExpenses ? t('less') : t('more')}
              </span>
            </div>
            {isCurrentMonth && sameDayLastMonth > 0 && (
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-slate-500 dark:text-zinc-300">{t('vsSameDay')}</span>
                <span className={expenses <= sameDayLastMonth ? 'app-positive font-medium' : 'app-negative font-medium'}>
                  {expenses <= sameDayLastMonth ? '▼' : '▲'} {fmt(Math.abs(expenses - sameDayLastMonth))} {expenses <= sameDayLastMonth ? t('less') : t('more')}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {monthEntries.length === 0 && (
        <div className="app-panel mt-5 py-12 text-center text-sm text-slate-400">{t('noEntries')}</div>
      )}

      {monthEntries.length > 0 && (
        <div className="mt-5 grid gap-3 xl:grid-cols-[minmax(0,1.25fr)_minmax(300px,0.95fr)]">
          <div className="app-panel p-4 sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <div className="app-kicker mb-2">{t('byCategory')}</div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-zinc-50">{t('expenses')}</h3>
              </div>
              <div className="text-right text-xs text-slate-400">{t('categoryCount', { count: byCategory.length })}</div>
            </div>

            <div className="grid min-w-0 gap-3 sm:grid-cols-2">
              {byCategory.map(([cat, amt]) => {
                const pct = expenses > 0 ? ((amt / expenses) * 100).toFixed(1) : '0'
                const col = getCategoryColor(cat, 'expense')
                const budget = activeContext ? getBudget(activeContext.id, cat) : null
                const budgetPct = budget ? (amt / budget) * 100 : null
                const isWarning = budgetPct !== null && budgetPct >= 80 && budgetPct < 100
                const isDanger = budgetPct !== null && budgetPct >= 100
                const isExpanded = expandedCat === cat
                const catEntriesForCat = isExpanded
                  ? sortEntriesForDisplay(
                    monthEntries.filter(e => e.type === 'expense' && e.category === cat),
                    sortOrder,
                  )
                  : []
                return (
                  <div key={cat} className="min-w-0 space-y-2">
                    <button
                      onClick={() => setExpandedCat(isExpanded ? null : cat)}
                      className="app-list-row w-full min-w-0 text-left transition-transform sm:hover:-translate-y-0.5"
                    >
                      <div className="flex min-w-0 items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex min-w-0 items-center gap-2">
                            <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ background: col }} />
                            <span className="truncate text-sm font-medium text-slate-800 dark:text-zinc-100">{cat}</span>
                            {isDanger && <span className="app-negative flex-shrink-0 text-xs font-medium">{t('overBudget')}</span>}
                            {isWarning && <span className="flex-shrink-0 text-xs font-medium text-amber-500">80%</span>}
                          </div>
                          <div className="mt-2 text-xs text-slate-400">{pct}%</div>
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <div className="text-sm font-semibold text-slate-900 dark:text-zinc-50">{formatAmount(amt, cur)}</div>
                          {budget && <div className="mt-1 text-xs text-slate-400">/ {formatAmount(budget, cur)}</div>}
                          <div className="mt-2 text-xs text-slate-400">{isExpanded ? '▲' : '▼'}</div>
                        </div>
                      </div>
                      {budget && (
                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200/80 dark:bg-white/10">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${Math.min(budgetPct || 0, 100)}%`, background: isDanger ? '#d97784' : isWarning ? '#e7ae4b' : softenColor(col, 0.12, 0.95) }}
                          />
                        </div>
                      )}
                    </button>

                    {isExpanded && (
                      <div className="min-w-0 overflow-hidden rounded-[22px] border border-slate-200/75 bg-slate-50/75 px-3 py-3 dark:border-white/10 dark:bg-slate-950/50">
                        <div className="space-y-2">
                          {catEntriesForCat.map(e => {
                            const entryCurrency = getEntryCurrency(e, cur, homeCur)
                            return (
                              <button
                                key={e.id}
                                onClick={() => setEditEntry(e)}
                                className="app-list-row flex w-full min-w-0 cursor-pointer items-center gap-3 !rounded-[20px] !px-3 !py-3 text-left transition-colors hover:border-slate-300/85 hover:bg-white/92 dark:hover:border-white/15 dark:hover:bg-slate-900/80"
                              >
                                <div className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ background: col }} />
                                <div className="w-12 flex-shrink-0 text-xs text-slate-400">{formatEntryDate(e.date, language)}</div>
                                <div className="min-w-0 flex-1">
                                  <div className="truncate text-sm font-medium text-slate-800 dark:text-zinc-100">{e.summary}</div>
                                  {e.venue && <div className="truncate text-xs text-slate-400">{e.venue}{e.location ? ` · ${formatLocationLabel(e.location, language)}` : ''}</div>}
                                  {e.paymentMethod && <div className="truncate text-xs text-slate-400">{e.paymentMethod}</div>}
                                </div>
                                <div className="min-w-0 flex-shrink-0 text-right">
                                  <div className="text-sm font-semibold" style={{ color: col }}>
                                    -{formatAmount(e.amount, entryCurrency)}
                                  </div>
                                </div>
                              </button>
                            )
                          })}
                        </div>
                        <div className="flex min-w-0 items-center justify-between gap-3 px-2 pt-3">
                          <div className="min-w-0 truncate text-xs text-slate-400">
                            {t('entryCount', { count: catEntriesForCat.length })} · {t('total')} {formatAmount(amt, cur)}
                          </div>
                          <button
                            onClick={() => onNavigate('entries', 'expense', cat)}
                            className="flex-shrink-0 text-[11px] font-medium uppercase tracking-[0.12em] text-[#5b8ef0] transition-colors hover:text-[#255fcb] dark:text-sky-300 dark:hover:text-sky-200"
                          >
                            {t('viewAllInEntries')}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {byCategory.length > 0 && (
            <div className="app-panel p-4 sm:p-5">
              <div className="mb-4">
                <div className="app-kicker mb-2">{t('spendingChart')}</div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-zinc-50">{t('spendingChart')}</h3>
              </div>
              <div className="relative w-full" style={{ height: 280 }}>
                <canvas ref={catChartRef} />
              </div>
            </div>
          )}
        </div>
      )}

      {byPaymentMethod.length > 0 && (
        <div className="app-panel mt-5 p-4 sm:p-5">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="app-kicker mb-2">{t('byPaymentMethod')}</div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-zinc-50">{t('paymentMethodBreakdown')}</h3>
              {paymentMethodSummary && (
                <p className="mt-2 truncate text-sm text-slate-500 dark:text-zinc-400">{paymentMethodSummary}</p>
              )}
            </div>
            <div className="flex-shrink-0 text-right text-xs text-slate-400">
              {t('paymentMethodCount', { count: byPaymentMethod.length })}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {byPaymentMethod.map((item, index) => {
              const pctValue = expenses > 0 ? (item.amount / expenses) * 100 : 0
              const pct = pctValue.toFixed(1)
              const isExpanded = expandedPaymentMethod === item.key
              const methodEntries = isExpanded
                ? sortEntriesForDisplay(
                  monthEntries.filter(e =>
                    e.type === 'expense'
                    && ((e.paymentMethod?.trim() || UNSPECIFIED_PAYMENT_METHOD) === item.key),
                  ),
                  sortOrder,
                )
                : []
              const barColor = softenColor(
                ['#5b8ef0', '#14b8a6', '#e7ae4b', '#d97784', '#8b7cf6', '#64748b'][index % 6],
                isDark ? 0.08 : 0.12,
                isDark ? 0.82 : 0.92,
              )

              return (
                <div key={item.key} className="min-w-0 space-y-2">
                  <button
                    type="button"
                    onClick={() => setExpandedPaymentMethod(isExpanded ? null : item.key)}
                    className="app-list-row w-full min-w-0 text-left transition-transform sm:hover:-translate-y-0.5"
                  >
                    <div className="flex min-w-0 items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-slate-800 dark:text-zinc-100">{item.label}</div>
                        <div className="mt-1 text-xs text-slate-400">
                          {pct}% · {t('entryCount', { count: item.count })}
                        </div>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <div className="text-sm font-semibold text-slate-900 dark:text-zinc-50">{formatAmount(item.amount, cur)}</div>
                        <div className="mt-2 text-xs text-slate-400">{isExpanded ? '▲' : '▼'}</div>
                      </div>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200/80 dark:bg-white/10">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${Math.min(pctValue, 100)}%`, background: barColor }}
                      />
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="min-w-0 overflow-hidden rounded-[22px] border border-slate-200/75 bg-slate-50/75 px-3 py-3 dark:border-white/10 dark:bg-slate-950/50">
                      <div className="space-y-2">
                        {methodEntries.map(e => {
                          const entryCurrency = getEntryCurrency(e, cur, homeCur)
                          const col = getCategoryColor(e.category, e.type)
                          return (
                            <button
                              key={e.id}
                              type="button"
                              onClick={() => setEditEntry(e)}
                              className="app-list-row flex w-full min-w-0 cursor-pointer items-center gap-3 !rounded-[20px] !px-3 !py-3 text-left transition-colors hover:border-slate-300/85 hover:bg-white/92 dark:hover:border-white/15 dark:hover:bg-slate-900/80"
                            >
                              <div className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ background: col }} />
                              <div className="w-12 flex-shrink-0 text-xs text-slate-400">{formatEntryDate(e.date, language)}</div>
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-sm font-medium text-slate-800 dark:text-zinc-100">{e.summary}</div>
                                {e.venue && <div className="truncate text-xs text-slate-400">{e.venue}{e.location ? ` · ${e.location}` : ''}</div>}
                                <div className="truncate text-xs text-slate-400">{e.category}</div>
                              </div>
                              <div className="min-w-0 flex-shrink-0 text-right">
                                <div className="text-sm font-semibold" style={{ color: col }}>
                                  -{formatAmount(e.amount, entryCurrency)}
                                </div>
                              </div>
                            </button>
                          )
                        })}
                      </div>
                      <div className="px-2 pt-3 text-xs text-slate-400">
                        {t('entryCount', { count: methodEntries.length })} · {t('total')} {formatAmount(item.amount, cur)}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {byLocation.length > 0 && (
        <div className="mt-3 grid min-w-0 gap-3 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <div className="app-panel min-w-0 overflow-hidden p-4 sm:p-5">
            <div className="mb-4">
              <div className="app-kicker mb-2">{t('location')}</div>
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">{t('locationBreakdown')}</h3>
            </div>

            {byLocationRegion.length > 0 && (
              <div className="mb-5 min-w-0 overflow-hidden rounded-[24px] border border-teal-200/80 bg-gradient-to-br from-teal-50/95 via-white to-cyan-50/70 shadow-[0_14px_28px_-26px_rgba(13,148,136,0.55)] dark:border-teal-400/20 dark:from-teal-950/40 dark:via-slate-950/70 dark:to-cyan-950/30">
                <div className="flex min-w-0 items-center justify-between gap-3 border-b border-teal-200/70 px-4 py-3 dark:border-teal-400/15">
                  <div className="min-w-0">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-teal-700/80 dark:text-teal-300/80">
                      {t('byRegion')}
                    </div>
                    <div className="mt-1 text-sm font-semibold text-teal-950 dark:text-teal-50">
                      {t('regionLevelLabel')}
                    </div>
                  </div>
                  <div className="rounded-full border border-teal-300/70 bg-teal-100/80 px-2.5 py-1 text-[11px] font-semibold text-teal-800 dark:border-teal-400/25 dark:bg-teal-500/15 dark:text-teal-200">
                    {t('regionCount', { count: byLocationRegion.length })}
                  </div>
                </div>
                <div className="grid min-w-0 gap-2 p-3 sm:grid-cols-2">
                  {byLocationRegion.map(([region, amt]) => {
                    const pct = expenses > 0 ? ((amt / expenses) * 100).toFixed(1) : '0'
                    return (
                      <div
                        key={region}
                        className="min-w-0 overflow-hidden rounded-[18px] border border-teal-200/70 bg-white/85 px-3.5 py-3 dark:border-teal-400/15 dark:bg-slate-950/55"
                      >
                        <div className="flex min-w-0 items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-[15px] font-semibold tracking-tight text-teal-950 dark:text-teal-50">
                              {region}
                            </div>
                            <div className="mt-1 text-xs font-medium text-teal-700/70 dark:text-teal-300/70">
                              {pct}%
                            </div>
                          </div>
                          <div className="flex-shrink-0 whitespace-nowrap text-sm font-semibold text-teal-900 dark:text-teal-50">
                            {formatAmount(amt, cur)}
                          </div>
                        </div>
                        <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-teal-100 dark:bg-teal-500/15">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: regionBarColor }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="mb-3 flex items-end justify-between gap-3 border-t border-slate-200/80 pt-4 dark:border-white/10">
              <div className="min-w-0">
                <div className="app-kicker mb-1.5">{t('byLocationDetail')}</div>
                <div className="text-sm font-semibold text-slate-800 dark:text-zinc-100">
                  {t('locationLevelLabel')}
                </div>
              </div>
              <div className="rounded-full border border-slate-200/80 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
                {t('locationCount', { count: byLocation.length })}
              </div>
            </div>

            <div className="min-w-0 space-y-3">
              {byLocation.map(([loc, amt]) => {
                const pct = expenses > 0 ? ((amt / expenses) * 100).toFixed(1) : '0'
                const isExpanded = expandedLocation === loc
                const locationLabel = formatLocationLabel(loc, language)
                return (
                  <div key={loc} className="min-w-0 space-y-2">
                    <button
                      onClick={() => setExpandedLocation(prev => prev === loc ? null : loc)}
                      className={`app-list-row w-full min-w-0 cursor-pointer overflow-hidden border-l-[3px] border-l-[#8eb6f7] text-left transition-all sm:hover:-translate-y-0.5 sm:hover:border-slate-300/80 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#3182f6]/10 dark:border-l-sky-400/50 dark:sm:hover:border-white/15 ${isExpanded ? 'border-[#d7e4fb] border-l-[#5b8ef0] bg-[#f8fbff] shadow-[0_16px_28px_-24px_rgba(49,130,246,0.28)] dark:border-sky-400/15 dark:border-l-sky-300 dark:bg-slate-950/70' : ''}`}
                    >
                      <div className="mb-2 flex min-w-0 items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium text-slate-800 dark:text-zinc-100">{locationLabel}</div>
                          <div className="mt-1 text-xs text-slate-400">{pct}%</div>
                        </div>
                        <div className="flex flex-shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-slate-200/75 bg-slate-50/80 px-2 py-1 text-[11px] font-medium text-slate-500 transition-colors dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
                          <span>{t('entryCount', { count: locationEntryCounts[loc] || 0 })}</span>
                          <ChevronDownIcon className={`h-3.5 w-3.5 transition-transform ${isExpanded ? 'rotate-180 text-[#5b8ef0]' : 'text-slate-400 dark:text-slate-500'}`} />
                        </div>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200/80 dark:bg-white/10">
                        <div className="h-full rounded-full bg-[#5b8ef0]" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="mt-3 text-right text-sm font-semibold text-slate-900 dark:text-zinc-50">{formatAmount(amt, cur)}</div>
                    </button>

                    {isExpanded && (
                      <div className="min-w-0 overflow-hidden rounded-[20px] border border-[#d7e4fb] bg-slate-50/90 px-3 py-3 shadow-[0_12px_22px_-24px_rgba(49,130,246,0.35)] sm:ml-3 dark:border-sky-400/15 dark:bg-slate-950/55">
                        <div className="mb-3 flex min-w-0 items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="app-kicker mb-1 truncate">{locationLabel}</div>
                            <div className="truncate text-sm font-medium text-slate-800 dark:text-zinc-100">
                              {t('entryCount', { count: locationEntries.length })}
                            </div>
                          </div>
                          <button
                            onClick={() => setExpandedLocation(null)}
                            className="text-xs font-medium text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-zinc-200"
                          >
                            {t('close')}
                          </button>
                        </div>

                        {locationEntries.length === 0 ? (
                          <div className="app-panel-soft py-5 text-center text-sm text-slate-400">{t('noEntriesForLocation')}</div>
                        ) : (
                          <div className="max-h-[400px] min-w-0 space-y-2 overflow-y-auto pr-1">
                            {locationEntries.map(e => {
                              const entryCurrency = getEntryCurrency(e, cur, homeCur)
                              const col = getCategoryColor(e.category, e.type)
                              return (
                                <button
                                  key={e.id}
                                  onClick={() => setEditEntry(e)}
                                  className="app-list-row flex w-full min-w-0 cursor-pointer items-start gap-3 overflow-hidden !rounded-[18px] !px-3 !py-3 text-left transition-all sm:hover:border-slate-300/85 sm:hover:bg-white/92 dark:sm:hover:border-white/15 dark:sm:hover:bg-slate-900/80"
                                >
                                  <div className="mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ background: col }} />
                                  <div className="min-w-0 flex-1">
                                    <div className="flex min-w-0 items-start justify-between gap-3">
                                      <div className="min-w-0 flex-1">
                                        <div className="truncate text-sm font-medium text-slate-800 dark:text-zinc-100">{e.summary}</div>
                                        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
                                          <span>{formatEntryDate(e.date, language)}</span>
                                          <span aria-hidden="true">·</span>
                                          <span className="truncate">{formatLocationLabel(e.location, language)}</span>
                                          {e.venue ? (
                                            <>
                                              <span aria-hidden="true">·</span>
                                              <span className="truncate">{e.venue}</span>
                                            </>
                                          ) : null}
                                        </div>
                                        {e.paymentMethod && <div className="mt-1 truncate text-xs text-slate-400">{e.paymentMethod}</div>}
                                        {e.remarks && <div className="mt-1 truncate text-xs text-slate-400">{e.remarks}</div>}
                                      </div>
                                      <div className="flex-shrink-0 whitespace-nowrap text-sm font-semibold" style={{ color: col }}>
                                        {e.type === 'income' ? '+' : '-'}{formatAmount(e.amount, entryCurrency)}
                                      </div>
                                    </div>
                                    <div className="mt-2">
                                      <span
                                        className="inline-flex rounded-full px-2.5 py-1 text-xs font-medium"
                                        style={{ background: softenColor(col, 0.18, 0.14), color: col }}
                                      >
                                        {e.category}
                                      </span>
                                    </div>
                                  </div>
                                </button>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          <div className="space-y-3">
            <div className="app-panel p-4 sm:p-5">
              <div className="mb-4">
                <div className="app-kicker mb-2">{t('spendingChart')}</div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-zinc-50">{t('topLocations')}</h3>
              </div>
              <div className="relative w-full" style={{ height: Math.max(180, byLocation.length * 42) }}>
                <canvas ref={locChartRef} />
              </div>
            </div>

            {byLocationRegion.length > 0 && (
              <div className="app-panel border-teal-200/70 p-4 sm:p-5 dark:border-teal-400/20">
                <div className="mb-4">
                  <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-teal-700/80 dark:text-teal-300/80">
                    {t('byRegion')}
                  </div>
                  <h3 className="text-lg font-semibold text-teal-950 dark:text-teal-50">{t('regionLevelLabel')}</h3>
                </div>
                <div className="relative w-full" style={{ height: Math.max(160, byLocationRegion.length * 44) }}>
                  <canvas ref={regionChartRef} />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
