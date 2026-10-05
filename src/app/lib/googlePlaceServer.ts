import {
  extractAddressFromGoogleSearchHtml,
  findGoogleMapsUrlInText,
  looksLikeGoogleMapsUrl,
  normalizeGooglePlaceFields,
  parseGoogleMapsUrl,
  toGoogleLocationArea,
  type GooglePlaceInfo,
} from './googlePlace'

const BROWSER_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'

const NOMINATIM_UA = 'MoneyMap/1.0 (expense tracker; place lookup)'

const placeCache = new Map<string, { expires: number; value: GooglePlaceInfo }>()
const CACHE_TTL_MS = 1000 * 60 * 60 * 24

function getCached(key: string): GooglePlaceInfo | null {
  const hit = placeCache.get(key)
  if (!hit) return null
  if (hit.expires < Date.now()) {
    placeCache.delete(key)
    return null
  }
  return hit.value
}

function setCached(key: string, value: GooglePlaceInfo) {
  placeCache.set(key, { value, expires: Date.now() + CACHE_TTL_MS })
}

const US_STATE_ABBR: Record<string, string> = {
  Alabama: 'AL', Alaska: 'AK', Arizona: 'AZ', Arkansas: 'AR', California: 'CA',
  Colorado: 'CO', Connecticut: 'CT', Delaware: 'DE', Florida: 'FL', Georgia: 'GA',
  Hawaii: 'HI', Idaho: 'ID', Illinois: 'IL', Indiana: 'IN', Iowa: 'IA',
  Kansas: 'KS', Kentucky: 'KY', Louisiana: 'LA', Maine: 'ME', Maryland: 'MD',
  Massachusetts: 'MA', Michigan: 'MI', Minnesota: 'MN', Mississippi: 'MS', Missouri: 'MO',
  Montana: 'MT', Nebraska: 'NE', Nevada: 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ',
  'New Mexico': 'NM', 'New York': 'NY', 'North Carolina': 'NC', 'North Dakota': 'ND', Ohio: 'OH',
  Oklahoma: 'OK', Oregon: 'OR', Pennsylvania: 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
  'South Dakota': 'SD', Tennessee: 'TN', Texas: 'TX', Utah: 'UT', Vermont: 'VT',
  Virginia: 'VA', Washington: 'WA', 'West Virginia': 'WV', Wisconsin: 'WI', Wyoming: 'WY',
  'District of Columbia': 'DC',
}

async function resolveGoogleMapsUrl(url: string): Promise<string> {
  // Short links need redirect follow to reach /maps/place/...
  if (!/goo\.gl\//i.test(url) && !/maps\.app\.goo\.gl/i.test(url)) {
    return url
  }

  try {
    const manual = await fetch(url, {
      method: 'GET',
      redirect: 'manual',
      headers: { 'User-Agent': BROWSER_UA, 'Accept-Language': 'en-US,en;q=0.9' },
      signal: AbortSignal.timeout(8000),
    })
    const location = manual.headers.get('location')
    if (location) {
      const abs = location.startsWith('http') ? location : new URL(location, url).toString()
      if (looksLikeGoogleMapsUrl(abs) || abs.includes('/maps')) return abs
    }

    const followed = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      headers: { 'User-Agent': BROWSER_UA, 'Accept-Language': 'en-US,en;q=0.9' },
      signal: AbortSignal.timeout(10000),
    })
    return followed.url || url
  } catch {
    return url
  }
}

type GeoResult = { location: string; address: string; postcode?: string }

function stateCodeFromAddress(addr: Record<string, string>): string {
  const stateName = addr.state || ''
  return (
    (addr['ISO3166-2-lvl4'] || '').replace(/^US-/i, '') ||
    US_STATE_ABBR[stateName] ||
    (stateName.length === 2 ? stateName.toUpperCase() : '') ||
    ''
  )
}

/**
 * Prefer real municipalities only.
 * Hamlets/neighbourhoods (e.g. "Adams Crossroads") and counties are too granular
 * or wrong for expense "location" and must not win over a Google city hint.
 */
function localityFromAddress(addr: Record<string, string>): string {
  return (
    addr.city ||
    addr.town ||
    addr.village ||
    addr.municipality ||
    ''
  )
}

function stateNameFromCode(code: string): string {
  const upper = code.toUpperCase()
  const entry = Object.entries(US_STATE_ABBR).find(([, abbr]) => abbr === upper)
  return entry?.[0] || ''
}

function isWeakLocality(name: string): boolean {
  if (!name.trim()) return true
  return /\bCounty\b/i.test(name)
}

/** True when location looks like "Suwanee, GA", not "GA" or "Gwinnett County, GA". */
function hasStrongCityLocation(location: string): boolean {
  const parts = location.split(',').map(p => p.trim()).filter(Boolean)
  if (parts.length < 2) return false
  const city = parts[0]
  if (!city || isWeakLocality(city)) return false
  if (/^[A-Z]{2}$/.test(city)) return false
  return true
}

function formatGeoResult(addr: Record<string, string>, displayName = ''): GeoResult {
  const city = localityFromAddress(addr)
  const stateName = addr.state || ''
  const stateCode = stateCodeFromAddress(addr) || (stateName.length === 2 ? stateName : '')
  const postcode = (addr.postcode || '').match(/\d{5}/)?.[0] || ''

  let location = ''
  if (city && stateCode) location = `${city}, ${stateCode}`
  else if (city && stateName) location = `${city}, ${stateName}`
  else if (stateCode || stateName) location = stateCode || stateName
  else location = toGoogleLocationArea(displayName)

  const road = [addr.house_number, addr.road || addr.street].filter(Boolean).join(' ')
  const address =
    [road, city, stateCode || stateName].filter(Boolean).join(', ') || displayName || ''

  return { location, address, postcode: postcode || undefined }
}

/** USPS-style postal city from ZIP — matches Google mailing cities (30320 → Atlanta, not College Park). */
async function lookupUsZipCity(postcode: string): Promise<string | null> {
  const zip = (postcode || '').match(/\d{5}/)?.[0]
  if (!zip) return null
  try {
    const res = await fetch(`https://api.zippopotam.us/us/${zip}`, {
      headers: { Accept: 'application/json', 'User-Agent': NOMINATIM_UA },
      signal: AbortSignal.timeout(6000),
      next: { revalidate: 86400 * 30 },
    })
    if (!res.ok) return null
    const data = await res.json() as {
      places?: Array<{ 'place name'?: string; 'state abbreviation'?: string }>
    }
    const place = data.places?.[0]
    const city = (place?.['place name'] || '').trim()
    const state = (place?.['state abbreviation'] || '').trim().toUpperCase()
    if (!city || !state) return null
    // Skip APO/AMF-style postal labels that are not real city names.
    if (/^amf\b/i.test(city) || /^apo\b/i.test(city) || /^fpo\b/i.test(city)) return null
    return `${city}, ${state}`
  } catch {
    return null
  }
}

function postcodeFromAddress(address: string): string {
  return address.match(/\b(\d{5})(?:-\d{4})?\b/)?.[1] || ''
}

async function nominatimReverse(lat: number, lng: number): Promise<GeoResult> {
  const endpoint =
    `https://nominatim.openstreetmap.org/reverse?lat=${encodeURIComponent(String(lat))}` +
    `&lon=${encodeURIComponent(String(lng))}&format=json&zoom=16&addressdetails=1`

  const res = await fetch(endpoint, {
    headers: {
      'User-Agent': NOMINATIM_UA,
      Accept: 'application/json',
    },
    signal: AbortSignal.timeout(8000),
    next: { revalidate: 86400 },
  })

  if (!res.ok) {
    throw new Error(`Geocoder returned ${res.status}`)
  }

  const data = await res.json() as {
    display_name?: string
    address?: Record<string, string>
  }
  return formatGeoResult(data.address || {}, data.display_name || '')
}

/** When reverse only has a county, a nearby named place often has the town (e.g. Suwanee). */
async function nominatimSearchNear(
  name: string,
  lat: number,
  lng: number,
): Promise<GeoResult | null> {
  const q = name.trim()
  if (!q || q.length < 2) return null

  const delta = 0.02 // ~2km
  const viewbox = [lng - delta, lat + delta, lng + delta, lat - delta].join(',')
  const endpoint =
    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}` +
    `&format=json&limit=5&addressdetails=1` +
    `&viewbox=${encodeURIComponent(viewbox)}&bounded=1`

  const res = await fetch(endpoint, {
    headers: {
      'User-Agent': NOMINATIM_UA,
      Accept: 'application/json',
    },
    signal: AbortSignal.timeout(8000),
    next: { revalidate: 86400 },
  })
  if (!res.ok) return null

  const rows = await res.json() as Array<{
    lat?: string
    lon?: string
    display_name?: string
    address?: Record<string, string>
  }>
  if (!Array.isArray(rows) || rows.length === 0) return null

  let best: GeoResult | null = null
  let bestDist = Infinity
  for (const row of rows) {
    const rLat = parseFloat(row.lat || '')
    const rLng = parseFloat(row.lon || '')
    if (!Number.isFinite(rLat) || !Number.isFinite(rLng)) continue
    const dist = Math.hypot(rLat - lat, rLng - lng)
    if (dist > 0.03) continue // ~3km
    const geo = formatGeoResult(row.address || {}, row.display_name || '')
    if (!hasStrongCityLocation(geo.location)) continue
    if (dist < bestDist) {
      bestDist = dist
      best = geo
    }
  }
  return best
}

async function photonReverse(lat: number, lng: number): Promise<GeoResult | null> {
  const endpoint =
    `https://photon.komoot.io/reverse?lat=${encodeURIComponent(String(lat))}` +
    `&lon=${encodeURIComponent(String(lng))}`

  try {
    const res = await fetch(endpoint, {
      headers: { Accept: 'application/json', 'User-Agent': NOMINATIM_UA },
      signal: AbortSignal.timeout(8000),
      next: { revalidate: 86400 },
    })
    if (!res.ok) return null

    const data = await res.json() as {
      features?: Array<{ properties?: Record<string, string> }>
    }
    const props = data.features?.[0]?.properties
    if (!props) return null

    const addr: Record<string, string> = {
      house_number: props.housenumber || '',
      road: props.street || '',
      city: props.city || '',
      town: props.city || '',
      county: props.county || '',
      state: props.state || '',
      postcode: props.postcode || '',
      country: props.country || '',
    }
    // keep postcode through formatGeoResult
    // Photon often returns state as "GA" already.
    if (addr.state.length === 2) {
      addr['ISO3166-2-lvl4'] = `US-${addr.state.toUpperCase()}`
    }
    const geo = formatGeoResult(addr)
    if (!hasStrongCityLocation(geo.location)) return null
    return geo
  } catch {
    return null
  }
}

/**
 * Ask Google Maps search for the listing address (same source users see in Maps).
 * Prefer specific queries (URL `!15s` text, or name + city/state) — bare chain names are ambiguous.
 */
async function lookupGoogleMapsListingQuery(
  query: string,
  mustInclude?: string,
): Promise<GeoResult | null> {
  const q = query.trim()
  if (q.length < 4) return null

  const endpoint =
    `https://www.google.com/search?tbm=map&hl=en&gl=us&q=${encodeURIComponent(q)}`

  try {
    const res = await fetch(endpoint, {
      headers: {
        'User-Agent': BROWSER_UA,
        'Accept-Language': 'en-US,en;q=0.9',
        Accept: 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(10000),
      next: { revalidate: 86400 },
    })
    if (!res.ok) return null
    const html = await res.text()
    const address = extractAddressFromGoogleSearchHtml(html)
    if (!address) return null

    if (mustInclude) {
      const needle = mustInclude.trim().toLowerCase()
      if (needle && !address.toLowerCase().includes(needle)) {
        if (!(needle.length === 2 && new RegExp(`,\\s*${needle}\\s+\\d{5}`, 'i').test(address))) {
          return null
        }
      }
    }

    const location = toGoogleLocationArea(address)
    if (!hasStrongCityLocation(location)) return null
    return { location, address }
  } catch {
    return null
  }
}

async function lookupGoogleMapsListing(
  name: string,
  qualifier: string,
): Promise<GeoResult | null> {
  const qName = name.trim()
  const qQual = qualifier.trim()
  if (!qName || !qQual) return null
  return lookupGoogleMapsListingQuery(`${qName} ${qQual}`, qQual)
}

function stateCodeFromLocation(location: string): string {
  const parts = location.split(',').map(p => p.trim()).filter(Boolean)
  if (parts.length === 0) return ''
  const tail = parts[parts.length - 1]
  if (/^[A-Z]{2}$/.test(tail)) return tail
  return US_STATE_ABBR[tail] || ''
}

async function reverseGeocode(
  lat: number,
  lng: number,
  hintName?: string,
): Promise<GeoResult & { stateCode: string; stateName: string }> {
  // 1) Named place near the pin (Arte → Suwanee) before bare reverse.
  if (hintName) {
    try {
      const named = await nominatimSearchNear(hintName, lat, lng)
      if (named && hasStrongCityLocation(named.location)) {
        const stateCode = stateCodeFromLocation(named.location)
        return {
          ...named,
          stateCode,
          stateName: stateNameFromCode(stateCode),
        }
      }
    } catch {
      // fall through
    }
  }

  // 2) Nominatim reverse (city/town only — hamlets ignored → often state-only)
  let geo = await nominatimReverse(lat, lng)
  let stateCode = stateCodeFromLocation(geo.location)
  const postcode = geo.postcode

  // 3) Weak / state-only → Photon
  if (!hasStrongCityLocation(geo.location)) {
    const photon = await photonReverse(lat, lng)
    if (photon && hasStrongCityLocation(photon.location)) {
      geo = { ...photon, postcode: photon.postcode || postcode }
      stateCode = stateCodeFromLocation(photon.location) || stateCode
    }
  }

  if (!hasStrongCityLocation(geo.location) && /\bCounty\b/i.test(geo.location)) {
    const stateOnly = geo.location.split(',').slice(1).join(',').trim()
    if (stateOnly) {
      geo = {
        location: stateOnly,
        address: geo.address.replace(/^[A-Za-z .'-]+ County,\s*/i, ''),
        postcode: geo.postcode || postcode,
      }
      stateCode = stateCodeFromLocation(stateOnly) || stateOnly
    }
  }

  return {
    ...geo,
    postcode: geo.postcode || postcode,
    stateCode,
    stateName: stateNameFromCode(stateCode),
  }
}

export async function fetchGooglePlaceFromUrl(urlOrText: string): Promise<GooglePlaceInfo> {
  const input = urlOrText.trim()
  const found = findGoogleMapsUrlInText(input) || input
  if (!looksLikeGoogleMapsUrl(found) && !found.includes('google.') && !/goo\.gl/i.test(found)) {
    throw new Error('Not a Google Maps URL')
  }

  const resolved = await resolveGoogleMapsUrl(found)
  const parsed = parseGoogleMapsUrl(resolved)
  const cacheKey = parsed.placeId || resolved
  const cached = getCached(cacheKey)
  if (cached) return cached

  let location = ''
  let address = parsed.address || ''
  const cityHint = parsed.cityHint || ''
  const searchQuery = parsed.searchQuery || ''
  let trustedCity = false // URL address or Google listing — don't let ZIP/OSM override

  /*
   * Source priority for venue location:
   * 1) Address already in the Maps URL / share text (city from that address)
   * 2) Google listing scrape (works locally; often blocked from Vercel)
   * 3) US ZIP postal city (zippopotam) — reliable on serverless; beats OSM town
   * 4) OSM/Photon municipality / city hint + state
   */
  if (address) {
    const fromAddr = toGoogleLocationArea(address)
    if (hasStrongCityLocation(fromAddr)) {
      location = fromAddr
      trustedCity = true
    }
  }

  if (!address && searchQuery) {
    const listed = await lookupGoogleMapsListingQuery(searchQuery)
    if (listed) {
      address = listed.address
      location = listed.location
      trustedCity = hasStrongCityLocation(location)
    }
  }

  if (!address && parsed.name && cityHint) {
    const listed = await lookupGoogleMapsListing(parsed.name, cityHint)
    if (listed) {
      address = listed.address
      location = listed.location
      trustedCity = hasStrongCityLocation(location)
    }
  }

  if (parsed.lat != null && parsed.lng != null) {
    try {
      const geo = await reverseGeocode(parsed.lat, parsed.lng, parsed.name)

      // Best-effort Google listing (may fail on Vercel egress).
      if (!trustedCity && parsed.name && geo.stateName) {
        const listed = await lookupGoogleMapsListing(parsed.name, geo.stateName)
        if (listed) {
          address = listed.address || address
          location = listed.location
          trustedCity = hasStrongCityLocation(location)
        }
      }
      if (!trustedCity && searchQuery && geo.stateName) {
        const listed = await lookupGoogleMapsListingQuery(`${searchQuery} ${geo.stateName}`)
        if (listed) {
          address = listed.address || address
          location = listed.location
          trustedCity = hasStrongCityLocation(location)
        }
      }

      if (!address && geo.address) address = geo.address

      // ZIP postal city — works from Vercel (30320 → Atlanta, not College Park).
      if (!trustedCity) {
        const zip =
          geo.postcode ||
          postcodeFromAddress(address) ||
          postcodeFromAddress(geo.address || '')
        if (zip) {
          const postal = await lookupUsZipCity(zip)
          if (postal && hasStrongCityLocation(postal)) {
            location = postal
            trustedCity = true
          }
        }
      }

      if (!trustedCity && hasStrongCityLocation(geo.location)) location = geo.location

      if ((!location || !hasStrongCityLocation(location)) && cityHint && geo.stateCode) {
        location = `${cityHint}, ${geo.stateCode}`
      } else if (!location && geo.location) {
        location = geo.location
      }
    } catch {
      // Name/address-only fill is still useful if geocoding fails.
    }
  }

  if (!location && cityHint) {
    location = cityHint
  }

  if (!location && address) {
    location = toGoogleLocationArea(address)
  }

  if (!parsed.name && !location && !address) {
    throw new Error('Could not parse place info')
  }

  const info = normalizeGooglePlaceFields({
    name: parsed.name,
    location,
    address,
    placeId: parsed.placeId || cacheKey,
  })
  setCached(cacheKey, info)
  return info
}
