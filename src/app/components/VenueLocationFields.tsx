'use client'

import { useCallback, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  containsGoogleMapsLink,
  findGoogleMapsUrlInText,
  parseGoogleMapsUrl,
  parseGoogleShareText,
  normalizeGooglePlaceFields,
  splitNameAndAddress,
  toGoogleLocationArea,
  type GooglePlaceInfo,
} from '../lib/googlePlace'
import {
  containsNaverMapLink,
  extractNaverPlaceId,
  findNaverMapUrlInText,
  parseNaverShareText,
  toLocationArea,
  type NaverPlaceInfo,
} from '../lib/naverPlace'
import {
  normalizePlaceSuggestionKey,
  type VenueLocationOption,
} from '../lib/placeSuggestions'

type PlaceInfo = NaverPlaceInfo | GooglePlaceInfo

const CLIENT_CACHE_KEY = 'map-place-cache-v1'

function readClientCache(placeId: string): PlaceInfo | null {
  if (!placeId) return null
  try {
    const raw = sessionStorage.getItem(CLIENT_CACHE_KEY)
    if (!raw) return null
    const map = JSON.parse(raw) as Record<string, PlaceInfo>
    return map[placeId] || null
  } catch {
    return null
  }
}

function writeClientCache(place: PlaceInfo) {
  if (!place.placeId) return
  try {
    const raw = sessionStorage.getItem(CLIENT_CACHE_KEY)
    const map = raw ? (JSON.parse(raw) as Record<string, PlaceInfo>) : {}
    map[place.placeId] = place
    sessionStorage.setItem(CLIENT_CACHE_KEY, JSON.stringify(map))
  } catch {
    // ignore quota / private mode
  }
}

function PlaceSpinner({ className = '' }: { className?: string }) {
  return (
    <span
      className={`naver-place-spinner inline-block shrink-0 rounded-full border-2 border-current border-t-transparent ${className}`}
      aria-hidden
    />
  )
}

function containsMapLink(text: string): boolean {
  return containsNaverMapLink(text) || containsGoogleMapsLink(text)
}

function extractMapsHrefFromHtml(html: string): string {
  if (!html) return ''
  const match = html.match(
    /href=["'](https?:\/\/[^"']*(?:google\.com\/maps|maps\.app\.goo\.gl|maps\.google\.com|goo\.gl\/maps)[^"']*)["']/i,
  )
  return match?.[1] || ''
}

function getPasteText(event: React.ClipboardEvent<HTMLInputElement>) {
  const clipboard = event.clipboardData
  const html = clipboard.getData('text/html')
  const candidates = [
    clipboard.getData('text/plain'),
    clipboard.getData('text'),
    clipboard.getData('URL'),
    clipboard.getData('text/uri-list'),
    extractMapsHrefFromHtml(html),
    html,
  ]
    .map(text => text.trim())
    .filter(Boolean)

  return candidates.find(text => containsMapLink(text)) || candidates[0] || ''
}

async function readSystemClipboardText() {
  if (typeof navigator === 'undefined' || !navigator.clipboard?.readText) return ''
  try {
    return await navigator.clipboard.readText()
  } catch {
    return ''
  }
}

function shouldRetryMapPasteFromClipboard(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return false
  return /네이버\s*지도/i.test(trimmed)
    || /naver/i.test(trimmed)
    || /google|maps\.app\.goo|goo\.gl|maps\.google/i.test(trimmed)
    || /^(서울|부산|대구|인천|광주|대전|울산|세종|제주|경기|강원|충북|충남|전북|전남|경북|경남|서울특별시|부산광역시|대구광역시|인천광역시|광주광역시|대전광역시|울산광역시|세종특별자치시|제주특별자치도|경기도|강원도|충청북도|충청남도|전라북도|전라남도|경상북도|경상남도)\s+\S+/.test(trimmed)
}

function canFillFromPastedText(text: string) {
  if (containsMapLink(text)) return true
  const naverShare = parseNaverShareText(text)
  if (naverShare?.name && naverShare.address) return true
  const googleShare = parseGoogleShareText(text)
  if (googleShare?.name && googleShare.address) return true
  return Boolean(splitNameAndAddress(text.trim()))
}

interface Props {
  venue: string
  location: string
  onVenueChange: (value: string) => void
  onLocationChange: (value: string) => void
  placeholders: { venue: string; location: string }
  inputCls: string
  venueListId?: string
  locationListId?: string
  venueLocationOptions?: VenueLocationOption[]
  gridClassName?: string
}

export default function VenueLocationFields({
  venue,
  location,
  onVenueChange,
  onLocationChange,
  placeholders,
  inputCls,
  venueListId,
  locationListId,
  venueLocationOptions = [],
  gridClassName = 'grid grid-cols-2 gap-3',
}: Props) {
  const { t } = useTranslation()
  const [lookingUp, setLookingUp] = useState(false)
  const [lookupError, setLookupError] = useState('')
  const [boom, setBoom] = useState(false)
  const requestId = useRef(0)
  const boomTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastHandled = useRef('')
  const lastClipboardRetry = useRef('')
  const lastPasteAt = useRef(0)

  const triggerBoom = useCallback(() => {
    setBoom(true)
    if (boomTimer.current) clearTimeout(boomTimer.current)
    boomTimer.current = setTimeout(() => setBoom(false), 420)
  }, [])

  const applyPlace = useCallback(
    (data: PlaceInfo) => {
      const normalized = normalizeGooglePlaceFields(data)
      if (normalized.name) onVenueChange(normalized.name)
      if (normalized.location) onLocationChange(normalized.location)
      triggerBoom()
      writeClientCache({ ...data, ...normalized })
      setLookupError('')
    },
    [onLocationChange, onVenueChange, triggerBoom],
  )

  const lookupNaverByUrl = useCallback(
    async (url: string, id: number) => {
      const placeId = extractNaverPlaceId(url)
      if (placeId) {
        const cached = readClientCache(placeId)
        if (cached) {
          applyPlace(cached)
          setLookingUp(false)
          return true
        }
      }

      setLookingUp(true)
      setLookupError('')
      const endpoint = placeId
        ? `/api/naver-place?id=${encodeURIComponent(placeId)}`
        : `/api/naver-place?url=${encodeURIComponent(url)}`

      try {
        const res = await fetch(endpoint)
        const data = await res.json()
        if (id !== requestId.current) return true
        if (!res.ok || !data?.name) {
          setLookupError(t('naverMapLookupFailed'))
          return true
        }
        applyPlace(data as PlaceInfo)
        return true
      } catch {
        if (id === requestId.current) setLookupError(t('naverMapLookupFailed'))
        return true
      } finally {
        if (id === requestId.current) setLookingUp(false)
      }
    },
    [applyPlace, t],
  )

  const lookupGoogleByUrl = useCallback(
    async (url: string, id: number, hint?: { name?: string; address?: string }) => {
      const parsed = parseGoogleMapsUrl(url)
      const cacheKey = parsed.placeId
      if (cacheKey) {
        const cached = readClientCache(cacheKey)
        if (cached) {
          applyPlace(cached)
          setLookingUp(false)
          return true
        }
      }

      // Optimistic fill from URL / share text while geocoding runs.
      const optimistic = normalizeGooglePlaceFields({
        name: hint?.name || parsed.name,
        address: hint?.address || parsed.address,
      })
      const optimisticAddress = optimistic.address
      if (optimistic.name) onVenueChange(optimistic.name)
      if (optimistic.location) onLocationChange(optimistic.location)

      setLookingUp(true)
      setLookupError('')

      try {
        const res = await fetch(`/api/google-place?url=${encodeURIComponent(url)}`)
        const data = await res.json()
        if (id !== requestId.current) return true
        if (!res.ok || (!data?.name && !data?.location && !optimisticAddress)) {
          // Keep optimistic values if API fails but we already filled something.
          if (!(hint?.name || parsed.name || optimisticAddress)) {
            setLookupError(t('naverMapLookupFailed'))
          }
          return true
        }
        applyPlace({
          name: data.name || hint?.name || parsed.name || '',
          location: data.location || (optimisticAddress ? toGoogleLocationArea(optimisticAddress) : ''),
          address: data.address || optimisticAddress || '',
          placeId: data.placeId || cacheKey || '',
        })
        return true
      } catch {
        if (id === requestId.current && !(hint?.name || parsed.name || optimisticAddress)) {
          setLookupError(t('naverMapLookupFailed'))
        }
        // Keep optimistic address fill even if the network call fails.
        if (optimisticAddress && id === requestId.current) {
          applyPlace({
            name: hint?.name || parsed.name || '',
            location: toGoogleLocationArea(optimisticAddress),
            address: optimisticAddress,
            placeId: cacheKey || '',
          })
        }
        return true
      } finally {
        if (id === requestId.current) setLookingUp(false)
      }
    },
    [applyPlace, onLocationChange, onVenueChange, t],
  )

  const fillFromMapText = useCallback(
    async (raw: string) => {
      const text = raw.trim()
      if (lookingUp && text === lastHandled.current) return true
      lastHandled.current = text

      const id = ++requestId.current
      const naverShare = parseNaverShareText(text)

      if (naverShare?.name && naverShare.address) {
        applyPlace({
          name: naverShare.name,
          address: naverShare.address,
          location: toLocationArea(naverShare.address),
          placeId: naverShare.url ? extractNaverPlaceId(naverShare.url) || '' : '',
        })
        setLookingUp(false)
        return true
      }

      const googleShare = parseGoogleShareText(text)
      if (googleShare?.name && googleShare.address) {
        applyPlace({
          name: googleShare.name,
          address: googleShare.address,
          location: toGoogleLocationArea(googleShare.address),
          placeId: googleShare.url ? parseGoogleMapsUrl(googleShare.url).placeId || '' : '',
        })
        setLookingUp(false)
        // Optional URL lookup can refine coords later; share text is enough for venue/location.
        if (googleShare.url && containsGoogleMapsLink(googleShare.url)) {
          void lookupGoogleByUrl(googleShare.url, id, {
            name: googleShare.name,
            address: googleShare.address,
          })
        }
        return true
      }

      const embedded = splitNameAndAddress(text)
      if (embedded && !containsMapLink(text)) {
        applyPlace({
          name: embedded.name,
          address: embedded.address,
          location: toGoogleLocationArea(embedded.address),
          placeId: '',
        })
        setLookingUp(false)
        return true
      }

      if (!containsMapLink(text)) return false

      if (containsNaverMapLink(text)) {
        const url = naverShare?.url || findNaverMapUrlInText(text)
        if (!url) return false

        if (naverShare?.name && !naverShare.address) onVenueChange(naverShare.name)
        return lookupNaverByUrl(url, id)
      }

      if (containsGoogleMapsLink(text)) {
        const url = googleShare?.url || findGoogleMapsUrlInText(text)
        if (!url) return false
        return lookupGoogleByUrl(url, id, { name: googleShare?.name, address: googleShare?.address })
      }

      return false
    },
    [applyPlace, lookingUp, lookupGoogleByUrl, lookupNaverByUrl, onVenueChange],
  )

  const retryFromSystemClipboard = useCallback(
    async (currentValue: string) => {
      const retryKey = currentValue.trim()
      if (!retryKey || retryKey === lastClipboardRetry.current) return false
      lastClipboardRetry.current = retryKey

      const clipboardText = await readSystemClipboardText()
      if (!clipboardText || clipboardText.trim() === retryKey || !containsMapLink(clipboardText)) return false
      return fillFromMapText(clipboardText)
    },
    [fillFromMapText],
  )

  const handlePaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    lastPasteAt.current = Date.now()
    const text = getPasteText(event)
    if (!canFillFromPastedText(text)) {
      if (!text) {
        void readSystemClipboardText().then(clipboardText => {
          if (canFillFromPastedText(clipboardText)) void fillFromMapText(clipboardText)
        })
      }
      return
    }
    event.preventDefault()
    void fillFromMapText(text)
  }

  const fillLocationFromSavedVenue = useCallback(
    (value: string) => {
      const venueKey = normalizePlaceSuggestionKey(value)
      if (!venueKey) return

      const matchingLocations = new Map<string, string>()
      venueLocationOptions.forEach(option => {
        if (normalizePlaceSuggestionKey(option.venue) !== venueKey) return
        const nextLocation = option.location.trim()
        const locationKey = normalizePlaceSuggestionKey(nextLocation)
        if (!locationKey || matchingLocations.has(locationKey)) return
        matchingLocations.set(locationKey, nextLocation)
      })

      if (matchingLocations.size !== 1) return
      const [nextLocation] = matchingLocations.values()
      if (nextLocation !== location) onLocationChange(nextLocation)
    },
    [location, onLocationChange, venueLocationOptions],
  )

  const handleVenueChange = (value: string) => {
    onVenueChange(value)
    if (containsMapLink(value)) {
      void fillFromMapText(value)
      return
    }
    if (canFillFromPastedText(value)) {
      void fillFromMapText(value)
      return
    }
    if (Date.now() - lastPasteAt.current < 2500 && shouldRetryMapPasteFromClipboard(value)) {
      void retryFromSystemClipboard(value)
    }
    fillLocationFromSavedVenue(value)
  }

  const handleLocationChange = (value: string) => {
    onLocationChange(value)
    if (containsMapLink(value)) {
      void fillFromMapText(value)
      return
    }
    if (canFillFromPastedText(value)) {
      void fillFromMapText(value)
      return
    }
    if (Date.now() - lastPasteAt.current < 2500 && shouldRetryMapPasteFromClipboard(value)) {
      void retryFromSystemClipboard(value)
    }
  }

  const handleBlur = (value: string) => {
    if (canFillFromPastedText(value)) void fillFromMapText(value)
  }

  const fieldCls = [
    inputCls,
    lookingUp ? 'naver-place-loading pr-10' : '',
    boom ? 'naver-place-boom' : '',
  ].filter(Boolean).join(' ')

  return (
    <div className="space-y-2" aria-busy={lookingUp}>
      {lookingUp && (
        <div
          className="naver-place-status flex items-center gap-2 rounded-[16px] border border-[#cfe0ff] bg-[#eef5ff] px-3 py-2 text-xs font-medium text-[#1f5fbf] dark:border-sky-400/20 dark:bg-sky-500/10 dark:text-sky-300"
          role="status"
        >
          <PlaceSpinner className="h-3.5 w-3.5 text-[#3182f6] dark:text-sky-300" />
          <span>{t('naverMapLookingUp')}</span>
        </div>
      )}

      <div className={gridClassName}>
        <div>
          <label className="app-kicker mb-2 block">{t('venue')}</label>
          <div className="relative">
            <input
              type="text"
              value={venue}
              onChange={e => handleVenueChange(e.target.value)}
              onPaste={handlePaste}
              onBlur={e => handleBlur(e.target.value)}
              placeholder={lookingUp ? t('naverMapLookingUp') : placeholders.venue}
              className={fieldCls}
              style={{ fontSize: '16px' }}
              list={venueListId}
              autoComplete="off"
              disabled={lookingUp}
            />
            {lookingUp && (
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                <PlaceSpinner className="h-4 w-4 text-[#3182f6] dark:text-sky-300" />
              </span>
            )}
          </div>
        </div>
        <div>
          <label className="app-kicker mb-2 block">{t('location')}</label>
          <div className="relative">
            <input
              type="text"
              value={location}
              onChange={e => handleLocationChange(e.target.value)}
              onPaste={handlePaste}
              onBlur={e => handleBlur(e.target.value)}
              placeholder={lookingUp ? t('naverMapLookingUp') : placeholders.location}
              className={fieldCls}
              style={{ fontSize: '16px' }}
              list={locationListId}
              autoComplete="off"
              disabled={lookingUp}
            />
            {lookingUp && (
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                <PlaceSpinner className="h-4 w-4 text-[#3182f6] dark:text-sky-300" />
              </span>
            )}
          </div>
        </div>
      </div>

      {!lookingUp && (
        <p className="text-xs text-slate-400 dark:text-zinc-500">{t('naverMapUrlHint')}</p>
      )}
      {lookupError && <p className="text-xs text-rose-500">{lookupError}</p>}
    </div>
  )
}
