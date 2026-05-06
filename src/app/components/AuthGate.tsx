'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { User } from '@supabase/supabase-js'

interface Props { children: (user: User) => React.ReactNode }

export default function AuthGate({ children }: Props) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  const signIn = async () => {
    setError('')
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin }
    })
    if (error) setError(error.message)
    else setSent(true)
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen text-zinc-400 text-sm">Loading…</div>
  )

  if (!user) return (
    <div className="min-h-screen bg-[#fafaf8] dark:bg-[#0f0f0d] flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold ...">MoneyMap</h1>
          <p className="text-zinc-400 text-sm">Personal budget tracker</p>
        </div>
        {sent ? (
          <div className="bg-zinc-100 dark:bg-zinc-800 rounded-2xl p-6 text-center">
            <div className="text-2xl mb-3">📧</div>
            <div className="text-sm font-medium text-zinc-800 dark:text-zinc-100 mb-2">Check your email</div>
            <div className="text-xs text-zinc-400">We sent a magic link to <span className="font-medium text-zinc-600 dark:text-zinc-300">{email}</span></div>
            <button onClick={() => setSent(false)} className="mt-4 text-xs text-amber-500">Use a different email</button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 outline-none focus:border-amber-400 text-sm"
              style={{ fontSize: '16px' }}
              onKeyDown={e => e.key === 'Enter' && signIn()} />
            {error && <div className="text-xs text-red-500 px-1">{error}</div>}
            <button onClick={signIn}
              className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium transition-colors">
              Send magic link
            </button>
            <p className="text-xs text-zinc-400 text-center">No password needed — we'll email you a sign-in link</p>
          </div>
        )}
      </div>
    </div>
  )

  return (
    <>
      {children(user)}
      <button id="sign-out-btn" onClick={signOut} style={{ display: 'none' }} />
    </>
  )
}
