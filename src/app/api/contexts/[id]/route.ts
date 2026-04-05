import { NextResponse } from 'next/server'
import { getSheets, SHEET_ID } from '../../../lib/sheets'
import { Context } from '../../../types'

async function findRowIndex(id: string) {
  const sheets = await getSheets()
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: 'Contexts!A:A',
  })
  return (res.data.values || []).findIndex(r => r[0] === id)
}

async function getSheetId() {
  const sheets = await getSheets()
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID })
  const sheet = meta.data.sheets?.find(s => s.properties?.title === 'Contexts')
  return sheet?.properties?.sheetId ?? 0
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const ctx: Context = await req.json()
    const rowIndex = await findRowIndex(params.id)
    if (rowIndex === -1) return NextResponse.json({ error: 'Context not found' }, { status: 404 })
    const sheets = await getSheets()
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `Contexts!A${rowIndex + 1}:E${rowIndex + 1}`,
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

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const rowIndex = await findRowIndex(params.id)
    if (rowIndex === -1) return NextResponse.json({ error: 'Context not found' }, { status: 404 })
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
