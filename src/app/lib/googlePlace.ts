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
  address: string
  lat: number | null
  lng: number | null
  placeId: string
  url: string
}

const GOOGLE_MAP_HOST_RE =
  /(?:^|\.)(?:google\.[a-z.]+|maps\.google\.[a-z.]+|maps\.app\.goo\.gl|goo\.gl)$/i

// Allow spaces: mobile pastes often decode %20 inside q= (e.g. "St, New York").
const GOOGLE_URL_IN_TEXT_RE =
  /https?:\/\/(?:(?:maps\.app\.)?goo\.gl\/[A-Za-z0-9_-]+|(?:maps\.google\.[a-z.]+|(?:www\.)?google\.[a-z.]+\/maps)[^\n<>"']*)/i

/** Mobile share pastes sometimes decode %20 to spaces, which breaks URL()/regex. */
export function coerceGoogleMapsUrl(raw: string): string {
  const trimmed = raw.trim().replace(/[),.;\]}]+$/g, '')
  if (!trimmed) return trimmed

  // Prefer space→%20 so fetch/searchParams stay stable across runtimes.
  if (/\s/.test(trimmed) && /^https?:\/\//i.test(trimmed)) {
    const encoded = trimmed.replace(/ /g, '%20')
    try {
      // eslint-disable-next-line no-new
      new URL(encoded)
      return encoded
    } catch {
      // fall through
    }
  }

  try {
    // Already a valid URL.
    // eslint-disable-next-line no-new
    new URL(trimmed)
    return trimmed
  } catch {
    // fall through
  }
  const encoded = trimmed.replace(/ /g, '%20')
  try {
    // eslint-disable-next-line no-new
    new URL(encoded)
    return encoded
  } catch {
    return trimmed
  }
}

export function looksLikeGoogleMapsUrl(text: string): boolean {
  const trimmed = coerceGoogleMapsUrl(text.trim())
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
  return coerceGoogleMapsUrl(match[0])
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

const STREET_ADDRESS_TAIL_RE =
  /(\d{1,6}\s+[^,]+(?:\s*,\s*[^,]+){0,3},\s*[A-Za-z .'-]+,\s*[A-Z]{2}(?:\s+\d{5}(?:-\d{4})?)?)\s*$/

/** True for street-style addresses like "26 E 60th St, New York, NY 10022". */
export function looksLikeStreetAddress(text: string): boolean {
  const cleaned = text.replace(/\s+/g, ' ').trim()
  if (!cleaned || cleaned.length < 8) return false
  if (/^https?:\/\//i.test(cleaned)) return false

  // "Café Name, 26 E 60th St, New York, NY 10022" is name+address, not a pure street line.
  if (splitNameAndAddress(cleaned)) return false

  const hasStreetNumber = /^\d{1,6}\s+\S+/.test(cleaned)
  const hasCityStateZip = /,\s*[A-Za-z .'-]+,\s*[A-Z]{2}(?:\s+\d{5}(?:-\d{4})?)?\s*$/.test(cleaned)
  const hasStreetType = /\b(?:St|Street|Ave|Avenue|Blvd|Boulevard|Rd|Road|Dr|Drive|Way|Ct|Court|Ln|Lane|Pl|Place|Ter|Terrace|Pkwy|Parkway|Hwy|Highway)\b/i.test(cleaned)
  const hasCommaParts = cleaned.split(',').filter(Boolean).length >= 2

  if (hasStreetNumber && (hasCityStateZip || hasStreetType)) return true
  if (hasStreetNumber && hasCommaParts) return true
  if (hasCityStateZip && hasStreetType) return true
  return false
}

/**
 * Split "Café Bilboquet, 26 E 60th St, New York, NY 10022" into venue + street address.
 * Common in Google Maps share cards / place path titles.
 */
export function splitNameAndAddress(text: string): { name: string; address: string } | null {
  const cleaned = text.replace(/\s+/g, ' ').trim()
  if (!cleaned || cleaned.length < 12) return null
  if (/^https?:\/\//i.test(cleaned)) return null

  // "Name, 123 Street …, City, ST ZIP"
  const withComma = cleaned.match(
    /^(.+?),\s*(\d{1,6}\s+.+?,\s*[A-Za-z .'-]+,\s*[A-Z]{2}(?:\s+\d{5}(?:-\d{4})?)?)\s*$/,
  )
  if (withComma) {
    const name = withComma[1].trim()
    const address = withComma[2].trim()
    if (name && !/^\d/.test(name) && /^\d{1,6}\s+\S+/.test(address)) {
      return { name, address }
    }
  }

  // "Name 123 Street …, City, ST ZIP" (no comma after venue)
  const spaced = cleaned.match(STREET_ADDRESS_TAIL_RE)
  if (spaced && spaced.index != null && spaced.index > 0) {
    const name = cleaned.slice(0, spaced.index).replace(/[,\s]+$/, '').trim()
    const address = spaced[1].trim()
    if (name && !/^\d/.test(name) && address) {
      return { name, address }
    }
  }

  return null
}

function streetLineFromAddress(address: string): string {
  const area = toGoogleLocationArea(address)
  if (area) {
    const idx = address.toLowerCase().lastIndexOf(area.toLowerCase())
    if (idx > 0) {
      return address.slice(0, idx).replace(/,\s*$/, '').trim()
    }
  }
  return address
    .replace(/,\s*[A-Za-z .'-]+,\s*[A-Z]{2}(?:\s+\d{5}(?:-\d{4})?)?\s*$/, '')
    .trim()
}

function applyNameOrAddress(decoded: string, current: { name: string; address: string }) {
  const split = splitNameAndAddress(decoded)
  if (split) {
    if (!current.name) current.name = split.name
    if (!current.address) current.address = split.address
    return
  }
  if (looksLikeStreetAddress(decoded)) {
    if (!current.address) current.address = decoded
    return
  }
  if (!current.name) current.name = decoded
}

/** Extract place name / address / coords / ids from a (possibly resolved) Google Maps URL. */
export function parseGoogleMapsUrl(urlText: string): ParsedGoogleMapsUrl {
  const url = coerceGoogleMapsUrl(urlText.trim())
  const current = { name: '', address: '' }
  let lat: number | null = null
  let lng: number | null = null
  let placeId = ''

  const placePath = url.match(/\/maps\/place\/([^/@]+)/i)
  if (placePath?.[1] && !/^(?:data|search|dir)$/i.test(placePath[1])) {
    applyNameOrAddress(decodePlaceName(placePath[1]), current)
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
      } else if (!/^https?:\/\//i.test(q)) {
        applyNameOrAddress(decodePlaceName(q), current)
      }
    }
    const cid = parsed.searchParams.get('cid')
    if (cid) placeId = `cid:${cid}`
    const formalPlaceId = parsed.searchParams.get('place_id') || parsed.searchParams.get('query_place_id')
    if (formalPlaceId) placeId = formalPlaceId
    const ftidParam = parsed.searchParams.get('ftid')
    if (ftidParam && /^0x[0-9a-fA-F]+:0x[0-9a-fA-F]+$/i.test(ftidParam) && !placeId) {
      placeId = ftidParam
    }
  } catch {
    // ignore
  }

  const ftid = url.match(/!1s(0x[0-9a-fA-F]+:0x[0-9a-fA-F]+)/)
  if (ftid?.[1] && !placeId) placeId = ftid[1]

  let { name, address } = current

  if (!placeId && lat != null && lng != null) {
    placeId = `geo:${lat.toFixed(5)},${lng.toFixed(5)}`
  }
  if (!placeId && (name || address)) {
    placeId = `name:${(name || address).toLowerCase()}`
  }

  // Address-only pins (common mobile Maps share): keep street as weak venue name.
  if (!name && address) {
    name = streetLineFromAddress(address)
  }

  return { name, address, lat, lng, placeId, url }
}

/**
 * Normalize place fields so "Café Bilboquet, 26 E 60th St, New York, NY 10022"
 * becomes name=Café Bilboquet, location=New York, NY.
 */
export function normalizeGooglePlaceFields(input: {
  name?: string
  address?: string
  location?: string
  placeId?: string
}): GooglePlaceInfo {
  let name = (input.name || '').trim()
  let address = (input.address || '').trim()
  let location = (input.location || '').trim()

  const fromName = splitNameAndAddress(name)
  if (fromName) {
    name = fromName.name
    if (!address) address = fromName.address
  }

  if (!address) {
    const fromLocation = splitNameAndAddress(location)
    if (fromLocation) {
      if (!name) name = fromLocation.name
      address = fromLocation.address
    }
  }

  if (!location && address) {
    location = toGoogleLocationArea(address)
  }

  return {
    name,
    location,
    address,
    placeId: input.placeId || '',
  }
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
  const lines = text
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .filter(line => !GOOGLE_URL_IN_TEXT_RE.test(line))

  const collapsed = text.replace(/\s+/g, ' ').trim()
  const withoutUrl = collapsed.replace(GOOGLE_URL_IN_TEXT_RE, '').trim()

  if (!url && !withoutUrl) return null

  if (lines.length >= 2) {
    const addressIdx = lines.findIndex(line =>
      looksLikeStreetAddress(line)
      || splitNameAndAddress(line)
      || /\d/.test(line)
      || /,\s*[A-Z]{2}\b/.test(line)
      || /\b(?:St|Ave|Blvd|Rd|Dr|Way|Ct)\b/i.test(line),
    )
    if (addressIdx >= 0) {
      let address = lines[addressIdx]
      let name = lines.find((_, i) => i !== addressIdx) || lines[0]
      const embedded = splitNameAndAddress(address)
      if (embedded) {
        name = embedded.name
        address = embedded.address
      } else if (looksLikeStreetAddress(name) && !looksLikeStreetAddress(address)) {
        const swap = name
        name = address
        address = swap
      }
      return url ? { name, address, url } : { name, address, url: '' }
    }
    return url
      ? { name: lines[0], address: lines[1], url }
      : { name: lines[0], address: lines[1], url: '' }
  }

  if (lines.length === 1) {
    const only = lines[0]
    if (!looksLikeGoogleMapsUrl(only)) {
      const split = splitNameAndAddress(only)
      if (split) return url ? { ...split, url } : { ...split, url: '' }
      if (looksLikeStreetAddress(only)) {
        return url
          ? { address: only, name: streetLineFromAddress(only), url }
          : { address: only, name: streetLineFromAddress(only), url: '' }
      }
      if (url) return { name: only, url }
    }
  }

  if (!url) {
    const split = splitNameAndAddress(withoutUrl)
    if (split) return { ...split, url: '' }
    return null
  }

  if (!withoutUrl) return { url }

  const split = splitNameAndAddress(withoutUrl)
  if (split) return { ...split, url }

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
