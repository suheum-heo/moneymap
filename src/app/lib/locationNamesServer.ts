import {
  formatJpCityPrefecture,
  koreanAreaToEnglish,
  looksLikeHangul,
  looksLikeJapanese,
  normalizeLocationNames,
  type LocationNames,
} from './locationBilingual'
import {
  deriveLocationNamesFromStored,
  hasCompleteLocationBilingual,
  jpCityToEnglish,
} from './locationBackfill'
import { JP_PREFECTURE_NAMES } from './locationLabels'

const NOMINATIM_UA = 'MoneyMap/1.0 (expense tracker; location backfill)'

type NominatimAddress = Record<string, string>

async function nominatimSearch(query: string, language: string): Promise<{
  address: NominatimAddress
  displayName: string
} | null> {
  const q = query.trim()
  if (q.length < 2) return null
  const endpoint =
    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}` +
    `&format=json&limit=1&addressdetails=1&accept-language=${encodeURIComponent(language)}`

  try {
    const res = await fetch(endpoint, {
      headers: {
        'User-Agent': NOMINATIM_UA,
        Accept: 'application/json',
        'Accept-Language': language,
      },
      signal: AbortSignal.timeout(8000),
      next: { revalidate: 86400 * 30 },
    })
    if (!res.ok) return null
    const rows = await res.json() as Array<{
      address?: NominatimAddress
      display_name?: string
    }>
    if (!Array.isArray(rows) || !rows[0]) return null
    return {
      address: rows[0].address || {},
      displayName: rows[0].display_name || '',
    }
  } catch {
    return null
  }
}

function localityFromAddress(addr: NominatimAddress): string {
  return (
    addr.city
    || addr.town
    || addr.village
    || addr.municipality
    || addr.borough
    || addr.suburb
    || addr.city_district
    || ''
  )
}

/**
 * Resolve local + English labels for a stored location string.
 * Starts from offline derive, then Nominatim when English is still CJK/missing.
 */
export async function resolveLocationNames(location: string): Promise<LocationNames> {
  const trimmed = location.trim()
  if (!trimmed) return {}

  const derived = deriveLocationNamesFromStored(trimmed)
  if (hasCompleteLocationBilingual(derived)) return derived

  const commaParts = trimmed.split(',').map(part => part.trim()).filter(Boolean)
  const iso = (commaParts[commaParts.length - 1] || '').toUpperCase()
  const prefecture = JP_PREFECTURE_NAMES[iso]

  // Japan with ISO code — fetch English city name.
  if (prefecture) {
    const cityLocal = commaParts.slice(0, -1).join(', ')
    let cityEn = jpCityToEnglish(cityLocal)
    if (!cityEn) {
      const enHit = await nominatimSearch(
        `${cityLocal} ${prefecture.en} Japan`,
        'en',
      )
      cityEn = localityFromAddress(enHit?.address || {})
      // Nominatim sometimes returns the prefecture as city; ignore that.
      if (cityEn && /prefecture/i.test(cityEn)) cityEn = ''
      if (cityEn && cityEn.toLowerCase() === prefecture.en.toLowerCase()) cityEn = ''
    }
    return normalizeLocationNames({
      locationLocal: formatJpCityPrefecture(cityLocal, prefecture.ja),
      locationEn: formatJpCityPrefecture(cityEn || cityLocal, prefecture.en),
    })
  }

  // Korea — static map first, then Nominatim. Never keep mixed Hangul/English.
  if (looksLikeHangul(trimmed)) {
    let locationEn = koreanAreaToEnglish(trimmed)
    if (!locationEn) {
      const enHit = await nominatimSearch(trimmed, 'en')
      const city = localityFromAddress(enHit?.address || {})
      const borough = enHit?.address?.borough || enHit?.address?.suburb || ''
      if (borough && city && borough !== city) locationEn = `${borough}, ${city}`
      else if (city) locationEn = city
      else if (enHit?.displayName) {
        const parts = enHit.displayName.split(',').map(p => p.trim()).filter(Boolean)
        // Drop trailing country; keep city-ish head without Hangul leftovers.
        const latin = parts.filter(part => !looksLikeHangul(part) && !/korea/i.test(part))
        if (latin.length >= 2) locationEn = `${latin[0]}, ${latin[1]}`
        else if (latin.length === 1) locationEn = latin[0]
      }
    }
    return normalizeLocationNames({
      locationLocal: trimmed,
      locationEn,
    })
  }

  // Other Japanese text without ISO.
  if (looksLikeJapanese(trimmed)) {
    const enHit = await nominatimSearch(trimmed, 'en')
    const cityEn = localityFromAddress(enHit?.address || {})
    const isoEn = (enHit?.address?.['ISO3166-2-lvl4'] || '').toUpperCase()
    const pref = JP_PREFECTURE_NAMES[isoEn]
    if (cityEn && pref) {
      return normalizeLocationNames({
        locationLocal: derived.locationLocal || trimmed,
        locationEn: formatJpCityPrefecture(cityEn, pref.en),
      })
    }
    if (cityEn) {
      return normalizeLocationNames({
        locationLocal: derived.locationLocal || trimmed,
        locationEn: cityEn,
      })
    }
  }

  return derived
}
