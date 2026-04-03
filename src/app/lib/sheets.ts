import { google } from 'googleapis'

const SHEET_ID = process.env.GOOGLE_SHEET_ID!
const CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL!
const PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY!.replace(/\\n/g, '\n')

function getAuth() {
  return new google.auth.JWT(CLIENT_EMAIL, undefined, PRIVATE_KEY, [
    'https://www.googleapis.com/auth/spreadsheets',
  ])
}

export async function getSheets() {
  const auth = getAuth()
  return google.sheets({ version: 'v4', auth })
}

export { SHEET_ID }
