import { NextResponse } from 'next/server'
import { getSheets, SHEET_ID } from '../../lib/sheets'

export interface RecurringItem {
  id: string
  context: string
  label: string
  category: string
  amount: number
  currency: string
  summary: string
  remarks: string
}

export async function GET() {
  try {
    const sheets = await getSheets()
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: 'Recurring!A2:G',
    })
    const rows = res.data.values || []
    const items: RecurringItem[] = rows
      .filter(r => r[0])
      .map((r, i) => ({
        id: `rec-${i}-${r[0]}-${r[1]}`,
        context: r[0] || '',
        label: r[1] || '',
        category: r[2] || '',
        amount: parseFloat(r[3]) || 0,
        currency: r[4] || 'USD',
        summary: r[5] || '',
        remarks: r[6] || '',
      }))
    return NextResponse.json(items)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const item: RecurringItem = await req.json()
    const sheets = await getSheets()
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: 'Recurring!A:G',
      valueInputOption: 'RAW',
      requestBody: {
        values: [[item.context, item.label, item.category, item.amount, item.currency, item.summary, item.remarks]],
      },
    })
    return NextResponse.json({ success: true })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
