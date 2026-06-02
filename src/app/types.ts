'use client'
export type EntryType = 'expense' | 'income'
export type EntrySortOrder = 'newest' | 'oldest'

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

type DefaultExpenseCategoryKey =
  | 'food_drink'
  | 'coffee_snack'
  | 'transportation'
  | 'travel'
  | 'essentials'
  | 'shopping'
  | 'health_self_care'
  | 'education'
  | 'subscriptions'
  | 'other'

type DefaultIncomeCategoryKey =
  | 'salary'
  | 'allowance'
  | 'refund'
  | 'other_income'

type DefaultCategoryTranslations = {
  expense: Record<DefaultExpenseCategoryKey, string>
  income: Record<DefaultIncomeCategoryKey, string>
}

const DEFAULT_EXPENSE_CATEGORY_KEYS: DefaultExpenseCategoryKey[] = [
  'food_drink',
  'coffee_snack',
  'transportation',
  'travel',
  'essentials',
  'shopping',
  'health_self_care',
  'education',
  'subscriptions',
  'other',
]

const DEFAULT_INCOME_CATEGORY_KEYS: DefaultIncomeCategoryKey[] = [
  'salary',
  'allowance',
  'refund',
  'other_income',
]

const DEFAULT_CATEGORY_TRANSLATIONS: Record<string, DefaultCategoryTranslations> = {
  en: {
    expense: {
      food_drink: 'Food/Drink',
      coffee_snack: 'Coffee/Snack',
      transportation: 'Transportation',
      travel: 'Travel',
      essentials: 'Essentials',
      shopping: 'Shopping',
      health_self_care: 'Health/Self-care',
      education: 'Education',
      subscriptions: 'Subscriptions',
      other: 'Other',
    },
    income: {
      salary: 'Salary',
      allowance: 'Allowance',
      refund: 'Refund',
      other_income: 'Other Income',
    },
  },
  ko: {
    expense: {
      food_drink: '음식/음료',
      coffee_snack: '커피/간식',
      transportation: '교통',
      travel: '여행',
      essentials: '생필품',
      shopping: '쇼핑',
      health_self_care: '건강/자기관리',
      education: '교육',
      subscriptions: '구독',
      other: '기타',
    },
    income: {
      salary: '급여',
      allowance: '용돈',
      refund: '환불',
      other_income: '기타 수입',
    },
  },
  ja: {
    expense: {
      food_drink: '食事・飲み物',
      coffee_snack: 'コーヒー・軽食',
      transportation: '交通',
      travel: '旅行',
      essentials: '日用品',
      shopping: '買い物',
      health_self_care: '健康・セルフケア',
      education: '教育',
      subscriptions: 'サブスクリプション',
      other: 'その他',
    },
    income: {
      salary: '給与',
      allowance: 'お小遣い',
      refund: '返金',
      other_income: 'その他の収入',
    },
  },
  zh: {
    expense: {
      food_drink: '餐饮',
      coffee_snack: '咖啡/零食',
      transportation: '交通',
      travel: '旅行',
      essentials: '日用品',
      shopping: '购物',
      health_self_care: '健康/自我照护',
      education: '教育',
      subscriptions: '订阅',
      other: '其他',
    },
    income: {
      salary: '工资',
      allowance: '零花钱',
      refund: '退款',
      other_income: '其他收入',
    },
  },
  es: {
    expense: {
      food_drink: 'Comida y bebida',
      coffee_snack: 'Café y snacks',
      transportation: 'Transporte',
      travel: 'Viajes',
      essentials: 'Esenciales',
      shopping: 'Compras',
      health_self_care: 'Salud y autocuidado',
      education: 'Educación',
      subscriptions: 'Suscripciones',
      other: 'Otros',
    },
    income: {
      salary: 'Salario',
      allowance: 'Asignación',
      refund: 'Reembolso',
      other_income: 'Otros ingresos',
    },
  },
  fr: {
    expense: {
      food_drink: 'Alimentation',
      coffee_snack: 'Café & snacks',
      transportation: 'Transport',
      travel: 'Voyages',
      essentials: 'Essentiels',
      shopping: 'Achats',
      health_self_care: 'Santé & soins',
      education: 'Éducation',
      subscriptions: 'Abonnements',
      other: 'Autres',
    },
    income: {
      salary: 'Salaire',
      allowance: 'Allocation',
      refund: 'Remboursement',
      other_income: 'Autres revenus',
    },
  },
  de: {
    expense: {
      food_drink: 'Essen & Trinken',
      coffee_snack: 'Kaffee & Snacks',
      transportation: 'Transport',
      travel: 'Reisen',
      essentials: 'Notwendiges',
      shopping: 'Einkäufe',
      health_self_care: 'Gesundheit & Selbstpflege',
      education: 'Bildung',
      subscriptions: 'Abonnements',
      other: 'Sonstiges',
    },
    income: {
      salary: 'Gehalt',
      allowance: 'Zulage',
      refund: 'Rückerstattung',
      other_income: 'Sonstige Einnahmen',
    },
  },
}

function normalizeCategoryAliasName(categoryName: string): string {
  return categoryName
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

function resolveDefaultCategoryLanguage(language?: string): string {
  const base = (language || 'en').trim().toLowerCase().split('-')[0]
  return DEFAULT_CATEGORY_TRANSLATIONS[base] ? base : 'en'
}

export function getDefaultCategoriesForLanguage(language?: string): { expense: string[]; income: string[] } {
  const locale = resolveDefaultCategoryLanguage(language)
  const labels = DEFAULT_CATEGORY_TRANSLATIONS[locale] || DEFAULT_CATEGORY_TRANSLATIONS.en
  const fallback = DEFAULT_CATEGORY_TRANSLATIONS.en

  return {
    expense: DEFAULT_EXPENSE_CATEGORY_KEYS.map(key => labels.expense[key] || fallback.expense[key]),
    income: DEFAULT_INCOME_CATEGORY_KEYS.map(key => labels.income[key] || fallback.income[key]),
  }
}

export const EXPENSE_CATEGORIES = DEFAULT_EXPENSE_CATEGORY_KEYS.map(
  key => DEFAULT_CATEGORY_TRANSLATIONS.en.expense[key],
)

export const INCOME_CATEGORIES = DEFAULT_INCOME_CATEGORY_KEYS.map(
  key => DEFAULT_CATEGORY_TRANSLATIONS.en.income[key],
)

export function getDefaultCategoryDefinitions(language?: string): Array<{
  id: string
  name: string
  type: EntryType
}> {
  const localized = getDefaultCategoriesForLanguage(language)

  return [
    ...DEFAULT_EXPENSE_CATEGORY_KEYS.map((key, index) => ({
      id: `exp_${key}`,
      name: localized.expense[index],
      type: 'expense' as const,
    })),
    ...DEFAULT_INCOME_CATEGORY_KEYS.map((key, index) => ({
      id: `inc_${key}`,
      name: localized.income[index],
      type: 'income' as const,
    })),
  ]
}

const CATEGORY_CANONICAL_KEY_ALIASES: Record<string, string> = (() => {
  const aliases: Record<string, string> = {
    necessities: 'essentials',
    subscription: 'subscriptions',
    subscriptions: 'subscriptions',
    'self-care': 'health_self_care',
    'health/self-care': 'health_self_care',
  }

  for (const labels of Object.values(DEFAULT_CATEGORY_TRANSLATIONS)) {
    for (const [key, label] of Object.entries(labels.expense)) {
      aliases[normalizeCategoryAliasName(label)] = key
    }
    for (const [key, label] of Object.entries(labels.income)) {
      aliases[normalizeCategoryAliasName(label)] = key
    }
  }

  return aliases
})()

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

const CURRENCY_LOCALE_MAP: Record<string, string> = {
  USD: 'en-US',
  KRW: 'ko-KR',
  EUR: 'de-DE',
  GBP: 'en-GB',
  JPY: 'ja-JP',
  CAD: 'en-CA',
  AUD: 'en-AU',
  CHF: 'de-CH',
  CNY: 'zh-CN',
  HKD: 'zh-HK',
  SGD: 'en-SG',
  NZD: 'en-NZ',
  SEK: 'sv-SE',
  NOK: 'nb-NO',
  DKK: 'da-DK',
  MXN: 'es-MX',
  BRL: 'pt-BR',
  INR: 'en-IN',
  THB: 'th-TH',
  VND: 'vi-VN',
}

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

export function getCurrencyLocale(code: string): string {
  const normalized = normalizeCurrencyCode(code)
  return CURRENCY_LOCALE_MAP[normalized] || 'en-US'
}

const NO_DECIMAL_CURRENCIES = new Set(['KRW', 'JPY', 'VND', 'IDR', 'HUF', 'ISK', 'CLP', 'PYG'])

export function usesZeroDecimalCurrency(currency: string): boolean {
  return NO_DECIMAL_CURRENCIES.has(normalizeCurrencyCode(currency))
}

export function formatAmountValue(amount: number | string, currency: string): string {
  const numeric = coerceAmount(amount)
  const noDecimal = usesZeroDecimalCurrency(currency)
  return new Intl.NumberFormat(getCurrencyLocale(currency), {
    minimumFractionDigits: noDecimal ? 0 : 2,
    maximumFractionDigits: noDecimal ? 0 : 2,
  }).format(numeric)
}

export function formatAmount(amount: number | string, currency: string): string {
  const normalized = normalizeCurrencyCode(currency)
  const numeric = coerceAmount(amount)
  const noDecimal = usesZeroDecimalCurrency(normalized)

  try {
    return new Intl.NumberFormat(getCurrencyLocale(normalized), {
      style: 'currency',
      currency: normalized,
      currencyDisplay: 'symbol',
      minimumFractionDigits: noDecimal ? 0 : 2,
      maximumFractionDigits: noDecimal ? 0 : 2,
    }).format(numeric)
  } catch {
    const sym = getCurrencySymbol(normalized)
    return `${sym}${formatAmountValue(numeric, normalized)}`
  }
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
  return normalizeCategoryAliasName(categoryName)
}

export function isOtherCategoryName(categoryName: string): boolean {
  const canonical = CATEGORY_CANONICAL_KEY_ALIASES[normalizeCategoryName(categoryName)] || normalizeCategoryName(categoryName)
  return canonical === 'other' || canonical === 'other_income'
}

function resolveCategoryColorKey(categoryName: string): string {
  const normalized = normalizeCategoryName(categoryName)
  return CATEGORY_CANONICAL_KEY_ALIASES[normalized] || normalized
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

const UI_LOCALE_MAP: Record<string, string> = {
  en: 'en-US',
  ko: 'ko-KR',
  ja: 'ja-JP',
  zh: 'zh-CN',
  es: 'es-ES',
  fr: 'fr-FR',
  de: 'de-DE',
}

function parseDateOnly(value: string): Date {
  return new Date(`${value}T12:00:00`)
}

function parseMonthKey(value: string): Date {
  return new Date(`${value}-01T12:00:00`)
}

export function getUiLocale(language?: string): string {
  const base = (language || 'en').trim().toLowerCase().split('-')[0]
  return UI_LOCALE_MAP[base] || language || 'en-US'
}

export function formatEntryDate(date: string, language?: string): string {
  return new Intl.DateTimeFormat(getUiLocale(language), {
    month: '2-digit',
    day: '2-digit',
  }).format(parseDateOnly(date))
}

export function formatFullDate(date: string, language?: string): string {
  return new Intl.DateTimeFormat(getUiLocale(language), {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(parseDateOnly(date))
}

export function formatMonthYear(value: string, language?: string): string {
  return new Intl.DateTimeFormat(getUiLocale(language), {
    month: 'long',
    year: 'numeric',
  }).format(parseMonthKey(value))
}

export function formatLocaleTime(value: Date, language?: string): string {
  return new Intl.DateTimeFormat(getUiLocale(language), {
    timeStyle: 'short',
  }).format(value)
}

export function getMonthLabels(language?: string): string[] {
  const formatter = new Intl.DateTimeFormat(getUiLocale(language), { month: 'short' })
  return Array.from({ length: 12 }, (_, index) => formatter.format(new Date(2024, index, 1)))
}

export function getWeekdayLabels(language?: string): string[] {
  const formatter = new Intl.DateTimeFormat(getUiLocale(language), { weekday: 'short' })
  return Array.from({ length: 7 }, (_, index) => formatter.format(new Date(2024, 0, 7 + index)))
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

function compareNullableByDirection(a: number | null, b: number | null, direction: 1 | -1): number {
  if (a !== null && b !== null) return (a - b) * direction
  if (a !== null) return -1
  if (b !== null) return 1
  return 0
}

export function sortEntriesForDisplay(entries: Entry[], sortOrder: EntrySortOrder = 'newest'): Entry[] {
  const direction: 1 | -1 = sortOrder === 'newest' ? -1 : 1
  return entries
    .map((entry, index) => ({ entry, index }))
    .sort((a, b) => {
      const dateComparison = a.entry.date.localeCompare(b.entry.date) * direction
      if (dateComparison !== 0) return dateComparison

      const timeComparison = compareNullableByDirection(
        parseTimeForSort(a.entry.time),
        parseTimeForSort(b.entry.time),
        direction,
      )
      if (timeComparison !== 0) return timeComparison

      const createdAtComparison = compareNullableByDirection(
        parseTimestampForSort(a.entry.createdAt),
        parseTimestampForSort(b.entry.createdAt),
        direction,
      )
      if (createdAtComparison !== 0) return createdAtComparison

      const idComparison = String(a.entry.id).localeCompare(String(b.entry.id), undefined, {
        numeric: true,
        sensitivity: 'base',
      }) * direction
      if (idComparison !== 0) return idComparison

      return a.index - b.index
    })
    .map(({ entry }) => entry)
}

export const DEFAULT_CONTEXTS: Context[] = [
  { id: 'madison', name: 'UW-Madison 25-26', currency: 'USD', homeCurrency: 'USD', startDate: '2025-08' },
  { id: 'korea', name: 'Korea', currency: 'KRW', homeCurrency: 'KRW', startDate: '2026-01' },
]
