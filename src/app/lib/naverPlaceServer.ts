import {
  extractNaverPlaceId,
  findNaverMapUrlInText,
  looksLikeNaverMapUrl,
  looksLikeKoreanAddress,
  toLocationArea,
  type NaverPlaceInfo,
} from './naverPlace'

const BROWSER_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'

/** Process-local cache so repeat lookups on the same place boom instantly. */
const placeCache = new Map<string, { expires: number; value: NaverPlaceInfo }>()
const CACHE_TTL_MS = 1000 * 60 * 60 * 24

function getCached(placeId: string): NaverPlaceInfo | null {
  const hit = placeCache.get(placeId)
  if (!hit) return null
  if (hit.expires < Date.now()) {
    placeCache.delete(placeId)
    return null
  }
  return hit.value
}

function setCached(value: NaverPlaceInfo) {
  placeCache.set(value.placeId, { value, expires: Date.now() + CACHE_TTL_MS })
}

function unescapeJsonString(value: string): string {
  return value
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex: string) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\')
}

function unescapeHtmlAttribute(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
}

function getMetaContent(html: string, key: string): string {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const tag = html.match(new RegExp(`<meta\\b(?=[^>]*(?:property|name)=["']${escapedKey}["'])[^>]*>`, 'i'))?.[0] || ''
  const content = tag.match(/\bcontent=["']([^"']*)["']/i)?.[1] || ''
  return unescapeHtmlAttribute(content).replace(/[\u0000-\u001f]/g, '').trim()
}

function cleanNaverMetaTitle(value: string): string {
  return value
    .replace(/[\u0000-\u001f]/g, '')
    .replace(/\s*[-:]\s*네이버\s*지도\s*$/u, '')
    .replace(/\s*[-:]\s*네이버지도\s*$/u, '')
    .replace(/\s*[-:]\s*네이버\s*$/u, '')
    .trim()
}

function isUsableNaverAddress(value: string): boolean {
  const cleaned = value.replace(/\s+/g, ' ').trim()
  if (!cleaned) return false
  if (/(?:방문자|블로그)?리뷰\s*\d|별점|저장|공유|네이버\s*플레이스/u.test(cleaned)) return false
  return looksLikeKoreanAddress(cleaned)
}

/** Fast path: pull name + address from a partial HTML buffer without full Apollo parse. */
export function parsePlaceHtml(html: string, placeId?: string): { name: string; address: string } | null {
  const baseKey = placeId ? `PlaceDetailBase:${placeId}` : 'PlaceDetailBase:'
  const baseIdx = html.indexOf(baseKey)
  if (baseIdx >= 0) {
    const slice = html.slice(baseIdx, baseIdx + 1200)
    const nameMatch = slice.match(/"name"\s*:\s*"((?:\\.|[^"\\])*)"/)
    const roadMatch = slice.match(/"roadAddress"\s*:\s*"((?:\\.|[^"\\])*)"/)
    const addrMatch = slice.match(/"address"\s*:\s*"((?:\\.|[^"\\])*)"/)
    const address = unescapeJsonString(roadMatch?.[1] || addrMatch?.[1] || '')
    if (nameMatch?.[1] && isUsableNaverAddress(address)) {
      return {
        name: unescapeJsonString(nameMatch[1]),
        address,
      }
    }
  }

  const pair = html.match(
    /"name"\s*:\s*"((?:\\.|[^"\\])*)"\s*,\s*"reviewSettings"[\s\S]{0,600}?"roadAddress"\s*:\s*"((?:\\.|[^"\\])*)"/,
  )
  if (pair && isUsableNaverAddress(unescapeJsonString(pair[2]))) {
    return {
      name: unescapeJsonString(pair[1]),
      address: unescapeJsonString(pair[2]),
    }
  }

  const ogTitle = getMetaContent(html, 'og:title')
  const ogDescription = getMetaContent(html, 'og:description') || getMetaContent(html, 'twitter:description')
  const road = html.match(/"roadAddress"\s*:\s*"((?:\\.|[^"\\])*)"/)
  const jibun = html.match(/"address"\s*:\s*"((?:\\.|[^"\\])*)"/)
  const name = cleanNaverMetaTitle(ogTitle)
  const jsonAddress = unescapeJsonString(road?.[1] || jibun?.[1] || '')
  if (name && isUsableNaverAddress(jsonAddress)) return { name, address: jsonAddress }
  if (name && isUsableNaverAddress(ogDescription)) return { name, address: ogDescription }
  return null
}

async function resolvePlaceIdFromUrl(url: string): Promise<string | null> {
  const direct = extractNaverPlaceId(url)
  if (direct) return direct

  try {
    // Prefer reading the first redirect — naver.me puts pinId / title in Location.
    const head = await fetch(url, {
      method: 'GET',
      redirect: 'manual',
      headers: {
        'User-Agent': BROWSER_UA,
        'Accept-Language': 'ko-KR,ko;q=0.9',
      },
      signal: AbortSignal.timeout(8000),
    })
    const location = head.headers.get('location') || ''
    if (location) {
      const fromLocation = extractNaverPlaceId(location)
      if (fromLocation) return fromLocation
    }

    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'User-Agent': BROWSER_UA,
        'Accept-Language': 'ko-KR,ko;q=0.9',
      },
      signal: AbortSignal.timeout(8000),
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

async function fetchPlacePageFast(placeId: string): Promise<{ name: string; address: string }> {
  const placeUrl = `https://m.place.naver.com/place/${placeId}`
  const res = await fetch(placeUrl, {
    headers: {
      'User-Agent': BROWSER_UA,
      Accept: 'text/html,application/xhtml+xml',
      'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
    },
    signal: AbortSignal.timeout(10000),
    // Avoid Next data cache for first-byte streaming; we keep our own Map cache.
    cache: 'no-store',
  })

  if (!res.ok) {
    throw new Error(`Place page returned ${res.status}`)
  }

  // Stream and stop as soon as name + roadAddress are in the buffer (~60% of page).
  if (res.body) {
    const reader = res.body.getReader()
    const decoder = new TextDecoder('utf-8')
    let html = ''
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        html += decoder.decode(value, { stream: true })
        const parsed = parsePlaceHtml(html, placeId)
        if (parsed) {
          await reader.cancel().catch(() => {})
          return parsed
        }
        // Safety: if somehow still incomplete past a large buffer, keep going a bit more
        if (html.length > 900_000) break
      }
      html += decoder.decode()
    } catch {
      // fall through to whatever we have
    }

    const parsed = parsePlaceHtml(html, placeId)
    if (parsed) return parsed
    throw new Error('Could not parse place info')
  }

  const html = await res.text()
  const parsed = parsePlaceHtml(html, placeId)
  if (!parsed) throw new Error('Could not parse place info')
  return parsed
}

export async function fetchNaverPlaceById(placeId: string): Promise<NaverPlaceInfo> {
  const cached = getCached(placeId)
  if (cached) return cached

  const parsed = await fetchPlacePageFast(placeId)
  const info: NaverPlaceInfo = {
    placeId,
    name: parsed.name,
    address: parsed.address,
    location: toLocationArea(parsed.address),
  }
  setCached(info)
  return info
}

export async function fetchNaverPlaceFromUrl(urlOrText: string): Promise<NaverPlaceInfo> {
  const input = urlOrText.trim()
  const url = findNaverMapUrlInText(input) || input
  if (!looksLikeNaverMapUrl(url) && !extractNaverPlaceId(url)) {
    throw new Error('Not a Naver Map URL')
  }

  const placeId = await resolvePlaceIdFromUrl(url)
  if (!placeId) {
    throw new Error('Could not find place id')
  }

  return fetchNaverPlaceById(placeId)
}
