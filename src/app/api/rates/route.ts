import { NextResponse } from 'next/server'

type RateSource = 'market' | 'visa' | 'mastercard'

interface ExchangeRatePair {
  from: string
  to: string
  rate: number
}

const SUPPORTED_CURRENCIES = ['USD', 'KRW', 'EUR', 'GBP', 'JPY', 'CNY', 'CAD', 'AUD', 'SGD', 'HKD', 'THB', 'VND', 'MXN', 'BRL', 'INR']
const MARKET_RATE_URL = 'https://api.frankfurter.dev/v1/latest?from=USD&to=KRW,EUR,GBP,JPY,CNY,CAD,AUD,SGD,HKD,THB,VND,MXN,BRL,INR'

function normalizeRateSource(value: string | null): RateSource {
  if (value === 'visa' || value === 'mastercard') return value
  return 'market'
}

function clampFee(value: string | null) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 0
  return Math.min(Math.max(parsed, 0), 20)
}

function isoDateOffset(days: number) {
  const date = new Date()
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

function visaDateOffset(days: number) {
  const date = new Date()
  date.setUTCDate(date.getUTCDate() + days)
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${month}/${day}/${date.getUTCFullYear()}`
}

async function fetchMarketRates(requestedSource: RateSource = 'market') {
  try {
    const res = await fetch(MARKET_RATE_URL, {
      next: { revalidate: 3600 } // cache for 1 hour on Vercel
    })
    if (!res.ok) throw new Error('Failed')
    const data = await res.json()
    return NextResponse.json({
      ...data,
      source: 'market',
      requestedSource,
      fallback: requestedSource !== 'market',
    })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch rates' }, { status: 500 })
  }
}

async function fetchMastercardPair(from: string, to: string, fee: number): Promise<ExchangeRatePair | null> {
  const dateCandidates = [isoDateOffset(0), isoDateOffset(-1), '0000-00-00']

  for (const fxDate of dateCandidates) {
    try {
      const url = new URL('https://www.mastercard.us/settlement/currencyrate/conversion-rate')
      url.searchParams.set('fxDate', fxDate)
      url.searchParams.set('transCurr', from)
      url.searchParams.set('crdhldBillCurr', to)
      url.searchParams.set('bankFee', String(fee))
      url.searchParams.set('transAmt', '1')
      const res = await fetch(url, {
        headers: {
          accept: 'application/json',
          referer: 'https://www.mastercard.us/en-us/personal/get-support/convert-currency.html',
          'user-agent': 'Mozilla/5.0 MoneyMap/1.0',
        },
        next: { revalidate: 3600 },
      })
      if (!res.ok) continue
      const data = await res.json()
      const rate = Number(data?.data?.conversionRate ?? data?.data?.crdhldBillAmt)
      if (Number.isFinite(rate) && rate > 0) return { from, to, rate }
    } catch {}
  }

  return null
}

async function fetchVisaPair(from: string, to: string, fee: number): Promise<ExchangeRatePair | null> {
  for (const exchangedate of [visaDateOffset(0), visaDateOffset(-1)]) {
    try {
      const url = new URL('https://usa.visa.com/support/consumer/travel-support/exchange-rate-calculator.html')
      url.searchParams.set('amount', '1')
      url.searchParams.set('fromCurr', from)
      url.searchParams.set('toCurr', to)
      url.searchParams.set('fee', String(fee))
      url.searchParams.set('exchangedate', exchangedate)
      url.searchParams.set('submitButton', 'Calculate exchange rate')
      const res = await fetch(url, {
        headers: {
          accept: 'text/html',
          'user-agent': 'Mozilla/5.0 MoneyMap/1.0',
        },
        next: { revalidate: 3600 },
      })
      if (!res.ok) continue
      const html = await res.text()
      const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
      const escapedFrom = from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const escapedTo = to.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const match = text.match(new RegExp(`1\\s+${escapedFrom}\\s*=\\s*([0-9]+(?:\\.[0-9]+)?)\\s+${escapedTo}`, 'i'))
      const rate = match ? Number(match[1]) : NaN
      if (Number.isFinite(rate) && rate > 0) return { from, to, rate }
    } catch {}
  }

  return null
}

async function fetchCardNetworkRates(source: Exclude<RateSource, 'market'>, fee: number) {
  const pairsToFetch = SUPPORTED_CURRENCIES
    .filter(currency => currency !== 'USD')
    .flatMap(currency => [
      ['USD', currency] as const,
      [currency, 'USD'] as const,
    ])

  const results = await Promise.allSettled(
    pairsToFetch.map(([from, to]) =>
      source === 'mastercard'
        ? fetchMastercardPair(from, to, fee)
        : fetchVisaPair(from, to, fee),
    ),
  )

  const pairs = results
    .map(result => result.status === 'fulfilled' ? result.value : null)
    .filter((pair): pair is ExchangeRatePair => !!pair)

  if (pairs.length === 0) return null

  return NextResponse.json({
    pairs,
    source,
    requestedSource: source,
    fallback: false,
    fee,
  })
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const source = normalizeRateSource(searchParams.get('source'))
  const fee = clampFee(searchParams.get('fee'))

  if (source === 'visa' || source === 'mastercard') {
    const cardRates = await fetchCardNetworkRates(source, fee)
    if (cardRates) return cardRates
  }

  return fetchMarketRates(source)
}
