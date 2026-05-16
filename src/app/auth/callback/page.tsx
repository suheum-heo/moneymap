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
    <div className="min-h-screen bg-[#fafaf8] flex items-center justify-center p-6">
      <div className="w-full max-w-sm text-center">
        <h1 className="text-2xl font-bold text-zinc-900 mb-2">MoneyMap</h1>
        {status === 'loading' && (
          <p className="text-zinc-400 text-sm">Signing you in…</p>
        )}
        {status === 'success' && (
          <>
            <p className="text-zinc-500 text-sm mb-6">You're signed in! Tap below to open the app.</p>
            <button onClick={openApp}
              className="w-full py-3 rounded-xl bg-amber-500 text-white text-sm font-medium">
              Open MoneyMap
            </button>
            <p className="text-xs text-zinc-400 mt-3">Or open the app from your home screen</p>
          </>
        )}
        {status === 'error' && (
          <>
            <p className="text-red-400 text-sm mb-4">Something went wrong. Try signing in again.</p>
            <button onClick={openApp} className="w-full py-3 rounded-xl bg-zinc-200 text-zinc-700 text-sm font-medium">
              Back to MoneyMap
            </button>
          </>
        )}
      </div>
    </div>
  )
}
