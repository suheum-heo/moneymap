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
    setIsDragging(false)
    setDragX(0)
  }, [])

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return
    const deltaX = e.touches[0].clientX - touchStartX.current
    const deltaY = e.touches[0].clientY - touchStartY.current

    // Determine direction on first significant move
    if (isHorizontal.current === null && (Math.abs(deltaX) > 8 || Math.abs(deltaY) > 8)) {
      isHorizontal.current = Math.abs(deltaX) > Math.abs(deltaY)
    }

    if (isHorizontal.current) {
      e.preventDefault() // prevent page scroll while swiping horizontally
      setIsDragging(true)
      setDragX(deltaX)
    }
  }, [])

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null) return
    const deltaX = e.changedTouches[0].clientX - touchStartX.current

    if (isHorizontal.current && Math.abs(deltaX) > 80) {
      // Animate out then switch
      if (deltaX < 0) {
        setDragX(-window.innerWidth)
        setTimeout(() => { setDragX(0); setIsDragging(false); onSwipeLeft?.() }, 200)
      } else {
        setDragX(window.innerWidth)
        setTimeout(() => { setDragX(0); setIsDragging(false); onSwipeRight?.() }, 200)
      }
    } else {
      // Snap back
      setDragX(0)
      setIsDragging(false)
    }

    touchStartX.current = null
    touchStartY.current = null
    isHorizontal.current = null
  }, [onSwipeLeft, onSwipeRight])

  return { onTouchStart, onTouchMove, onTouchEnd, dragX, isDragging }
}
