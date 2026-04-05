import { NextResponse } from 'next/server'
import { getSheets, SHEET_ID } from '../../lib/sheets'
import { Context } from '../../types'

export async function GET() {
  try {
    const sheets = await getSheets()
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: 'Contexts!A2:E',
    })
    const rows = res.data.values || []
    const contexts: Context[] = rows
      .filter(r => r[0])
      .map(r => ({
        id: r[0] || '',
        name: r[1] || '',
        currency: r[2] || 'USD',
        homeCurrency: r[3] || 'USD',
        startDate: r[4] || '',
      }))
    return NextResponse.json(contexts)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const ctx: Context = await req.json()
    const sheets = await getSheets()
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: 'Contexts!A:E',
      valueInputOption: 'RAW',
      requestBody: {
        values: [[ctx.id, ctx.name, ctx.currency, ctx.homeCurrency, ctx.startDate]],
      },
    })
    return NextResponse.json({ success: true })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
