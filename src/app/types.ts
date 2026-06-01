'use client'
export type EntryType = 'expense' | 'income'

export interface Entry {
  id: string
  type: EntryType
  date: string
  summary: string
  venue: string
  location: string
  category: string
  amount: number
  remarks: string
  currency: string
  context: string
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
  'Grocery','Necessities','Gift','Shopping','Self-care',
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

export function getCurrencySymbol(code: string): string {
  const normalized = normalizeCurrencyCode(code)
  return CURRENCIES.find(c => c.code === normalized)?.symbol || normalized
}

const NO_DECIMAL_CURRENCIES = new Set(['KRW', 'JPY', 'VND', 'IDR', 'HUF', 'ISK', 'CLP', 'PYG'])

export function usesZeroDecimalCurrency(currency: string): boolean {
  return NO_DECIMAL_CURRENCIES.has(normalizeCurrencyCode(currency))
}

export function formatAmountValue(amount: number, currency: string): string {
  const noDecimal = usesZeroDecimalCurrency(currency)
  return amount.toLocaleString(undefined, {
    minimumFractionDigits: noDecimal ? 0 : 2,
    maximumFractionDigits: noDecimal ? 0 : 2,
  })
}

export function formatAmount(amount: number, currency: string): string {
  const sym = getCurrencySymbol(currency)
  return `${sym}${formatAmountValue(amount, currency)}`
}

export const CAT_COLORS: Record<string, string> = {
  Rent:'#378ADD', Utilities:'#3B6D11', Subscription:'#534AB7',
  'Food/Drink':'#D85A30', 'Coffee/Snack':'#BA7517', Grocery:'#1D9E75',
  Necessities:'#888780', Gift:'#D4537E', Shopping:'#7F77DD',
  'Self-care':'#0F6E56', Education:'#185FA5', Transportation:'#639922',
  Laundry:'#5F5E5A', Betting:'#E24B4A', Work:'#3B6D11', Dividend:'#1D9E75', Other:'#888780'
}

export const DEFAULT_CONTEXTS: Context[] = [
  { id: 'madison', name: 'UW-Madison 25-26', currency: 'USD', homeCurrency: 'USD', startDate: '2025-08' },
  { id: 'korea', name: 'Korea', currency: 'KRW', homeCurrency: 'KRW', startDate: '2026-01' },
]
