'use client'
import { useRef, useCallback, useState } from 'react'

interface SwipeHandlers {
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
}

export function useSwipe({ onSwipeLeft, onSwipeRight }: SwipeHandlers) {
  const touchStartX = useRef<number | null>(null)
  const touchStartY = useRef<number | null>(null)
  const isHorizontal = useRef<boolean | null>(null)
  const [dragX, setDragX] = useState(0)
  const [isDragging, setIsDragging] = useState(false)

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
    isHorizontal.current = null
    setDragX(0)
  }, [])

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return
    const deltaX = e.touches[0].clientX - touchStartX.current
    const deltaY = e.touches[0].clientY - touchStartY.current

    if (isHorizontal.current === null && (Math.abs(deltaX) > 6 || Math.abs(deltaY) > 6)) {
      isHorizontal.current = Math.abs(deltaX) > Math.abs(deltaY)
    }

    if (isHorizontal.current) {
      e.preventDefault()
      setIsDragging(true)
      setDragX(deltaX)
    }
  }, [])

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null) return
    const deltaX = e.changedTouches[0].clientX - touchStartX.current

    if (isHorizontal.current && Math.abs(deltaX) > 50) {
      if (deltaX < 0) onSwipeLeft?.()
      else onSwipeRight?.()
    }

    setDragX(0)
    setIsDragging(false)
    touchStartX.current = null
    touchStartY.current = null
    isHorizontal.current = null
  }, [onSwipeLeft, onSwipeRight])

  return { onTouchStart, onTouchMove, onTouchEnd, dragX, isDragging }
}
