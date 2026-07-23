export interface NaverPlaceInfo {
  name: string
  location: string
  address: string
  placeId: string
}

const PLACE_ID_RE =
  /(?:map\.naver\.com\/(?:p|v5)\/entry\/place\/|m\.place\.naver\.com\/place\/|pcmap\.place\.naver\.com\/place\/|place\.naver\.com\/place\/)(\d+)/i

const NAVER_MAP_HOST_RE =
  /(?:^|\.)(?:map\.naver\.com|m\.place\.naver\.com|pcmap\.place\.naver\.com|place\.naver\.com|naver\.me)$/i

export function looksLikeNaverMapUrl(text: string): boolean {
  const trimmed = text.trim()
  if (!/^https?:\/\//i.test(trimmed)) return false
  try {
    const host = new URL(trimmed).hostname
    return NAVER_MAP_HOST_RE.test(host)
  } catch {
    return false
  }
}

export function extractNaverPlaceId(text: string): string | null {
  const trimmed = text.trim()
  const match = trimmed.match(PLACE_ID_RE)
  if (match?.[1]) return match[1]

  try {
    const url = new URL(trimmed)
    const fromQuery = url.searchParams.get('placeId') || url.searchParams.get('id')
    if (fromQuery && /^\d+$/.test(fromQuery)) return fromQuery
  } catch {
    // ignore
  }
  return null
}

/** Turn a full Korean address into a short area like "서울 강남구". */
export function toLocationArea(address: string): string {
  const cleaned = address.replace(/,/g, ' ').replace(/\s+/g, ' ').trim()
  if (!cleaned) return ''
  const parts = cleaned.split(' ')
  if (parts.length < 2) return cleaned

  // e.g. 경기도 성남시 분당구 …
  if (parts.length >= 3 && /시$/.test(parts[1]) && /(구|군)$/.test(parts[2])) {
    return `${parts[0]} ${parts[1]} ${parts[2]}`
  }

  // e.g. 서울 강남구 … / 서울특별시 강남구 …
  return `${parts[0]} ${parts[1]}`
}
