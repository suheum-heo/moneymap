'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { formatMonthYear, getMonthLabels } from '../types'
import ChevronDownIcon from './ChevronDownIcon'

interface Props {
  value: string
  onChange: (value: string) => void
  placeholder: string
}

function parseMonthValue(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})$/)
  if (!match) return null

  const year = Number(match[1])
  const month = Number(match[2])
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) return null

  return { year, month }
}

function toMonthValue(year: number, month: number) {
  return `${year}-${String(month).padStart(2, '0')}`
}

export default function LocalizedMonthPicker({ value, onChange, placeholder }: Props) {
  const { t, i18n } = useTranslation()
  const language = i18n.resolvedLanguage || i18n.language
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [open, setOpen] = useState(false)
  const parsedValue = parseMonthValue(value)
  const today = new Date()
  const currentYear = today.getFullYear()
  const currentMonthValue = toMonthValue(currentYear, today.getMonth() + 1)
  const [displayYear, setDisplayYear] = useState(parsedValue?.year || currentYear)

  useEffect(() => {
    if (!open) return
    setDisplayYear(parsedValue?.year || currentYear)
  }, [currentYear, open, parsedValue?.year])

  useEffect(() => {
    if (!open) return

    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [open])

  const monthLabels = useMemo(() => getMonthLabels(language), [language])
  const yearOptions = useMemo(() => {
    return Array.from({ length: 201 }, (_, index) => 1900 + index)
  }, [])

  const selectMonth = (month: number) => {
    onChange(toMonthValue(displayYear, month))
    setOpen(false)
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        className="app-input flex w-full items-center justify-between py-3 text-left text-sm"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span className={value ? 'text-slate-900 dark:text-zinc-50' : 'text-slate-400'}>
          {value ? formatMonthYear(value, language) : placeholder}
        </span>
        <ChevronDownIcon className={`h-4 w-4 flex-shrink-0 text-slate-400 transition-transform dark:text-slate-500 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 right-0 z-30 mt-2 rounded-[24px] border border-slate-200/85 bg-white p-3 shadow-[0_22px_48px_-26px_rgba(15,23,42,0.22)] dark:border-white/10 dark:bg-slate-950/95">
          <div className="mb-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setDisplayYear(year => year - 1)}
              className="app-button-secondary !px-0 !py-0 flex h-10 w-10 items-center justify-center text-base"
              aria-label={t('previousYear')}
            >
              ‹
            </button>
            <div className="relative flex-1">
              <select
                value={displayYear}
                onChange={e => setDisplayYear(Number(e.target.value))}
                className="app-select flex-1 w-full appearance-none px-3 py-2 pr-10 text-sm"
                style={{ fontSize: '16px' }}
                aria-label={t('year')}
              >
                {yearOptions.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                <ChevronDownIcon className="h-4 w-4 text-slate-400 dark:text-slate-500" />
              </span>
            </div>
            <button
              type="button"
              onClick={() => setDisplayYear(year => year + 1)}
              className="app-button-secondary !px-0 !py-0 flex h-10 w-10 items-center justify-center text-base"
              aria-label={t('nextYear')}
            >
              ›
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {monthLabels.map((label, index) => {
              const month = index + 1
              const isSelected = parsedValue?.year === displayYear && parsedValue?.month === month
              return (
                <button
                  key={`${displayYear}-${month}`}
                  type="button"
                  onClick={() => selectMonth(month)}
                  className={`rounded-[18px] px-3 py-3 text-sm transition-all ${
                    isSelected
                      ? 'border border-[#3182f6] bg-[#3182f6] text-white font-medium shadow-[0_12px_22px_-16px_rgba(49,130,246,0.72)]'
                      : 'border border-slate-200/80 bg-slate-50 text-slate-700 dark:border-white/10 dark:bg-slate-900/70 dark:text-zinc-300'
                  }`}
                >
                  {label}
                </button>
              )
            })}
          </div>

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => {
                onChange('')
                setOpen(false)
              }}
              className="app-button-secondary flex-1"
            >
              {t('clear')}
            </button>
            <button
              type="button"
              onClick={() => {
                onChange(currentMonthValue)
                setDisplayYear(currentYear)
                setOpen(false)
              }}
              className="app-button-primary flex-1"
            >
              {t('thisMonth')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
