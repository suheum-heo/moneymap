import { NextResponse } from 'next/server'
import { getSheets, SHEET_ID } from '../../../lib/sheets'
import { RecurringItem } from '../route'

async function findRowIndex(id: string) {
  // id format: rec-{index}-{context}-{label}
  const parts = id.split('-')
  const rowIndex = parseInt(parts[1])
  return isNaN(rowIndex) ? -1 : rowIndex + 1 // +1 for header row
}

async function getSheetId() {
  const sheets = await getSheets()
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID })
  const sheet = meta.data.sheets?.find(s => s.properties?.title === 'Recurring')
  return sheet?.properties?.sheetId ?? 0
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const item: RecurringItem = await req.json()
    const rowIndex = await findRowIndex(params.id)
    if (rowIndex === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const sheets = await getSheets()
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `Recurring!A${rowIndex + 1}:G${rowIndex + 1}`,
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

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const rowIndex = await findRowIndex(params.id)
    if (rowIndex === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const sheetId = await getSheetId()
    const sheets = await getSheets()
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: {
        requests: [{
          deleteDimension: {
            range: { sheetId, dimension: 'ROWS', startIndex: rowIndex, endIndex: rowIndex + 1 },
          },
        }],
      },
    })
    return NextResponse.json({ success: true })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
