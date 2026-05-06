import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const res = await fetch('https://api.frankfurter.dev/v1/latest?from=USD&to=KRW,EUR,GBP,JPY,CNY,CAD,AUD,SGD,HKD,THB,VND,MXN,BRL,INR', {
      next: { revalidate: 3600 } // cache for 1 hour on Vercel
    })
    if (!res.ok) throw new Error('Failed')
    const data = await res.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch rates' }, { status: 500 })
  }
}
