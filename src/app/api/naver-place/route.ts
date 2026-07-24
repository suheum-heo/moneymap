import { NextRequest, NextResponse } from 'next/server'
import {
  containsNaverMapLink,
  extractNaverPlaceId,
  findNaverMapUrlInText,
} from '../../lib/naverPlace'
import { fetchNaverPlaceById, fetchNaverPlaceFromUrl } from '../../lib/naverPlaceServer'

export async function GET(req: NextRequest) {
  const idParam = req.nextUrl.searchParams.get('id')?.trim() || ''
  const url = req.nextUrl.searchParams.get('url')?.trim() || ''

  try {
    if (idParam && /^\d+$/.test(idParam)) {
      const place = await fetchNaverPlaceById(idParam)
      return NextResponse.json(place, {
        headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800' },
      })
    }

    if (!url) {
      return NextResponse.json({ error: 'Missing url or id' }, { status: 400 })
    }
    if (!containsNaverMapLink(url)) {
      return NextResponse.json({ error: 'Not a Naver Map URL' }, { status: 400 })
    }

    const cleaned = findNaverMapUrlInText(url) || url
    const placeId = extractNaverPlaceId(cleaned)
    const place = placeId
      ? await fetchNaverPlaceById(placeId)
      : await fetchNaverPlaceFromUrl(cleaned)

    return NextResponse.json(place, {
      headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800' },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Lookup failed'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
