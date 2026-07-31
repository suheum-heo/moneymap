import { NextRequest, NextResponse } from 'next/server'
import { containsGoogleMapsLink, findGoogleMapsUrlInText } from '../../lib/googlePlace'
import { fetchGooglePlaceFromUrl } from '../../lib/googlePlaceServer'

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url')?.trim() || ''
  if (!url) {
    return NextResponse.json({ error: 'Missing url' }, { status: 400 })
  }
  if (!containsGoogleMapsLink(url)) {
    return NextResponse.json({ error: 'Not a Google Maps URL' }, { status: 400 })
  }

  try {
    const cleaned = findGoogleMapsUrlInText(url) || url
    const place = await fetchGooglePlaceFromUrl(cleaned)
    return NextResponse.json(place, {
      headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800' },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Lookup failed'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
