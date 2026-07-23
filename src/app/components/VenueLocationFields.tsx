'use client'

import { useCallback, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { looksLikeNaverMapUrl } from '../lib/naverPlace'

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
  const requestId = useRef(0)

  const fillFromNaverUrl = useCallback(
    async (raw: string) => {
      const url = raw.trim()
      if (!looksLikeNaverMapUrl(url)) return false

      const id = ++requestId.current
      setLookingUp(true)
      setLookupError('')
      try {
        const res = await fetch(`/api/naver-place?url=${encodeURIComponent(url)}`)
        const data = await res.json()
        if (id !== requestId.current) return true
        if (!res.ok || !data?.name) {
          setLookupError(t('naverMapLookupFailed'))
          return true
        }
        onVenueChange(data.name)
        if (data.location) onLocationChange(data.location)
        setLookupError('')
        return true
      } catch {
        if (id === requestId.current) setLookupError(t('naverMapLookupFailed'))
        return true
      } finally {
        if (id === requestId.current) setLookingUp(false)
      }
    },
    [onLocationChange, onVenueChange, t],
  )

  const handlePaste = async (event: React.ClipboardEvent<HTMLInputElement>) => {
    const text = event.clipboardData.getData('text')
    if (!looksLikeNaverMapUrl(text)) return
    event.preventDefault()
    await fillFromNaverUrl(text)
  }

  const handleVenueChange = async (value: string) => {
    onVenueChange(value)
    if (looksLikeNaverMapUrl(value)) {
      await fillFromNaverUrl(value)
    }
  }

  return (
    <div className="space-y-2">
      <div className={gridClassName}>
        <div>
          <label className="app-kicker mb-2 block">{t('venue')}</label>
          <input
            type="text"
            value={venue}
            onChange={e => { void handleVenueChange(e.target.value) }}
            onPaste={e => { void handlePaste(e) }}
            placeholder={placeholders.venue}
            className={inputCls}
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
            onPaste={e => { void handlePaste(e) }}
            placeholder={placeholders.location}
            className={inputCls}
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
