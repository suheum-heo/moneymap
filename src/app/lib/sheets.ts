import { google } from 'googleapis'

const SHEET_ID = process.env.GOOGLE_SHEET_ID!
const CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL!

function getPrivateKey() {
  const raw = process.env.GOOGLE_PRIVATE_KEY!
  // If it looks like base64 (no dashes), decode it
  if (!raw.includes('-----')) {
    return Buffer.from(raw, 'base64').toString('utf-8')
  }
  return raw.replace(/\\n/g, '\n')
}

function getAuth() {
  return new google.auth.JWT(CLIENT_EMAIL, undefined, getPrivateKey(), [
    'https://www.googleapis.com/auth/spreadsheets',
  ])
}

export async function getSheets() {
  const auth = getAuth()
  return google.sheets({ version: 'v4', auth })
}

export { SHEET_ID }
