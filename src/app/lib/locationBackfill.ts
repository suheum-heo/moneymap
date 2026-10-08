import {
  formatJpCityPrefecture,
  koreanAreaToEnglish,
  looksLikeHangul,
  looksLikeJapanese,
  normalizeLocationNames,
  sanitizeEnglishLocationLabel,
  type LocationNames,
} from './locationBilingual'
import { isUsStateCode, JP_PREFECTURE_NAMES } from './locationLabels'

/**
 * Common Japanese city/ward labels → English (offline backfill).
 * Keys include forms with and without 市/区 when useful.
 */
const JP_CITY_EN: Record<string, string> = {
  成田市: 'Narita',
  成田: 'Narita',
  千葉市: 'Chiba',
  船橋市: 'Funabashi',
  市川市: 'Ichikawa',
  松戸市: 'Matsudo',
  柏市: 'Kashiwa',
  浦安市: 'Urayasu',
  東京: 'Tokyo',
  東京都: 'Tokyo',
  横浜市: 'Yokohama',
  横浜: 'Yokohama',
  川崎市: 'Kawasaki',
  相模原市: 'Sagamihara',
  大阪市: 'Osaka',
  大阪: 'Osaka',
  京都市: 'Kyoto',
  京都: 'Kyoto',
  名古屋市: 'Nagoya',
  名古屋: 'Nagoya',
  札幌市: 'Sapporo',
  札幌: 'Sapporo',
  福岡市: 'Fukuoka',
  福岡: 'Fukuoka',
  神戸市: 'Kobe',
  神戸: 'Kobe',
  広島市: 'Hiroshima',
  広島: 'Hiroshima',
  仙台市: 'Sendai',
  仙台: 'Sendai',
  那覇市: 'Naha',
  那覇: 'Naha',
  奈良市: 'Nara',
  奈良: 'Nara',
  金沢市: 'Kanazawa',
  金沢: 'Kanazawa',
  長崎市: 'Nagasaki',
  長崎: 'Nagasaki',
  静岡市: 'Shizuoka',
  浜松市: 'Hamamatsu',
  新潟市: 'Niigata',
  岡山市: 'Okayama',
  熊本市: 'Kumamoto',
  鹿児島市: 'Kagoshima',
  渋谷区: 'Shibuya',
  新宿区: 'Shinjuku',
  港区: 'Minato',
  千代田区: 'Chiyoda',
  中央区: 'Chuo',
  品川区: 'Shinagawa',
  目黒区: 'Meguro',
  世田谷区: 'Setagaya',
  中野区: 'Nakano',
  杉並区: 'Suginami',
  豊島区: 'Toshima',
  北区: 'Kita',
  台東区: 'Taito',
  墨田区: 'Sumida',
  江東区: 'Koto',
  大田区: 'Ota',
  練馬区: 'Nerima',
  板橋区: 'Itabashi',
  足立区: 'Adachi',
  葛飾区: 'Katsushika',
  江戸川区: 'Edogawa',
  文京区: 'Bunkyo',
}

/** Offline romanization for a Japanese city/ward label. */
export function jpCityToEnglish(city: string): string {
  const cleaned = city.replace(/\s+/g, '').trim()
  if (!cleaned) return ''
  if (JP_CITY_EN[cleaned]) return JP_CITY_EN[cleaned]
  const stem = cleaned.replace(/(?:市|区|町|村)$/u, '')
  if (stem && JP_CITY_EN[stem]) return JP_CITY_EN[stem]
  return ''
}

/**
 * Best-effort bilingual labels from a stored canonical location string
 * (no network). Used for legacy backfill.
 */
export function deriveLocationNamesFromStored(location: string): LocationNames {
  const trimmed = location.trim()
  if (!trimmed) return {}

  const commaParts = trimmed.split(',').map(part => part.trim()).filter(Boolean)
  if (commaParts.length >= 2) {
    const tail = commaParts[commaParts.length - 1]
    const iso = tail.toUpperCase()
    const prefecture = JP_PREFECTURE_NAMES[iso]
    if (prefecture) {
      const city = commaParts.slice(0, -1).join(', ')
      const cityEn = jpCityToEnglish(city)
      return normalizeLocationNames({
        locationLocal: formatJpCityPrefecture(city, prefecture.ja),
        locationEn: formatJpCityPrefecture(cityEn || city, prefecture.en),
      })
    }
    if (isUsStateCode(tail)) {
      return normalizeLocationNames({ locationLocal: trimmed, locationEn: trimmed })
    }
  }

  if (looksLikeHangul(trimmed)) {
    const locationEn = koreanAreaToEnglish(trimmed)
    return normalizeLocationNames({
      locationLocal: trimmed,
      ...(locationEn ? { locationEn } : {}),
    })
  }

  if (!looksLikeJapanese(trimmed)) {
    return normalizeLocationNames({ locationLocal: trimmed, locationEn: trimmed })
  }

  // Japanese text without an ISO code — local only until network enrich.
  return normalizeLocationNames({ locationLocal: trimmed })
}

/** True when bilingual labels are present and the English side is Latin script. */
export function hasCompleteLocationBilingual(names: {
  locationLocal?: string
  locationEn?: string
}): boolean {
  const local = (names.locationLocal || '').trim()
  const en = (names.locationEn || '').trim()
  if (!local || !en) return false
  if (looksLikeJapanese(en) || looksLikeHangul(en)) return false
  return true
}

/** True when a network lookup may improve English (or fill a missing side). */
export function locationNamesNeedNetworkEnrichment(
  location: string,
  names?: LocationNames | null,
): boolean {
  const trimmed = location.trim()
  if (!trimmed) return false
  if (hasCompleteLocationBilingual({ ...names })) return false
  if (looksLikeHangul(trimmed) || looksLikeJapanese(trimmed)) return true
  const iso = trimmed.split(',').map(p => p.trim()).filter(Boolean).pop()?.toUpperCase() || ''
  return Boolean(JP_PREFECTURE_NAMES[iso])
}

export function mergeLocationNames(
  current: LocationNames | undefined,
  next: LocationNames,
): LocationNames {
  const nextEn = sanitizeEnglishLocationLabel(next.locationEn)
  const currentEn = sanitizeEnglishLocationLabel(current?.locationEn)
  return normalizeLocationNames({
    locationLocal: next.locationLocal || current?.locationLocal,
    // Prefer next English; never keep a prior mixed CJK "English" label.
    locationEn: nextEn || currentEn,
  })
}
