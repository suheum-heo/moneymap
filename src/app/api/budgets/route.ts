import { NextResponse } from 'next/server'
import { getSheets, SHEET_ID } from '../../lib/sheets'

export interface Budget {
  context: string
  category: string
  amount: number
}

export async function GET() {
  try {
    const sheets = await getSheets()
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: 'Budgets!A2:C',
    })
    const rows = res.data.values || []
    const budgets: Budget[] = rows
      .filter(r => r[0] && r[1] && r[2])
      .map(r => ({
        context: r[0],
        category: r[1],
        amount: parseFloat(r[2]) || 0,
      }))
    return NextResponse.json(budgets)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const { context, category, amount }: Budget = await req.json()
    const sheets = await getSheets()

    // Check if this context+category already exists and update it
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: 'Budgets!A:C',
    })
    const rows = res.data.values || []
    const rowIndex = rows.findIndex(r => r[0] === context && r[1] === category)

    if (rowIndex !== -1) {
      // Update existing
      await sheets.spreadsheets.values.update({
        spreadsheetId: SHEET_ID,
        range: `Budgets!A${rowIndex + 1}:C${rowIndex + 1}`,
        valueInputOption: 'RAW',
        requestBody: { values: [[context, category, amount]] },
      })
    } else {
      // Append new
      await sheets.spreadsheets.values.append({
        spreadsheetId: SHEET_ID,
        range: 'Budgets!A:C',
        valueInputOption: 'RAW',
        requestBody: { values: [[context, category, amount]] },
      })
    }
    return NextResponse.json({ success: true })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
