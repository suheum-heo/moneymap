'use client'

import { useCallback, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { extractNaverPlaceId, looksLikeNaverMapUrl, type NaverPlaceInfo } from '../lib/naverPlace'

const CLIENT_CACHE_KEY = 'naver-place-cache-v1'

function readClientCache(placeId: string): NaverPlaceInfo | null {
  try {
    const raw = sessionStorage.getItem(CLIENT_CACHE_KEY)
    if (!raw) return null
    const map = JSON.parse(raw) as Record<string, NaverPlaceInfo>
    return map[placeId] || null
  } catch {
    return null
  }
}

function writeClientCache(place: NaverPlaceInfo) {
  try {
    const raw = sessionStorage.getItem(CLIENT_CACHE_KEY)
    const map = raw ? (JSON.parse(raw) as Record<string, NaverPlaceInfo>) : {}
    map[place.placeId] = place
    sessionStorage.setItem(CLIENT_CACHE_KEY, JSON.stringify(map))
  } catch {
    // ignore quota / private mode
  }
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
  gridClassName = 'grid grid-cols-2 gap-3',
}: Props) {
  const { t } = useTranslation()
  const [lookingUp, setLookingUp] = useState(false)
  const [lookupError, setLookupError] = useState('')
  const [boom, setBoom] = useState(false)
  const requestId = useRef(0)
  const boomTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const triggerBoom = useCallback(() => {
    setBoom(true)
    if (boomTimer.current) clearTimeout(boomTimer.current)
    boomTimer.current = setTimeout(() => setBoom(false), 420)
  }, [])

  const applyPlace = useCallback(
    (data: NaverPlaceInfo) => {
      onVenueChange(data.name)
      if (data.location) onLocationChange(data.location)
      triggerBoom()
      writeClientCache(data)
      setLookupError('')
    },
    [onLocationChange, onVenueChange, triggerBoom],
  )

  const fillFromNaverUrl = useCallback(
    async (raw: string) => {
      const url = raw.trim()
      if (!looksLikeNaverMapUrl(url)) return false

      const placeId = extractNaverPlaceId(url)
      const id = ++requestId.current

      // Instant boom from session cache when possible.
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

      // Kick off network immediately; prefer id for faster server cache hits.
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
        applyPlace(data as NaverPlaceInfo)
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

  const handlePaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    const text = event.clipboardData.getData('text')
    if (!looksLikeNaverMapUrl(text)) return
    event.preventDefault()
    void fillFromNaverUrl(text)
  }

  const handleVenueChange = (value: string) => {
    onVenueChange(value)
    if (looksLikeNaverMapUrl(value)) {
      void fillFromNaverUrl(value)
    }
  }

  const fieldCls = [
    inputCls,
    lookingUp ? 'naver-place-loading' : '',
    boom ? 'naver-place-boom' : '',
  ].filter(Boolean).join(' ')

  return (
    <div className="space-y-2">
      <div className={gridClassName}>
        <div>
          <label className="app-kicker mb-2 block">{t('venue')}</label>
          <input
            type="text"
            value={venue}
            onChange={e => handleVenueChange(e.target.value)}
            onPaste={handlePaste}
            placeholder={lookingUp ? t('naverMapLookingUp') : placeholders.venue}
            className={fieldCls}
            style={{ fontSize: '16px' }}
            list={venueListId}
            autoComplete="off"
          />
        </div>
        <div>
          <label className="app-kicker mb-2 block">{t('location')}</label>
          <input
            type="text"
            value={location}
            onChange={e => onLocationChange(e.target.value)}
            onPaste={handlePaste}
            placeholder={lookingUp ? t('naverMapLookingUp') : placeholders.location}
            className={fieldCls}
            style={{ fontSize: '16px' }}
            list={locationListId}
            autoComplete="off"
          />
        </div>
      </div>
      <p className="text-xs text-slate-400 dark:text-zinc-500">
        {lookingUp ? t('naverMapLookingUp') : t('naverMapUrlHint')}
      </p>
      {lookupError && <p className="text-xs text-rose-500">{lookupError}</p>}
    </div>
  )
}
