import { NextResponse } from 'next/server'
import { getSheets, SHEET_ID } from '../../../lib/sheets'
import { Entry } from '../../../types'

async function findRowIndex(id: string) {
  const sheets = await getSheets()
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: 'Entries!A:A',
  })
  const rows = res.data.values || []
  return rows.findIndex(r => r[0] === id)
}

async function getSheetId() {
  const sheets = await getSheets()
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID })
  const sheet = meta.data.sheets?.find(s => s.properties?.title === 'Entries')
  return sheet?.properties?.sheetId ?? 0
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const rowIndex = await findRowIndex(params.id)
    if (rowIndex === -1) return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
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

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const entry: Entry = await req.json()
    const rowIndex = await findRowIndex(params.id)
    if (rowIndex === -1) return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
    const sheets = await getSheets()
    // rowIndex is 0-based, but row 1 is header, so actual sheet row = rowIndex + 1
    const range = `Entries!A${rowIndex + 1}:K${rowIndex + 1}`
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range,
      valueInputOption: 'RAW',
      requestBody: {
        values: [[
          entry.id, entry.type, entry.date, entry.summary,
          entry.venue, entry.location, entry.category,
          entry.amount, entry.remarks,
          entry.currency || 'USD',
          entry.context || 'madison',
        ]],
      },
    })
    return NextResponse.json({ success: true })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
