import {
  extractNaverPlaceId,
  looksLikeNaverMapUrl,
  toLocationArea,
  type NaverPlaceInfo,
} from './naverPlace'

const BROWSER_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'

function parseApolloPlace(html: string, placeId: string): { name: string; address: string } | null {
  const marker = 'window.__APOLLO_STATE__'
  const idx = html.indexOf(marker)
  if (idx < 0) return null

  const start = html.indexOf('{', idx)
  if (start < 0) return null

  let depth = 0
  let end = -1
  for (let i = start; i < html.length; i++) {
    const ch = html[i]
    if (ch === '{') depth++
    else if (ch === '}') {
      depth--
      if (depth === 0) {
        end = i + 1
        break
      }
    }
  }
  if (end < 0) return null

  try {
    const state = JSON.parse(html.slice(start, end)) as Record<string, unknown>
    const key = `PlaceDetailBase:${placeId}`
    const place = state[key] as { name?: string; roadAddress?: string; address?: string } | undefined
    if (place?.name) {
      return {
        name: place.name,
        address: place.roadAddress || place.address || '',
      }
    }
  } catch {
    // fall through
  }
  return null
}

function unescapeJsonString(value: string): string {
  return value
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex: string) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\')
}

function parseOgAndRegex(html: string): { name: string; address: string } | null {
  const og = html.match(/property="og:title"\s+content="([^"]+)"/i)
  let name = og?.[1]?.replace(/\s*:\s*네이버.*$/u, '').replace(/[\u0000-\u001f]/g, '').trim() || ''

  const road = html.match(/"roadAddress"\s*:\s*"((?:\\.|[^"\\])*)"/)
  const jibun = html.match(/"address"\s*:\s*"((?:\\.|[^"\\])*)"/)
  const address = unescapeJsonString(road?.[1] || jibun?.[1] || '')

  if (!name) {
    const nameMatch = html.match(/"name"\s*:\s*"((?:\\.|[^"\\])*)"[\s\S]{0,240}"roadAddress"/)
    if (nameMatch?.[1]) name = unescapeJsonString(nameMatch[1])
  }

  if (!name) return null
  return { name, address }
}

async function resolvePlaceIdFromUrl(url: string): Promise<string | null> {
  const direct = extractNaverPlaceId(url)
  if (direct) return direct

  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'User-Agent': BROWSER_UA,
        'Accept-Language': 'ko-KR,ko;q=0.9',
      },
      signal: AbortSignal.timeout(10000),
    })
    const fromFinal = extractNaverPlaceId(res.url)
    if (fromFinal) return fromFinal
    const html = await res.text()
    const ogUrl = html.match(/property="og:url"\s+content="([^"]+)"/i)?.[1] || ''
    return extractNaverPlaceId(html) || extractNaverPlaceId(ogUrl)
  } catch {
    return null
  }
}

export async function fetchNaverPlaceFromUrl(urlOrText: string): Promise<NaverPlaceInfo> {
  const input = urlOrText.trim()
  if (!looksLikeNaverMapUrl(input) && !extractNaverPlaceId(input)) {
    throw new Error('Not a Naver Map URL')
  }

  const placeId = await resolvePlaceIdFromUrl(input)
  if (!placeId) {
    throw new Error('Could not find place id')
  }

  const placeUrl = `https://m.place.naver.com/place/${placeId}`
  const res = await fetch(placeUrl, {
    headers: {
      'User-Agent': BROWSER_UA,
      Accept: 'text/html,application/xhtml+xml',
      'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
    },
    signal: AbortSignal.timeout(12000),
    next: { revalidate: 86400 },
  })

  if (!res.ok) {
    throw new Error(`Place page returned ${res.status}`)
  }

  const html = await res.text()
  const parsed = parseApolloPlace(html, placeId) || parseOgAndRegex(html)
  if (!parsed?.name) {
    throw new Error('Could not parse place info')
  }

  return {
    placeId,
    name: parsed.name,
    address: parsed.address,
    location: toLocationArea(parsed.address),
  }
}
