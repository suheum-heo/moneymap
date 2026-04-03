import { NextResponse } from 'next/server'
import { getSheets, SHEET_ID } from '../../../lib/sheets'

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    const sheets = await getSheets()

    // Find the row with this id
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: 'Entries!A:A',
    })
    const rows = res.data.values || []
    const rowIndex = rows.findIndex(r => r[0] === id)
    if (rowIndex === -1) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
    }

    // Get sheet id (gid)
    const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID })
    const sheet = meta.data.sheets?.find(s => s.properties?.title === 'Entries')
    const sheetId = sheet?.properties?.sheetId ?? 0

    // Delete the row
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: {
        requests: [{
          deleteDimension: {
            range: {
              sheetId,
              dimension: 'ROWS',
              startIndex: rowIndex,
              endIndex: rowIndex + 1,
            },
          },
        }],
      },
    })
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to delete entry' }, { status: 500 })
  }
}
