import {
  findGoogleMapsUrlInText,
  looksLikeGoogleMapsUrl,
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

async function reverseGeocode(lat: number, lng: number): Promise<{ location: string; address: string }> {
  const cacheKey = `geo:${lat.toFixed(4)},${lng.toFixed(4)}`
  const cached = getCached(cacheKey)
  if (cached) return { location: cached.location, address: cached.address }

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
  const addr = data.address || {}
  const city =
    addr.city ||
    addr.town ||
    addr.village ||
    addr.municipality ||
    addr.hamlet ||
    addr.county ||
    ''
  const stateName = addr.state || ''
  const stateCode =
    (addr['ISO3166-2-lvl4'] || '').replace(/^US-/i, '') ||
    US_STATE_ABBR[stateName] ||
    ''

  let location = ''
  if (city && stateCode) location = `${city}, ${stateCode}`
  else if (city && stateName) location = `${city}, ${stateName}`
  else if (stateCode || stateName) location = stateCode || stateName
  else location = toGoogleLocationArea(data.display_name || '')

  const road = [addr.house_number, addr.road].filter(Boolean).join(' ')
  const address = [road, city, stateCode || stateName].filter(Boolean).join(', ') || data.display_name || ''

  return { location, address }
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
  let address = ''
  if (parsed.lat != null && parsed.lng != null) {
    try {
      const geo = await reverseGeocode(parsed.lat, parsed.lng)
      location = geo.location
      address = geo.address
    } catch {
      // Name-only fill is still useful if geocoding fails.
    }
  }

  if (!parsed.name && !location) {
    throw new Error('Could not parse place info')
  }

  const info: GooglePlaceInfo = {
    name: parsed.name,
    location,
    address,
    placeId: parsed.placeId || cacheKey,
  }
  setCached(cacheKey, info)
  if (parsed.lat != null && parsed.lng != null) {
    setCached(`geo:${parsed.lat.toFixed(4)},${parsed.lng.toFixed(4)}`, info)
  }
  return info
}
