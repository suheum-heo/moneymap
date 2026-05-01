'use client'
import { useRef, useCallback, useState } from 'react'

interface SwipeHandlers {
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
}

export function useSwipe({ onSwipeLeft, onSwipeRight }: SwipeHandlers) {
  const touchStartX = useRef<number | null>(null)
  const touchStartY = useRef<number | null>(null)
  const [dragX, setDragX] = useState(0)
  const [isDragging, setIsDragging] = useState(false)

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
    setIsDragging(true)
    setDragX(0)
  }, [])

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return
    const deltaX = e.touches[0].clientX - touchStartX.current
    const deltaY = e.touches[0].clientY - touchStartY.current
    // Only track horizontal swipes
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      setDragX(deltaX * 0.4) // dampen the drag effect
    }
  }, [])

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return
    const deltaX = e.changedTouches[0].clientX - touchStartX.current
    const deltaY = e.changedTouches[0].clientY - touchStartY.current

    setDragX(0)
    setIsDragging(false)

    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 60) {
      if (deltaX < 0) onSwipeLeft?.()
      else onSwipeRight?.()
    }

    touchStartX.current = null
    touchStartY.current = null
  }, [onSwipeLeft, onSwipeRight])

  return { onTouchStart, onTouchMove, onTouchEnd, dragX, isDragging }
}
