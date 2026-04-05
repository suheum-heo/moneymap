import { NextResponse } from 'next/server'
import { getSheets, SHEET_ID } from '../../lib/sheets'
import { Entry } from '../../types'

export async function GET() {
  try {
    const sheets = await getSheets()
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: 'Entries!A2:K',
    })
    const rows = res.data.values || []
    const entries: Entry[] = rows
      .filter(r => r[0])
      .map(r => ({
        id: r[0] || '',
        type: (r[1] as 'expense' | 'income') || 'expense',
        date: r[2] || '',
        summary: r[3] || '',
        venue: r[4] || '',
        location: r[5] || '',
        category: r[6] || '',
        amount: parseFloat(r[7]) || 0,
        remarks: r[8] || '',
        currency: r[9] || 'USD',
        context: r[10] || 'Madison',
      }))
    return NextResponse.json(entries)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const entry: Entry = await req.json()
    const sheets = await getSheets()
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: 'Entries!A:K',
      valueInputOption: 'RAW',
      requestBody: {
        values: [[
          entry.id, entry.type, entry.date, entry.summary,
          entry.venue, entry.location, entry.category,
          entry.amount, entry.remarks,
          entry.currency || 'USD',
          entry.context || 'Madison',
        ]],
      },
    })
    return NextResponse.json({ success: true })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
