'use client'
export type EntryType = 'expense' | 'income'

export interface Entry {
  id: string
  type: EntryType
  date: string
  time?: string
  summary: string
  venue: string
  location: string
  category: string
  amount: number
  remarks: string
  currency: string
  context: string
  createdAt?: string
  homeAmount?: number
}

export interface Context {
  id: string
  name: string
  currency: string
  homeCurrency: string
  startDate: string
}

export const EXPENSE_CATEGORIES = [
  'Rent','Utilities','Subscription','Food/Drink','Coffee/Snack',
  'Grocery','Essentials','Gift','Shopping','Self-care',
  'Education','Transportation','Laundry','Betting','Other'
]

export const INCOME_CATEGORIES = ['Work','Dividend','Other']

export const CURRENCIES: { code: string; symbol: string; name: string }[] = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'KRW', symbol: '₩', name: 'Korean Won' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CHF', symbol: 'Fr', name: 'Swiss Franc' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
  { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
  { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar' },
  { code: 'SEK', symbol: 'kr', name: 'Swedish Krona' },
  { code: 'NOK', symbol: 'kr', name: 'Norwegian Krone' },
  { code: 'DKK', symbol: 'kr', name: 'Danish Krone' },
  { code: 'MXN', symbol: 'MX$', name: 'Mexican Peso' },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'THB', symbol: '฿', name: 'Thai Baht' },
  { code: 'VND', symbol: '₫', name: 'Vietnamese Dong' },
]

export function normalizeCurrencyCode(code: string): string {
  return code.trim().toUpperCase()
}

export function coerceAmount(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  if (typeof value === 'string') {
    const parsed = Number(value.replace(/,/g, '').trim())
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

export function getCurrencySymbol(code: string): string {
  const normalized = normalizeCurrencyCode(code)
  return CURRENCIES.find(c => c.code === normalized)?.symbol || normalized
}

const NO_DECIMAL_CURRENCIES = new Set(['KRW', 'JPY', 'VND', 'IDR', 'HUF', 'ISK', 'CLP', 'PYG'])

export function usesZeroDecimalCurrency(currency: string): boolean {
  return NO_DECIMAL_CURRENCIES.has(normalizeCurrencyCode(currency))
}

export function formatAmountValue(amount: number | string, currency: string): string {
  const numeric = coerceAmount(amount)
  const noDecimal = usesZeroDecimalCurrency(currency)
  return numeric.toLocaleString(undefined, {
    minimumFractionDigits: noDecimal ? 0 : 2,
    maximumFractionDigits: noDecimal ? 0 : 2,
  })
}

export function formatAmount(amount: number | string, currency: string): string {
  const sym = getCurrencySymbol(currency)
  return `${sym}${formatAmountValue(amount, currency)}`
}

export function normalizeAmountInputValue(value: string, currency: string): string {
  if (!usesZeroDecimalCurrency(currency)) return value
  const trimmed = value.trim()
  if (!trimmed) return value
  if (!/^-?\d+(?:\.0+)?$/.test(trimmed)) return value
  return String(Math.round(Number(trimmed)))
}

export function parseCurrencyInput(value: string, currency: string): number {
  const numeric = coerceAmount(value)
  return usesZeroDecimalCurrency(currency) ? Math.round(numeric) : numeric
}

export function getAmountInputProps(currency: string) {
  const zeroDecimal = usesZeroDecimalCurrency(currency)
  return {
    inputMode: zeroDecimal ? 'numeric' : 'decimal',
    placeholder: zeroDecimal ? '0' : '0.00',
    step: zeroDecimal ? '1' : '0.01',
  } as const
}

export function getEntryCurrency(
  entry: Pick<Entry, 'amount' | 'currency' | 'homeAmount'>,
  contextCurrency: string,
  homeCurrency: string,
): string {
  const raw = normalizeCurrencyCode(entry.currency || contextCurrency)
  const context = normalizeCurrencyCode(contextCurrency)
  const home = normalizeCurrencyCode(homeCurrency || contextCurrency)
  const amount = Math.abs(coerceAmount(entry.amount))

  // Repair legacy entries that were saved with the home-currency fallback
  // before the active context finished loading in the add-entry form.
  if (
    raw === home &&
    raw !== context &&
    entry.homeAmount == null &&
    usesZeroDecimalCurrency(context) &&
    !usesZeroDecimalCurrency(home) &&
    Number.isInteger(amount) &&
    amount >= 1000
  ) {
    return context
  }

  return raw
}

export function shouldRepairLegacyEntryCurrency(
  entry: Pick<Entry, 'amount' | 'currency' | 'homeAmount'>,
  contextCurrency: string,
  homeCurrency: string,
): boolean {
  return getEntryCurrency(entry, contextCurrency, homeCurrency) !== normalizeCurrencyCode(entry.currency || contextCurrency)
}

export const CATEGORY_COLOR_PALETTE = [
  '#5B8EF0', // muted blue
  '#6F7DE8', // indigo
  '#8A79E0', // violet
  '#D472A0', // pink
  '#DE7B64', // coral
  '#D5A04A', // amber
  '#3B9A91', // teal
  '#66AF8E', // mint
  '#79A95E', // green
  '#4FA5C7', // cyan
  '#D8894F', // orange
  '#6B86A6', // slate
  '#7A9EDB', // sky
  '#9A86D4', // lavender
  '#5FA392', // seafoam
  '#B88E63', // sand
] as const

export const INCOME_CATEGORY_COLOR_PALETTE = [
  '#3F8FDE',
  '#4E98CB',
  '#389A84',
  '#58AA8B',
  '#6DA55A',
  '#4AA2BD',
  '#6C93CE',
] as const

export const CATEGORY_NEUTRAL_COLOR = '#7B8794'

export const CATEGORY_COLOR_OVERRIDES: Record<string, string> = {
  other: CATEGORY_NEUTRAL_COLOR,
}

export function normalizeCategoryName(categoryName: string): string {
  return categoryName
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

function resolveCategoryColorKey(categoryName: string): string {
  const normalized = normalizeCategoryName(categoryName)
  return normalized === 'necessities' ? 'essentials' : normalized
}

function hashCategoryName(categoryName: string): number {
  let hash = 0
  for (const char of categoryName) {
    hash = (hash * 31 + (char.codePointAt(0) || 0)) >>> 0
  }
  return hash
}

export function getCategoryColor(categoryName: string, type: EntryType = 'expense'): string {
  const key = resolveCategoryColorKey(categoryName)
  if (!key) return CATEGORY_NEUTRAL_COLOR

  const override = CATEGORY_COLOR_OVERRIDES[key]
  if (override) return override

  const palette = type === 'income' ? INCOME_CATEGORY_COLOR_PALETTE : CATEGORY_COLOR_PALETTE
  return palette[hashCategoryName(key) % palette.length]
}

export function hexToRgba(hex: string, alpha: number): string {
  const raw = hex.replace('#', '')
  if (raw.length !== 3 && raw.length !== 6) return hex
  const full = raw.length === 3 ? raw.split('').map(char => char + char).join('') : raw
  const [r, g, b] = [0, 2, 4].map(index => parseInt(full.slice(index, index + 2), 16))
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export function getCategoryBadgeStyle(categoryName: string, type: EntryType = 'expense', alpha = 0.14) {
  const color = getCategoryColor(categoryName, type)
  return {
    color,
    backgroundColor: hexToRgba(color, alpha),
  } as const
}

function parseTimeForSort(value?: string): number | null {
  if (!value) return null
  const match = value.trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/)
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  const seconds = Number(match[3] || '0')
  if (
    !Number.isFinite(hours) ||
    !Number.isFinite(minutes) ||
    !Number.isFinite(seconds) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59 ||
    seconds < 0 ||
    seconds > 59
  ) {
    return null
  }
  return hours * 3600 + minutes * 60 + seconds
}

function parseTimestampForSort(value?: string): number | null {
  if (!value) return null
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) ? parsed : null
}

function compareNullableDesc(a: number | null, b: number | null): number {
  if (a !== null && b !== null) return b - a
  if (a !== null) return -1
  if (b !== null) return 1
  return 0
}

export function sortEntriesForDisplay(entries: Entry[]): Entry[] {
  return entries
    .map((entry, index) => ({ entry, index }))
    .sort((a, b) => {
      const dateComparison = b.entry.date.localeCompare(a.entry.date)
      if (dateComparison !== 0) return dateComparison

      const timeComparison = compareNullableDesc(
        parseTimeForSort(a.entry.time),
        parseTimeForSort(b.entry.time),
      )
      if (timeComparison !== 0) return timeComparison

      const createdAtComparison = compareNullableDesc(
        parseTimestampForSort(a.entry.createdAt),
        parseTimestampForSort(b.entry.createdAt),
      )
      if (createdAtComparison !== 0) return createdAtComparison

      const idComparison = String(b.entry.id).localeCompare(String(a.entry.id), undefined, {
        numeric: true,
        sensitivity: 'base',
      })
      if (idComparison !== 0) return idComparison

      return a.index - b.index
    })
    .map(({ entry }) => entry)
}

export const DEFAULT_CONTEXTS: Context[] = [
  { id: 'madison', name: 'UW-Madison 25-26', currency: 'USD', homeCurrency: 'USD', startDate: '2025-08' },
  { id: 'korea', name: 'Korea', currency: 'KRW', homeCurrency: 'KRW', startDate: '2026-01' },
]
