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
      range: 'Recurring!A2:H',
    })
    const rows = res.data.values || []
    const items: RecurringItem[] = rows
      .filter(r => r[0])
      .map(r => ({
        id: r[0] || '',
        context: r[1] || '',
        label: r[2] || '',
        category: r[3] || '',
        amount: parseFloat(r[4]) || 0,
        currency: r[5] || 'USD',
        summary: r[6] || '',
        remarks: r[7] || '',
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
      range: 'Recurring!A:H',
      valueInputOption: 'RAW',
      requestBody: {
        values: [[item.id, item.context, item.label, item.category, item.amount, item.currency, item.summary, item.remarks]],
      },
    })
    return NextResponse.json({ success: true })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
