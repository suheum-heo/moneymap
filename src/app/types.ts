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
}

export const EXPENSE_CATEGORIES = [
  'Rent','Utilities','Subscription','Food/Drink','Coffee/Snack',
  'Grocery','Necessities','Gift','Shopping','Self-care',
  'Education','Transportation','Laundry','Betting','Other'
]

export const INCOME_CATEGORIES = ['Work','Dividend','Other']

export const MAJOR_CURRENCIES = [
  'USD','KRW','EUR','GBP','JPY','CAD','AUD','CHF','CNY','HKD',
  'SGD','NZD','SEK','NOK','DKK','MXN','BRL','INR','THB','VND'
]

export const CAT_COLORS: Record<string, string> = {
  Rent:'#378ADD', Utilities:'#3B6D11', Subscription:'#534AB7',
  'Food/Drink':'#D85A30', 'Coffee/Snack':'#BA7517', Grocery:'#1D9E75',
  Necessities:'#888780', Gift:'#D4537E', Shopping:'#7F77DD',
  'Self-care':'#0F6E56', Education:'#185FA5', Transportation:'#639922',
  Laundry:'#5F5E5A', Betting:'#E24B4A', Work:'#3B6D11', Dividend:'#1D9E75', Other:'#888780'
}
