export type LocationNameMode = 'local' | 'app'
export type LocationLabelLanguage = 'en' | 'ja' | 'ko'

export const US_STATE_NAMES: Record<string, string> = {
  AL: 'Alabama',
  AK: 'Alaska',
  AZ: 'Arizona',
  AR: 'Arkansas',
  CA: 'California',
  CO: 'Colorado',
  CT: 'Connecticut',
  DE: 'Delaware',
  FL: 'Florida',
  GA: 'Georgia',
  HI: 'Hawaii',
  ID: 'Idaho',
  IL: 'Illinois',
  IN: 'Indiana',
  IA: 'Iowa',
  KS: 'Kansas',
  KY: 'Kentucky',
  LA: 'Louisiana',
  ME: 'Maine',
  MD: 'Maryland',
  MA: 'Massachusetts',
  MI: 'Michigan',
  MN: 'Minnesota',
  MS: 'Mississippi',
  MO: 'Missouri',
  MT: 'Montana',
  NE: 'Nebraska',
  NV: 'Nevada',
  NH: 'New Hampshire',
  NJ: 'New Jersey',
  NM: 'New Mexico',
  NY: 'New York',
  NC: 'North Carolina',
  ND: 'North Dakota',
  OH: 'Ohio',
  OK: 'Oklahoma',
  OR: 'Oregon',
  PA: 'Pennsylvania',
  RI: 'Rhode Island',
  SC: 'South Carolina',
  SD: 'South Dakota',
  TN: 'Tennessee',
  TX: 'Texas',
  UT: 'Utah',
  VT: 'Vermont',
  VA: 'Virginia',
  WA: 'Washington',
  WV: 'West Virginia',
  WI: 'Wisconsin',
  WY: 'Wyoming',
  DC: 'District of Columbia',
}

export type PrefectureNames = { en: string; ja: string; ko: string }

export const JP_PREFECTURE_NAMES: Record<string, PrefectureNames> = {
  'JP-01': { en: 'Hokkaido', ja: '北海道', ko: '홋카이도' },
  'JP-02': { en: 'Aomori', ja: '青森', ko: '아오모리' },
  'JP-03': { en: 'Iwate', ja: '岩手', ko: '이와테' },
  'JP-04': { en: 'Miyagi', ja: '宮城', ko: '미야기' },
  'JP-05': { en: 'Akita', ja: '秋田', ko: '아키타' },
  'JP-06': { en: 'Yamagata', ja: '山形', ko: '야마가타' },
  'JP-07': { en: 'Fukushima', ja: '福島', ko: '후쿠시마' },
  'JP-08': { en: 'Ibaraki', ja: '茨城', ko: '이바라키' },
  'JP-09': { en: 'Tochigi', ja: '栃木', ko: '도치기' },
  'JP-10': { en: 'Gunma', ja: '群馬', ko: '군마' },
  'JP-11': { en: 'Saitama', ja: '埼玉', ko: '사이타마' },
  'JP-12': { en: 'Chiba', ja: '千葉', ko: '치바' },
  'JP-13': { en: 'Tokyo', ja: '東京', ko: '도쿄' },
  'JP-14': { en: 'Kanagawa', ja: '神奈川', ko: '가나가와' },
  'JP-15': { en: 'Niigata', ja: '新潟', ko: '니가타' },
  'JP-16': { en: 'Toyama', ja: '富山', ko: '도야마' },
  'JP-17': { en: 'Ishikawa', ja: '石川', ko: '이시카와' },
  'JP-18': { en: 'Fukui', ja: '福井', ko: '후쿠이' },
  'JP-19': { en: 'Yamanashi', ja: '山梨', ko: '야마나시' },
  'JP-20': { en: 'Nagano', ja: '長野', ko: '나가노' },
  'JP-21': { en: 'Gifu', ja: '岐阜', ko: '기후' },
  'JP-22': { en: 'Shizuoka', ja: '静岡', ko: '시즈오카' },
  'JP-23': { en: 'Aichi', ja: '愛知', ko: '아이치' },
  'JP-24': { en: 'Mie', ja: '三重', ko: '미에' },
  'JP-25': { en: 'Shiga', ja: '滋賀', ko: '시가' },
  'JP-26': { en: 'Kyoto', ja: '京都', ko: '교토' },
  'JP-27': { en: 'Osaka', ja: '大阪', ko: '오사카' },
  'JP-28': { en: 'Hyogo', ja: '兵庫', ko: '효고' },
  'JP-29': { en: 'Nara', ja: '奈良', ko: '나라' },
  'JP-30': { en: 'Wakayama', ja: '和歌山', ko: '와카야마' },
  'JP-31': { en: 'Tottori', ja: '鳥取', ko: '돗토리' },
  'JP-32': { en: 'Shimane', ja: '島根', ko: '시마네' },
  'JP-33': { en: 'Okayama', ja: '岡山', ko: '오카야마' },
  'JP-34': { en: 'Hiroshima', ja: '広島', ko: '히로시마' },
  'JP-35': { en: 'Yamaguchi', ja: '山口', ko: '야마구치' },
  'JP-36': { en: 'Tokushima', ja: '徳島', ko: '도쿠시마' },
  'JP-37': { en: 'Kagawa', ja: '香川', ko: '가가와' },
  'JP-38': { en: 'Ehime', ja: '愛媛', ko: '에히메' },
  'JP-39': { en: 'Kochi', ja: '高知', ko: '고치' },
  'JP-40': { en: 'Fukuoka', ja: '福岡', ko: '후쿠오카' },
  'JP-41': { en: 'Saga', ja: '佐賀', ko: '사가' },
  'JP-42': { en: 'Nagasaki', ja: '長崎', ko: '나가사키' },
  'JP-43': { en: 'Kumamoto', ja: '熊本', ko: '구마모토' },
  'JP-44': { en: 'Oita', ja: '大分', ko: '오이타' },
  'JP-45': { en: 'Miyazaki', ja: '宮崎', ko: '미야자키' },
  'JP-46': { en: 'Kagoshima', ja: '鹿児島', ko: '가고시마' },
  'JP-47': { en: 'Okinawa', ja: '沖縄', ko: '오키나와' },
}

export function isUsStateCode(part: string) {
  const code = part.replace(/[^A-Za-z]/g, '').toUpperCase()
  return /^[A-Z]{2}$/.test(code) && Boolean(US_STATE_NAMES[code])
}

export function resolveLanguageKey(language?: string): keyof PrefectureNames {
  const base = (language || 'en').toLowerCase().split('-')[0]
  if (base === 'ja' || base === 'ko') return base
  return 'en'
}

export function expandIsoSubdivisionCode(part: string, language?: string) {
  const code = part.trim().toUpperCase()
  const prefecture = JP_PREFECTURE_NAMES[code]
  if (!prefecture) return null
  return prefecture[resolveLanguageKey(language)]
}

export function formatLocationLabel(location: string, language?: string) {
  const trimmed = location.trim()
  if (!trimmed) return trimmed

  const commaParts = trimmed.split(',').map(part => part.trim()).filter(Boolean)
  if (commaParts.length < 2) return trimmed

  const lastPart = commaParts[commaParts.length - 1]
  if (isUsStateCode(lastPart)) {
    const stateCode = lastPart.replace(/[^A-Za-z]/g, '').toUpperCase()
    return [...commaParts.slice(0, -1), US_STATE_NAMES[stateCode]].join(', ')
  }

  const expanded = expandIsoSubdivisionCode(lastPart, language)
  if (expanded) {
    return [...commaParts.slice(0, -1), expanded].join(', ')
  }

  return trimmed
}

export function getLocationRegion(location: string, language?: string) {
  const trimmed = location.trim()
  if (!trimmed) return null

  const commaParts = trimmed.split(',').map(part => part.trim()).filter(Boolean)
  if (commaParts.length > 1) {
    const lastPart = commaParts[commaParts.length - 1]

    if (isUsStateCode(lastPart)) {
      const stateCode = lastPart.replace(/[^A-Za-z]/g, '').toUpperCase()
      return US_STATE_NAMES[stateCode]
    }

    // e.g. "成田市, JP-12" → Chiba / 千葉 / 치바
    const expanded = expandIsoSubdivisionCode(lastPart, language)
    if (expanded) return expanded

    return lastPart
  }

  const spaceParts = trimmed.split(/\s+/).filter(Boolean)
  if (spaceParts.length > 1) {
    return spaceParts[0]
  }

  return null
}


/** Detect the place-local language for ISO codes (JP → Japanese). */
export function detectLocalLocationLanguage(location: string): LocationLabelLanguage {
  const trimmed = location.trim()
  if (!trimmed) return 'en'
  const lastPart = trimmed.split(',').map(part => part.trim()).filter(Boolean).pop() || ''
  const code = lastPart.toUpperCase()
  if (JP_PREFECTURE_NAMES[code]) return 'ja'
  return 'en'
}

/** Resolve which language to use for labels given app language + toggle mode. */
export function resolveLocationLabelLanguage(
  location: string,
  appLanguage: string | undefined,
  mode: LocationNameMode = 'app',
): string {
  if (mode === 'local') return detectLocalLocationLanguage(location)
  return appLanguage || 'en'
}

export function formatLocationLabelForMode(
  location: string,
  appLanguage: string | undefined,
  mode: LocationNameMode = 'app',
) {
  return formatLocationLabel(location, resolveLocationLabelLanguage(location, appLanguage, mode))
}

export function getLocationRegionForMode(
  location: string,
  appLanguage: string | undefined,
  mode: LocationNameMode = 'app',
) {
  return getLocationRegion(location, resolveLocationLabelLanguage(location, appLanguage, mode))
}
