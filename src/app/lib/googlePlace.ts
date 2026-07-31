export interface GooglePlaceInfo {
  name: string
  location: string
  address: string
  placeId: string
}

export interface GoogleShareParse {
  name?: string
  address?: string
  url: string
}

export interface ParsedGoogleMapsUrl {
  name: string
  lat: number | null
  lng: number | null
  placeId: string
  url: string
}

const GOOGLE_MAP_HOST_RE =
  /(?:^|\.)(?:google\.[a-z.]+|maps\.google\.[a-z.]+|maps\.app\.goo\.gl|goo\.gl)$/i

const GOOGLE_URL_IN_TEXT_RE =
  /https?:\/\/(?:(?:maps\.app\.)?goo\.gl\/[A-Za-z0-9_-]+|maps\.google\.[^\s<>"']+|www\.google\.[^\s<>"']*\/maps[^\s<>"']*|google\.[^\s<>"']*\/maps[^\s<>"']*)/i

export function looksLikeGoogleMapsUrl(text: string): boolean {
  const trimmed = text.trim()
  if (!/^https?:\/\//i.test(trimmed)) return false
  try {
    const url = new URL(trimmed)
    const host = url.hostname
    if (/^(?:maps\.app\.)?goo\.gl$/i.test(host)) return true
    if (/^maps\.google\./i.test(host)) return true
    if (/^(?:www\.)?google\./i.test(host) && url.pathname.includes('/maps')) return true
    return GOOGLE_MAP_HOST_RE.test(host) && (url.pathname.includes('/maps') || /goo\.gl/i.test(host))
  } catch {
    return false
  }
}

export function findGoogleMapsUrlInText(text: string): string | null {
  const match = text.match(GOOGLE_URL_IN_TEXT_RE)
  if (!match) return null
  return match[0].replace(/[),.;\]}]+$/g, '')
}

export function containsGoogleMapsLink(text: string): boolean {
  return !!findGoogleMapsUrlInText(text)
}

function decodePlaceName(raw: string): string {
  try {
    return decodeURIComponent(raw.replace(/\+/g, ' '))
      .replace(/[_]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  } catch {
    return raw.replace(/\+/g, ' ').replace(/\s+/g, ' ').trim()
  }
}

/** Extract place name / coords / ids from a (possibly resolved) Google Maps URL. */
export function parseGoogleMapsUrl(urlText: string): ParsedGoogleMapsUrl {
  const url = urlText.trim()
  let name = ''
  let lat: number | null = null
  let lng: number | null = null
  let placeId = ''

  const placePath = url.match(/\/maps\/place\/([^/@]+)/i)
  if (placePath?.[1] && !/^(?:data|search|dir)$/i.test(placePath[1])) {
    name = decodePlaceName(placePath[1])
  }

  const atCoords = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/)
  if (atCoords) {
    lat = parseFloat(atCoords[1])
    lng = parseFloat(atCoords[2])
  }

  const bangCoords = url.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/)
  if (bangCoords) {
    lat = parseFloat(bangCoords[1])
    lng = parseFloat(bangCoords[2])
  }

  try {
    const parsed = new URL(url)
    const q = parsed.searchParams.get('q') || parsed.searchParams.get('query')
    if (q) {
      const qCoords = q.match(/^(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)$/)
      if (qCoords) {
        lat = parseFloat(qCoords[1])
        lng = parseFloat(qCoords[2])
      } else if (!name && !/^https?:\/\//i.test(q)) {
        name = decodePlaceName(q)
      }
    }
    const cid = parsed.searchParams.get('cid')
    if (cid) placeId = `cid:${cid}`
    const formalPlaceId = parsed.searchParams.get('place_id') || parsed.searchParams.get('query_place_id')
    if (formalPlaceId) placeId = formalPlaceId
  } catch {
    // ignore
  }

  const ftid = url.match(/!1s(0x[0-9a-fA-F]+:0x[0-9a-fA-F]+)/)
  if (ftid?.[1] && !placeId) placeId = ftid[1]

  if (!placeId && lat != null && lng != null) {
    placeId = `geo:${lat.toFixed(5)},${lng.toFixed(5)}`
  }
  if (!placeId && name) {
    placeId = `name:${name.toLowerCase()}`
  }

  return { name, lat, lng, placeId, url }
}

/** US-style short area: "Madison, WI" from a full address line. */
export function toGoogleLocationArea(address: string): string {
  const cleaned = address.replace(/\s+/g, ' ').trim()
  if (!cleaned) return ''

  // "123 Main St, Madison, WI 53703" or "Madison, WI 53703"
  const withZip = cleaned.match(/([A-Za-z .'-]+),\s*([A-Z]{2})\s+\d{5}(?:-\d{4})?\s*$/)
  if (withZip) return `${withZip[1].trim()}, ${withZip[2]}`

  // "Madison, WI"
  const cityState = cleaned.match(/([A-Za-z .'-]+),\s*([A-Z]{2})\s*$/)
  if (cityState) return `${cityState[1].trim()}, ${cityState[2]}`

  // "Madison, Wisconsin, USA"
  const cityStateName = cleaned.match(/([A-Za-z .'-]+),\s*([A-Za-z .]+?)(?:,|\s*$)/)
  if (cityStateName && /usa|united states/i.test(cleaned)) {
    return `${cityStateName[1].trim()}, ${cityStateName[2].trim()}`
  }

  const parts = cleaned.split(',').map(p => p.trim()).filter(Boolean)
  if (parts.length >= 2) {
    return `${parts[parts.length - 2]}, ${parts[parts.length - 1].replace(/\s+\d{5}(?:-\d{4})?$/, '')}`.replace(/,\s*$/, '')
  }

  return cleaned
}

/**
 * Parse Google Maps share text, e.g.
 * Chipotle Mexican Grill
 * 351 State St, Madison, WI
 * https://maps.app.goo.gl/xxxxx
 */
export function parseGoogleShareText(text: string): GoogleShareParse | null {
  const url = findGoogleMapsUrlInText(text)
  if (!url) return null

  const lines = text
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .filter(line => !GOOGLE_URL_IN_TEXT_RE.test(line))

  if (lines.length >= 2) {
    const addressIdx = lines.findIndex(line =>
      /\d/.test(line) || /,\s*[A-Z]{2}\b/.test(line) || /\b(?:St|Ave|Blvd|Rd|Dr|Way|Ct)\b/i.test(line),
    )
    if (addressIdx >= 0) {
      const address = lines[addressIdx]
      const name = lines.find((_, i) => i !== addressIdx) || lines[0]
      return { name, address, url }
    }
    return { name: lines[0], address: lines[1], url }
  }

  if (lines.length === 1) {
    // Could be only a name, or a collapsed "Name Address URL" handled below.
    const only = lines[0]
    if (!looksLikeGoogleMapsUrl(only)) return { name: only, url }
  }

  const collapsed = text.replace(/\s+/g, ' ').trim()
  const withoutUrl = collapsed.replace(GOOGLE_URL_IN_TEXT_RE, '').trim()
  if (!withoutUrl) return { url }

  const addrMatch = withoutUrl.match(/(\d{1,5}\s+.+,\s*[A-Za-z .'-]+,\s*[A-Z]{2}(?:\s+\d{5})?)$/)
  if (addrMatch) {
    const address = addrMatch[1].trim()
    const name = withoutUrl.slice(0, addrMatch.index).trim()
    if (name) return { name, address, url }
    return { address, url }
  }

  if (withoutUrl) return { name: withoutUrl, url }
  return { url }
}
