import {
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

type GeoResult = { location: string; address: string }

function stateCodeFromAddress(addr: Record<string, string>): string {
  const stateName = addr.state || ''
  return (
    (addr['ISO3166-2-lvl4'] || '').replace(/^US-/i, '') ||
    US_STATE_ABBR[stateName] ||
    (stateName.length === 2 ? stateName.toUpperCase() : '') ||
    ''
  )
}

/** Prefer real municipalities; never treat "X County" as the city label. */
function localityFromAddress(addr: Record<string, string>): string {
  const primary =
    addr.city ||
    addr.town ||
    addr.village ||
    addr.municipality ||
    addr.city_district ||
    addr.suburb ||
    ''
  if (primary) return primary
  const weak = addr.hamlet || addr.neighbourhood || addr.county || ''
  if (weak && /\bCounty\b/i.test(weak)) return ''
  return weak
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

  let location = ''
  if (city && stateCode) location = `${city}, ${stateCode}`
  else if (city && stateName) location = `${city}, ${stateName}`
  else if (stateCode || stateName) location = stateCode || stateName
  else location = toGoogleLocationArea(displayName)

  const road = [addr.house_number, addr.road || addr.street].filter(Boolean).join(' ')
  const address =
    [road, city, stateCode || stateName].filter(Boolean).join(', ') || displayName || ''

  return { location, address }
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

async function reverseGeocode(
  lat: number,
  lng: number,
  hintName?: string,
): Promise<GeoResult> {
  const cacheKey = `geo:${lat.toFixed(4)},${lng.toFixed(4)}:${(hintName || '').toLowerCase()}`
  const cached = getCached(cacheKey)
  if (cached) return { location: cached.location, address: cached.address }

  // 1) Named place near the pin (Arte → Suwanee) before bare reverse.
  if (hintName) {
    try {
      const named = await nominatimSearchNear(hintName, lat, lng)
      if (named && hasStrongCityLocation(named.location)) {
        return named
      }
    } catch {
      // fall through
    }
  }

  // 2) Nominatim reverse
  let geo = await nominatimReverse(lat, lng)

  // 3) County-only / state-only → Photon (often has the municipality OSM reverse misses)
  if (!hasStrongCityLocation(geo.location)) {
    const photon = await photonReverse(lat, lng)
    if (photon && hasStrongCityLocation(photon.location)) geo = photon
  }

  // Prefer bare "GA" over "Gwinnett County, GA" if every geocoder only knows the county.
  if (!hasStrongCityLocation(geo.location) && /\bCounty\b/i.test(geo.location)) {
    const stateOnly = geo.location.split(',').slice(1).join(',').trim()
    if (stateOnly) {
      geo = {
        location: stateOnly,
        address: geo.address.replace(/^[A-Za-z .'-]+ County,\s*/i, ''),
      }
    }
  }

  return geo
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
  if (parsed.lat != null && parsed.lng != null) {
    try {
      const geo = await reverseGeocode(parsed.lat, parsed.lng, parsed.name)
      location = geo.location
      address = geo.address || address
    } catch {
      // Name/address-only fill is still useful if geocoding fails.
    }
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
  if (parsed.lat != null && parsed.lng != null) {
    setCached(`geo:${parsed.lat.toFixed(4)},${parsed.lng.toFixed(4)}:${parsed.name.toLowerCase()}`, info)
  }
  return info
}
