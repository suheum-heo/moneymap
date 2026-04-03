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
}

export const EXPENSE_CATEGORIES = [
  'Rent','Utilities','Subscription','Food/Drink','Coffee/Snack',
  'Grocery','Necessities','Gift','Shopping','Self-care',
  'Education','Transportation','Laundry','Betting','Other'
]

export const INCOME_CATEGORIES = ['Work','Dividend','Other']

export const CAT_COLORS: Record<string, string> = {
  Rent:'#378ADD', Utilities:'#3B6D11', Subscription:'#534AB7',
  'Food/Drink':'#D85A30', 'Coffee/Snack':'#BA7517', Grocery:'#1D9E75',
  Necessities:'#888780', Gift:'#D4537E', Shopping:'#7F77DD',
  'Self-care':'#0F6E56', Education:'#185FA5', Transportation:'#639922',
  Laundry:'#5F5E5A', Betting:'#E24B4A', Work:'#3B6D11', Dividend:'#1D9E75', Other:'#888780'
}

export const SEED: Entry[] = [
  {id:'s1',type:'expense',date:'2026-02-01',summary:'February Rent',venue:'',location:'',category:'Rent',amount:899.50,remarks:''},
  {id:'s2',type:'expense',date:'2026-02-01',summary:'February Water',venue:'',location:'',category:'Utilities',amount:12.00,remarks:''},
  {id:'s3',type:'expense',date:'2026-02-01',summary:'iCloud',venue:'',location:'',category:'Subscription',amount:9.99,remarks:'Apple'},
  {id:'s4',type:'expense',date:'2026-02-02',summary:'Dishwasher Detergent',venue:'',location:'',category:'Necessities',amount:3.47,remarks:'Amazon'},
  {id:'s5',type:'expense',date:'2026-02-07',summary:'YouTube Premium',venue:'',location:'',category:'Subscription',amount:9.09,remarks:'Google'},
  {id:'s6',type:'expense',date:'2026-02-07',summary:'Bday cake for 서영',venue:'Fresh Madison Market',location:'Madison, WI',category:'Gift',amount:7.33,remarks:''},
  {id:'s7',type:'expense',date:'2026-02-07',summary:'Drinking w/ 02s',venue:'',location:'',category:'Food/Drink',amount:30.92,remarks:''},
  {id:'s8',type:'expense',date:'2026-02-08',summary:'Pizza for Super Bowl',venue:'',location:'',category:'Food/Drink',amount:7.00,remarks:'Grubhub'},
  {id:'s9',type:'expense',date:'2026-02-10',summary:"형균's bday gift - Starbucks gift card",venue:'',location:'',category:'Gift',amount:15.00,remarks:''},
  {id:'s10',type:'expense',date:'2026-02-10',summary:'Lost a bet - Tottenham lost against Newcastle',venue:'',location:'',category:'Betting',amount:5.00,remarks:''},
  {id:'s11',type:'expense',date:'2026-02-10',summary:'Kleenex Tissue',venue:'',location:'',category:'Necessities',amount:6.16,remarks:'Amazon'},
  {id:'s12',type:'expense',date:'2026-02-11',summary:'Dec.15 - Jan.15 Electricity',venue:'',location:'',category:'Utilities',amount:59.56,remarks:''},
  {id:'s13',type:'expense',date:'2026-02-11',summary:'Paper Towels',venue:'',location:'',category:'Necessities',amount:3.96,remarks:'Amazon'},
  {id:'s14',type:'expense',date:'2026-02-12',summary:'Chipotle before CS577 Quiz',venue:'Chipotle Mexican Grill',location:'Madison, WI',category:'Food/Drink',amount:10.60,remarks:''},
  {id:'s15',type:'expense',date:'2026-02-12',summary:'Adding Funds to Laundry',venue:'',location:'',category:'Laundry',amount:25.00,remarks:'PayRange'},
  {id:'s16',type:'expense',date:'2026-02-13',summary:'Nitty Gritty w/ 서영, 찬희형',venue:'Nitty Gritty-Madison',location:'Madison, WI',category:'Food/Drink',amount:14.72,remarks:'10% Tip'},
  {id:'s17',type:'expense',date:'2026-02-13',summary:'Izakaya w/ 서영석, 찬희형',venue:'Izakaya Kuroyama',location:'Madison, WI',category:'Food/Drink',amount:20.54,remarks:''},
  {id:'s18',type:'expense',date:'2026-02-14',summary:'OpenAI API',venue:'',location:'',category:'Education',amount:5.00,remarks:''},
  {id:'s19',type:'expense',date:'2026-02-16',summary:'Jan.15 - Feb.14 Internet',venue:'',location:'',category:'Utilities',amount:24.99,remarks:'Spectrum'},
  {id:'s20',type:'expense',date:'2026-02-17',summary:'Haircut',venue:'Hair Forum',location:'Madison, WI',category:'Self-care',amount:35.00,remarks:''},
  {id:'s21',type:'expense',date:'2026-02-17',summary:'6 Bottles of Diet Coke',venue:'',location:'',category:'Grocery',amount:4.50,remarks:'Amazon'},
  {id:'s22',type:'expense',date:'2026-02-19',summary:'Catching up with Heaven',venue:'Colectivo Coffee State St.',location:'Madison, WI',category:'Coffee/Snack',amount:4.22,remarks:''},
  {id:'s23',type:'expense',date:'2026-02-21',summary:"Canes for Sonny vs Messi",venue:"Raising Cane's Chicken Fingers",location:'Madison, WI',category:'Food/Drink',amount:12.12,remarks:''},
  {id:'s24',type:'expense',date:'2026-02-22',summary:'Apple Watch Strap',venue:'',location:'',category:'Shopping',amount:15.99,remarks:'Amazon'},
  {id:'s25',type:'expense',date:'2026-02-25',summary:'Uber to CS577 discussion :( never again',venue:'',location:'Madison, WI',category:'Transportation',amount:5.81,remarks:'Uber'},
  {id:'s26',type:'expense',date:'2026-02-25',summary:"Yogurt (this money could've been saved)",venue:'Bean & Creamery',location:'Madison, WI',category:'Coffee/Snack',amount:5.19,remarks:'Wiscard'},
  {id:'s27',type:'income',date:'2026-02-05',summary:'Work',venue:'',location:'',category:'Work',amount:86.25,remarks:''},
  {id:'s28',type:'income',date:'2026-02-19',summary:'Work',venue:'',location:'',category:'Work',amount:213.75,remarks:''},
  {id:'s29',type:'income',date:'2026-02-28',summary:'Dividend',venue:'',location:'',category:'Dividend',amount:40.54,remarks:"from UWCU Investor's Indexed Money Mrkt"},
]
