/** Optional bilingual labels stored with an entry (remarks meta). */
export interface LocationNames {
  locationLocal?: string
  locationEn?: string
}

const HANGUL_RE = /[\uac00-\ud7a3]/
const JAPANESE_RE = /[\u3040-\u30ff\u4e00-\u9fff]/

/** Common Korean admin labels → English (Naver location areas). */
const KR_ADMIN_EN: Record<string, string> = {
  서울: 'Seoul',
  서울특별시: 'Seoul',
  부산: 'Busan',
  부산광역시: 'Busan',
  대구: 'Daegu',
  대구광역시: 'Daegu',
  인천: 'Incheon',
  인천광역시: 'Incheon',
  광주: 'Gwangju',
  광주광역시: 'Gwangju',
  대전: 'Daejeon',
  대전광역시: 'Daejeon',
  울산: 'Ulsan',
  울산광역시: 'Ulsan',
  세종: 'Sejong',
  세종특별자치시: 'Sejong',
  제주: 'Jeju',
  제주특별자치도: 'Jeju',
  제주도: 'Jeju',
  경기: 'Gyeonggi',
  경기도: 'Gyeonggi',
  강원: 'Gangwon',
  강원도: 'Gangwon',
  강원특별자치도: 'Gangwon',
  충북: 'North Chungcheong',
  충청북도: 'North Chungcheong',
  충남: 'South Chungcheong',
  충청남도: 'South Chungcheong',
  전북: 'North Jeolla',
  전라북도: 'North Jeolla',
  전북특별자치도: 'North Jeolla',
  전남: 'South Jeolla',
  전라남도: 'South Jeolla',
  경북: 'North Gyeongsang',
  경상북도: 'North Gyeongsang',
  경남: 'South Gyeongsang',
  경상남도: 'South Gyeongsang',
}

/** Frequent district / city suffixes seen in Naver short areas. */
const KR_DISTRICT_EN: Record<string, string> = {
  강남구: 'Gangnam-gu',
  강동구: 'Gangdong-gu',
  강북구: 'Gangbuk-gu',
  강서구: 'Gangseo-gu',
  관악구: 'Gwanak-gu',
  광진구: 'Gwangjin-gu',
  구로구: 'Guro-gu',
  금천구: 'Geumcheon-gu',
  노원구: 'Nowon-gu',
  도봉구: 'Dobong-gu',
  동대문구: 'Dongdaemun-gu',
  동작구: 'Dongjak-gu',
  마포구: 'Mapo-gu',
  서대문구: 'Seodaemun-gu',
  서초구: 'Seocho-gu',
  성동구: 'Seongdong-gu',
  성북구: 'Seongbuk-gu',
  송파구: 'Songpa-gu',
  양천구: 'Yangcheon-gu',
  영등포구: 'Yeongdeungpo-gu',
  용산구: 'Yongsan-gu',
  은평구: 'Eunpyeong-gu',
  종로구: 'Jongno-gu',
  중구: 'Jung-gu',
  중랑구: 'Jungnang-gu',
  수원시: 'Suwon',
  성남시: 'Seongnam',
  고양시: 'Goyang',
  용인시: 'Yongin',
  부천시: 'Bucheon',
  안산시: 'Ansan',
  안양시: 'Anyang',
  남양주시: 'Namyangju',
  화성시: 'Hwaseong',
  평택시: 'Pyeongtaek',
  의정부시: 'Uijeongbu',
  시흥시: 'Siheung',
  파주시: 'Paju',
  김포시: 'Gimpo',
  광명시: 'Gwangmyeong',
  광주시: 'Gwangju',
  군포시: 'Gunpo',
  하남시: 'Hanam',
  오산시: 'Osan',
  이천시: 'Icheon',
  안성시: 'Anseong',
  의왕시: 'Uiwang',
  양주시: 'Yangju',
  구리시: 'Guri',
  포천시: 'Pocheon',
  여주시: 'Yeoju',
  동두천시: 'Dongducheon',
  과천시: 'Gwacheon',
  가평군: 'Gapyeong',
  양평군: 'Yangpyeong',
  연천군: 'Yeoncheon',
  분당구: 'Bundang-gu',
  수정구: 'Sujeong-gu',
  중원구: 'Jungwon-gu',
  일산동구: 'Ilsandong-gu',
  일산서구: 'Ilsanseo-gu',
  덕양구: 'Deogyang-gu',
  영통구: 'Yeongtong-gu',
  팔달구: 'Paldal-gu',
  권선구: 'Gwonseon-gu',
  장안구: 'Jangan-gu',
  기흥구: 'Giheung-gu',
  수지구: 'Suji-gu',
  처인구: 'Cheoin-gu',
  해운대구: 'Haeundae-gu',
  수영구: 'Suyeong-gu',
  부산진구: 'Busanjin-gu',
  동래구: 'Dongnae-gu',
  남구: 'Nam-gu',
  북구: 'Buk-gu',
  서구: 'Seo-gu',
  동구: 'Dong-gu',
  연제구: 'Yeonje-gu',
  사상구: 'Sasang-gu',
  사하구: 'Saha-gu',
  금정구: 'Geumjeong-gu',
  강서구부산: 'Gangseo-gu',
  기장군: 'Gijang',
  제주시: 'Jeju-si',
  서귀포시: 'Seogwipo',
}

export function looksLikeHangul(text: string) {
  return HANGUL_RE.test(text)
}

export function looksLikeJapanese(text: string) {
  return JAPANESE_RE.test(text)
}

/** Build "成田市, 千葉" / "Narita, Chiba" from city + resolved prefecture label. */
export function formatJpCityPrefecture(city: string, prefectureLabel: string) {
  const cityClean = city.trim()
  const pref = prefectureLabel.trim()
  if (cityClean && pref) return `${cityClean}, ${pref}`
  return cityClean || pref || ''
}

/** Best-effort English for a Korean short area like "서울 강남구". */
export function koreanAreaToEnglish(area: string): string {
  const parts = area.replace(/,/g, ' ').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean)
  if (parts.length === 0) return ''

  const translated = parts.map(part => KR_DISTRICT_EN[part] || KR_ADMIN_EN[part] || '')
  if (translated.every(Boolean)) {
    // "Gangnam-gu, Seoul" reads more naturally than "Seoul Gangnam-gu".
    if (parts.length === 2 && KR_ADMIN_EN[parts[0]] && KR_DISTRICT_EN[parts[1]]) {
      return `${translated[1]}, ${translated[0]}`
    }
    if (parts.length === 3 && KR_ADMIN_EN[parts[0]] && KR_DISTRICT_EN[parts[1]] && KR_DISTRICT_EN[parts[2]]) {
      return `${translated[2]}, ${translated[1]}, ${translated[0]}`
    }
    return translated.join(' ')
  }

  // Partial: translate what we can, keep unknown Hangul tokens.
  const mixed = parts.map((part, i) => translated[i] || part)
  if (mixed.some((part, i) => part !== parts[i])) return mixed.join(' ')
  return ''
}

export function normalizeLocationNames(names?: LocationNames | null): LocationNames {
  const locationLocal = (names?.locationLocal || '').trim()
  const locationEn = (names?.locationEn || '').trim()
  return {
    ...(locationLocal ? { locationLocal } : {}),
    ...(locationEn ? { locationEn } : {}),
  }
}
