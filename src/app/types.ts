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

function getLocaleNumberSeparators(locale: string) {
  const formatter = new Intl.NumberFormat(locale)
  const parts = formatter.formatToParts(12345.6)
  const group = parts.find(part => part.type === 'group')?.value || ','
  const decimal = parts.find(part => part.type === 'decimal')?.value || '.'
  return { group, decimal }
}

export function parseLocalizedAmount(value: string, currency: string): number {
  const normalizedCurrency = normalizeCurrencyCode(currency)
  const trimmed = value
    .trim()
    .replace(/[\s\u00A0\u202F]/g, '')
    .replace(/['’]/g, '')

  if (!trimmed) return Number.NaN

  const signMatch = trimmed.match(/^[+-]/)
  const sign = signMatch?.[0] || ''
  const unsigned = sign ? trimmed.slice(1) : trimmed
  if (!unsigned || /[^0-9,.-]/.test(unsigned)) return Number.NaN

  if (usesZeroDecimalCurrency(normalizedCurrency)) {
    const integerLike = `${sign}${unsigned.replace(/[.,]/g, '')}`
    if (!/^[+-]?\d+$/.test(integerLike)) return Number.NaN
    const parsedInteger = Number(integerLike)
    return Number.isFinite(parsedInteger) ? parsedInteger : Number.NaN
  }

  const locale = getCurrencyLocale(normalizedCurrency)
  const { group, decimal } = getLocaleNumberSeparators(locale)
  const hasDot = unsigned.includes('.')
  const hasComma = unsigned.includes(',')

  let decimalSeparator: '.' | ',' | null = null

  if (hasDot && hasComma) {
    decimalSeparator = unsigned.lastIndexOf('.') > unsigned.lastIndexOf(',') ? '.' : ','
  } else {
    const separator = hasDot ? '.' : hasComma ? ',' : null
    if (separator) {
      const parts = unsigned.split(separator)
      const fractionLength = parts[parts.length - 1]?.length ?? 0
      const localeGroupSeparator = group === '.' || group === ',' ? group : null
      const localeDecimalSeparator = decimal === '.' || decimal === ',' ? decimal : null

      if (fractionLength === 0) return Number.NaN

      if (parts.length === 2) {
        if (fractionLength <= 2) decimalSeparator = separator
        else if (fractionLength > 3) decimalSeparator = separator
        else if (localeDecimalSeparator === separator && localeGroupSeparator !== separator) decimalSeparator = separator
      } else if (parts.length > 2 && fractionLength <= 2) {
        decimalSeparator = separator
      }
    }
  }

  const normalized = decimalSeparator
    ? `${sign}${unsigned.slice(0, unsigned.lastIndexOf(decimalSeparator)).replace(/[.,]/g, '') || '0'}.${unsigned.slice(unsigned.lastIndexOf(decimalSeparator) + 1).replace(/[.,]/g, '')}`
    : `${sign}${unsigned.replace(/[.,]/g, '')}`

  if (!/^[+-]?\d+(?:\.\d+)?$/.test(normalized)) return Number.NaN

  const parsed = Number(normalized)
  if (!Number.isFinite(parsed)) return Number.NaN

  return usesZeroDecimalCurrency(normalizedCurrency) ? Math.round(parsed) : parsed
}

export function parseCurrencyInput(value: string, currency: string): number {
  return parseLocalizedAmount(value, currency)
}

export function getAmountInputProps(currency: string) {
  const zeroDecimal = usesZeroDecimalCurrency(currency)
  const decimalSeparator = getLocaleNumberSeparators(getCurrencyLocale(currency)).decimal
  return {
    inputMode: zeroDecimal ? 'numeric' : 'decimal',
    placeholder: zeroDecimal ? '0' : `0${decimalSeparator === ',' ? ',' : '.'}00`,
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

type EntryPlaceholderRegion = 'default' | 'USD' | 'KRW' | 'EUR' | 'JPY'

export interface EntryFormPlaceholders {
  summary: string
  venue: string
  location: string
  remarks: string
}

const ENTRY_FORM_PLACEHOLDER_SETS: Record<string, {
  expense: Record<EntryPlaceholderRegion, EntryFormPlaceholders>
  income: EntryFormPlaceholders
}> = {
  en: {
    expense: {
      default: { summary: 'e.g. lunch', venue: 'e.g. cafe', location: 'e.g. city center', remarks: 'e.g. card, takeaway…' },
      USD: { summary: 'e.g. Chipotle before class', venue: 'e.g. Chipotle', location: 'e.g. Madison, WI', remarks: 'e.g. Uber, Amazon…' },
      KRW: { summary: 'e.g. lunch', venue: 'e.g. Daiso', location: 'e.g. Seoul, Korea', remarks: 'e.g. Kakao T, Coupang…' },
      EUR: { summary: 'e.g. coffee', venue: 'e.g. cafe', location: 'e.g. Paris, France', remarks: 'e.g. metro ticket, Monoprix…' },
      JPY: { summary: 'e.g. ramen', venue: 'e.g. convenience store', location: 'e.g. Tokyo, Japan', remarks: 'e.g. Suica, 7-Eleven…' },
    },
    income: { summary: 'e.g. paycheck', venue: 'e.g. employer', location: 'e.g. bank transfer', remarks: 'e.g. bonus, refund…' },
  },
  ko: {
    expense: {
      default: { summary: '예: 점심', venue: '예: 카페', location: '예: 시내', remarks: '예: 카드, 포장…' },
      USD: { summary: '예: 수업 전 Chipotle', venue: '예: Chipotle', location: '예: Madison, WI', remarks: '예: Uber, Amazon…' },
      KRW: { summary: '예: 점심', venue: '예: 카페', location: '예: 서울, 부산', remarks: '예: 다이소, 쿠팡…' },
      EUR: { summary: '예: 커피', venue: '예: 카페', location: '예: 파리, 프랑스', remarks: '예: 지하철 티켓, Monoprix…' },
      JPY: { summary: '예: 라멘', venue: '예: 편의점', location: '예: 도쿄, 일본', remarks: '예: Suica, 7-Eleven…' },
    },
    income: { summary: '예: 월급', venue: '예: 회사', location: '예: 계좌이체', remarks: '예: 보너스, 환급…' },
  },
  ja: {
    expense: {
      default: { summary: '例: 昼ごはん', venue: '例: カフェ', location: '例: 街中', remarks: '例: カード、持ち帰り…' },
      USD: { summary: '例: 授業前のChipotle', venue: '例: Chipotle', location: '例: Madison, WI', remarks: '例: Uber、Amazon…' },
      KRW: { summary: '例: 昼ごはん', venue: '例: ダイソー', location: '例: ソウル、韓国', remarks: '例: Kakao T、Coupang…' },
      EUR: { summary: '例: コーヒー', venue: '例: カフェ', location: '例: パリ、フランス', remarks: '例: 地下鉄チケット、Monoprix…' },
      JPY: { summary: '例: ラーメン', venue: '例: コンビニ', location: '例: 東京、日本', remarks: '例: Suica、7-Eleven…' },
    },
    income: { summary: '例: 給与', venue: '例: 勤務先', location: '例: 銀行振込', remarks: '例: ボーナス、返金…' },
  },
  zh: {
    expense: {
      default: { summary: '例如：午餐', venue: '例如：咖啡店', location: '例如：市中心', remarks: '例如：刷卡、外带…' },
      USD: { summary: '例如：上课前吃 Chipotle', venue: '例如：Chipotle', location: '例如：Madison, WI', remarks: '例如：Uber、Amazon…' },
      KRW: { summary: '例如：午餐', venue: '例如：大创', location: '例如：首尔、釜山', remarks: '例如：Kakao T、Coupang…' },
      EUR: { summary: '例如：咖啡', venue: '例如：咖啡馆', location: '例如：巴黎，法国', remarks: '例如：地铁票、Monoprix…' },
      JPY: { summary: '例如：拉面', venue: '例如：便利店', location: '例如：东京，日本', remarks: '例如：Suica、7-Eleven…' },
    },
    income: { summary: '例如：工资', venue: '例如：公司', location: '例如：银行转账', remarks: '例如：奖金、退款…' },
  },
  es: {
    expense: {
      default: { summary: 'p. ej. almuerzo', venue: 'p. ej. cafetería', location: 'p. ej. centro', remarks: 'p. ej. tarjeta, para llevar…' },
      USD: { summary: 'p. ej. Chipotle antes de clase', venue: 'p. ej. Chipotle', location: 'p. ej. Madison, WI', remarks: 'p. ej. Uber, Amazon…' },
      KRW: { summary: 'p. ej. almuerzo', venue: 'p. ej. Daiso', location: 'p. ej. Seúl, Corea', remarks: 'p. ej. Kakao T, Coupang…' },
      EUR: { summary: 'p. ej. café', venue: 'p. ej. cafetería', location: 'p. ej. París, Francia', remarks: 'p. ej. billete de metro, Monoprix…' },
      JPY: { summary: 'p. ej. ramen', venue: 'p. ej. tienda de conveniencia', location: 'p. ej. Tokio, Japón', remarks: 'p. ej. Suica, 7-Eleven…' },
    },
    income: { summary: 'p. ej. salario', venue: 'p. ej. empresa', location: 'p. ej. transferencia bancaria', remarks: 'p. ej. bono, reembolso…' },
  },
  fr: {
    expense: {
      default: { summary: 'ex. déjeuner', venue: 'ex. café', location: 'ex. centre-ville', remarks: 'ex. carte, à emporter…' },
      USD: { summary: 'ex. Chipotle avant les cours', venue: 'ex. Chipotle', location: 'ex. Madison, WI', remarks: 'ex. Uber, Amazon…' },
      KRW: { summary: 'ex. déjeuner', venue: 'ex. Daiso', location: 'ex. Séoul, Corée', remarks: 'ex. Kakao T, Coupang…' },
      EUR: { summary: 'ex. café', venue: 'ex. café', location: 'ex. Paris, France', remarks: 'ex. ticket de métro, Monoprix…' },
      JPY: { summary: 'ex. ramen', venue: 'ex. supérette', location: 'ex. Tokyo, Japon', remarks: 'ex. Suica, 7-Eleven…' },
    },
    income: { summary: 'ex. salaire', venue: 'ex. employeur', location: 'ex. virement bancaire', remarks: 'ex. prime, remboursement…' },
  },
  de: {
    expense: {
      default: { summary: 'z. B. Mittagessen', venue: 'z. B. Café', location: 'z. B. Innenstadt', remarks: 'z. B. Karte, zum Mitnehmen…' },
      USD: { summary: 'z. B. Chipotle vor der Vorlesung', venue: 'z. B. Chipotle', location: 'z. B. Madison, WI', remarks: 'z. B. Uber, Amazon…' },
      KRW: { summary: 'z. B. Mittagessen', venue: 'z. B. Daiso', location: 'z. B. Seoul, Korea', remarks: 'z. B. Kakao T, Coupang…' },
      EUR: { summary: 'z. B. Kaffee', venue: 'z. B. Café', location: 'z. B. Paris, Frankreich', remarks: 'z. B. Metroticket, Monoprix…' },
      JPY: { summary: 'z. B. Ramen', venue: 'z. B. Konbini', location: 'z. B. Tokio, Japan', remarks: 'z. B. Suica, 7-Eleven…' },
    },
    income: { summary: 'z. B. Gehalt', venue: 'z. B. Arbeitgeber', location: 'z. B. Banküberweisung', remarks: 'z. B. Bonus, Rückerstattung…' },
  },
}

function resolveEntryPlaceholderLanguage(language?: string): string {
  const base = (language || 'en').trim().toLowerCase().split('-')[0]
  return ENTRY_FORM_PLACEHOLDER_SETS[base] ? base : 'en'
}

function resolveEntryPlaceholderRegion(currency?: string): EntryPlaceholderRegion {
  const normalized = normalizeCurrencyCode(currency || 'USD')
  if (normalized === 'USD' || normalized === 'KRW' || normalized === 'EUR' || normalized === 'JPY') return normalized
  return 'default'
}

export function getEntryFormPlaceholders(
  language?: string,
  currency?: string,
  type: EntryType = 'expense',
): EntryFormPlaceholders {
  const locale = resolveEntryPlaceholderLanguage(language)
  const languageSet = ENTRY_FORM_PLACEHOLDER_SETS[locale] || ENTRY_FORM_PLACEHOLDER_SETS.en
  if (type === 'income') return languageSet.income
  const region = resolveEntryPlaceholderRegion(currency)
  return languageSet.expense[region] || languageSet.expense.default
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
