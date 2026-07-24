'use client'

import { useCallback, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  containsNaverMapLink,
  extractNaverPlaceId,
  findNaverMapUrlInText,
  parseNaverShareText,
  toLocationArea,
  type NaverPlaceInfo,
} from '../lib/naverPlace'

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
  if (!place.placeId) return
  try {
    const raw = sessionStorage.getItem(CLIENT_CACHE_KEY)
    const map = raw ? (JSON.parse(raw) as Record<string, NaverPlaceInfo>) : {}
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
  const lastHandled = useRef('')

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

  const lookupByUrl = useCallback(
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

  const fillFromNaverText = useCallback(
    async (raw: string) => {
      const text = raw.trim()
      if (!containsNaverMapLink(text)) return false
      if (lookingUp && text === lastHandled.current) return true
      lastHandled.current = text

      const id = ++requestId.current
      const share = parseNaverShareText(text)
      const url = share?.url || findNaverMapUrlInText(text)
      if (!url) return false

      // Share cards already include name + address — fill instantly, no Enter needed.
      if (share?.name && share.address) {
        applyPlace({
          name: share.name,
          address: share.address,
          location: toLocationArea(share.address),
          placeId: extractNaverPlaceId(url) || '',
        })
        setLookingUp(false)
        return true
      }

      if (share?.name && !share.address) {
        onVenueChange(share.name)
      }

      return lookupByUrl(url, id)
    },
    [applyPlace, lookupByUrl, lookingUp, onVenueChange],
  )

  const handlePaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    const text = event.clipboardData.getData('text')
    if (!containsNaverMapLink(text)) return
    event.preventDefault()
    void fillFromNaverText(text)
  }

  const handleVenueChange = (value: string) => {
    onVenueChange(value)
    if (containsNaverMapLink(value)) {
      void fillFromNaverText(value)
    }
  }

  const handleLocationChange = (value: string) => {
    onLocationChange(value)
    if (containsNaverMapLink(value)) {
      void fillFromNaverText(value)
    }
  }

  const handleBlur = (value: string) => {
    if (containsNaverMapLink(value)) {
      void fillFromNaverText(value)
    }
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
