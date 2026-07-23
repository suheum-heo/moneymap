import { NextRequest, NextResponse } from 'next/server'
import { looksLikeNaverMapUrl } from '../../lib/naverPlace'
import { fetchNaverPlaceFromUrl } from '../../lib/naverPlaceServer'

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url')?.trim() || ''
  if (!url) {
    return NextResponse.json({ error: 'Missing url' }, { status: 400 })
  }
  if (!looksLikeNaverMapUrl(url)) {
    return NextResponse.json({ error: 'Not a Naver Map URL' }, { status: 400 })
  }

  try {
    const place = await fetchNaverPlaceFromUrl(url)
    return NextResponse.json(place, {
      headers: {
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Lookup failed'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
