export interface NaverPlaceInfo {
  name: string
  location: string
  address: string
  placeId: string
}

export interface NaverShareParse {
  name?: string
  address?: string
  url: string
}

const PLACE_ID_RE =
  /(?:map\.naver\.com\/(?:p|v5)\/entry\/place\/|m\.place\.naver\.com\/place\/|pcmap\.place\.naver\.com\/place\/|place\.naver\.com\/place\/)(\d+)/i

const NAVER_MAP_HOST_RE =
  /(?:^|\.)(?:map\.naver\.com|m\.place\.naver\.com|pcmap\.place\.naver\.com|place\.naver\.com|naver\.me)$/i

const NAVER_URL_IN_TEXT_RE =
  /https?:\/\/(?:naver\.me\/[^\s<>"']+|(?:(?:m\.)?map|m\.place|pcmap\.place|place)\.naver\.com\/[^\s<>"']+)/i

const SHARE_HEADER_RE = /\[?\s*네이버\s*지도\s*\]?/i
const KOREAN_REGION_PATTERN =
  '(?:서울|부산|대구|인천|광주|대전|울산|세종|제주|경기|강원|충북|충남|전북|전남|경북|경남|서울특별시|부산광역시|대구광역시|인천광역시|광주광역시|대전광역시|울산광역시|세종특별자치시|제주특별자치도|경기도|강원도|충청북도|충청남도|전라북도|전라남도|경상북도|경상남도)'
const KOREAN_REGION_RE = new RegExp(`^${KOREAN_REGION_PATTERN}`)

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

/** Find a Naver Map / naver.me URL anywhere inside pasted text. */
export function findNaverMapUrlInText(text: string): string | null {
  const match = text.match(NAVER_URL_IN_TEXT_RE)
  if (!match) return null
  return match[0].replace(/[),.;\]}]+$/g, '')
}

export function containsNaverMapLink(text: string): boolean {
  return !!findNaverMapUrlInText(text)
}

export function extractNaverPlaceId(text: string): string | null {
  const trimmed = text.trim()
  const match = trimmed.match(PLACE_ID_RE)
  if (match?.[1]) return match[1]

  // Short-link redirect targets sometimes use pinId=
  const pin = trimmed.match(/[?&]pinId=(\d+)/i)
  if (pin?.[1]) return pin[1]

  try {
    const url = new URL(trimmed)
    const fromQuery = url.searchParams.get('placeId') || url.searchParams.get('id') || url.searchParams.get('pinId')
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

function normalizeKoreanAddressCandidate(line: string): string {
  return line
    .replace(SHARE_HEADER_RE, '')
    .replace(/^\[[^\]]+\]\s*/, '')
    .replace(/^(주소|도로명|지번|위치)\s*[:：]?\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function looksLikeKoreanAddress(line: string): boolean {
  const candidate = normalizeKoreanAddressCandidate(line)
  return KOREAN_REGION_RE.test(candidate)
    || /(특별시|광역시|특별자치시|특별자치도|도)\s/.test(candidate)
    || /(?:시|군|구)\s+[^\s]+(?:로|길|대로|번길)(?:\s|\d)/.test(candidate)
}

/**
 * Parse Naver Map app share text, e.g.
 * [네이버지도]
 * 학동역고시원 비더스테이 강남학동
 * 서울 강남구 학동로38길 38 2~5F
 * https://naver.me/FiPfV7SH
 */
export function parseNaverShareText(text: string): NaverShareParse | null {
  const url = findNaverMapUrlInText(text)
  if (!url) return null

  const lines = text
    .split(/\r?\n/)
    .map(line => line.replace(SHARE_HEADER_RE, '').trim())
    .filter(Boolean)
    .filter(line => !NAVER_URL_IN_TEXT_RE.test(line))

  if (lines.length >= 2) {
    // Prefer address-looking line for location; the other is the venue name.
    const addressIdx = lines.findIndex(looksLikeKoreanAddress)
    if (addressIdx >= 0) {
      const address = normalizeKoreanAddressCandidate(lines[addressIdx])
      const name = lines.find((line, i) => i !== addressIdx && !looksLikeKoreanAddress(line))
        || lines.find((_, i) => i !== addressIdx)
        || lines[0]
      return { name, address, url }
    }
    return { name: lines[0], address: lines[1], url }
  }

  if (lines.length === 1) {
    return { name: lines[0], url }
  }

  // Newlines may be collapsed inside <input> — try single-line share format.
  const collapsed = text.replace(/\s+/g, ' ').trim()
  const withoutUrl = collapsed.replace(NAVER_URL_IN_TEXT_RE, '').replace(SHARE_HEADER_RE, '').trim()
  if (!withoutUrl) return { url }

  const leadingAddress = withoutUrl.match(new RegExp(
    `^((?:(?:주소|도로명|지번|위치)\\s*[:：]?\\s*)?${KOREAN_REGION_PATTERN}\\s+[^\\s]+\\s+(?:[^\\s]+\\s+)?[^\\s]*(?:로|길|대로|번길)\\s*\\d+(?:-\\d+)?(?:\\s+[A-Za-z0-9가-힣~.-]+)?)\\s+(.+)$`,
  ))
  if (leadingAddress) {
    const address = normalizeKoreanAddressCandidate(leadingAddress[1])
    const name = leadingAddress[2].trim()
    if (looksLikeKoreanAddress(address) && name) return { name, address, url }
  }

  // "... 서울 강남구 ..."
  const addrMatch = withoutUrl.match(new RegExp(`(${KOREAN_REGION_PATTERN}[^\\n]*)$`))
  if (addrMatch) {
    const address = normalizeKoreanAddressCandidate(addrMatch[1])
    const name = withoutUrl.slice(0, addrMatch.index).trim()
    if (name) return { name, address, url }
    return { address, url }
  }

  return { url }
}
