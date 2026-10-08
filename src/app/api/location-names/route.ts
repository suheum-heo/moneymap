import { NextRequest, NextResponse } from 'next/server'
import { resolveLocationNames } from '../../lib/locationNamesServer'

export async function GET(req: NextRequest) {
  const location = req.nextUrl.searchParams.get('location')?.trim() || ''
  if (!location) {
    return NextResponse.json({ error: 'Missing location' }, { status: 400 })
  }
  if (location.length > 200) {
    return NextResponse.json({ error: 'Location too long' }, { status: 400 })
  }

  try {
    const names = await resolveLocationNames(location)
    return NextResponse.json(names, {
      headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800' },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Lookup failed'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
