'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function AuthCallback() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setStatus('success')
      else setStatus('error')
    })
  }, [])

  const openApp = () => {
    window.location.href = 'https://moneymap-io.vercel.app'
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm text-center">
        <div className="app-panel px-6 py-7">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-[18px] bg-indigo-50 text-2xl text-indigo-500 shadow-[0_18px_28px_-20px_rgba(92,108,255,0.45)]">◎</div>
          <h1 className="mb-2 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">MoneyMap</h1>
          {status === 'loading' && (
            <p className="text-zinc-400 text-sm">Signing you in…</p>
          )}
          {status === 'success' && (
            <>
              <p className="text-zinc-500 text-sm mb-6">You're signed in! Tap below to open the app.</p>
              <button onClick={openApp}
                className="app-button-primary w-full">
                Open MoneyMap
              </button>
              <p className="text-xs text-zinc-400 mt-3">Or open the app from your home screen</p>
            </>
          )}
          {status === 'error' && (
            <>
              <p className="text-red-400 text-sm mb-4">Something went wrong. Try signing in again.</p>
              <button onClick={openApp} className="app-button-secondary w-full">
                Back to MoneyMap
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
