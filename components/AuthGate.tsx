'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Lock } from 'lucide-react'

const SESSION_KEY = 'pawpeople_authed'

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed] = useState(false)
  const [checking, setChecking] = useState(true)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    // Check existing session (stored locally on this device after first login)
    try {
      if (typeof window !== 'undefined' && window.localStorage.getItem(SESSION_KEY) === 'yes') {
        setAuthed(true)
      }
    } catch {}
    setChecking(false)
  }, [])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    const { data, error: dbErr } = await supabase.from('app_settings').select('access_password').eq('id', 1).single()
    setSubmitting(false)
    if (dbErr) { setError('Could not verify. Check your connection and try again.'); return }
    if (data && password === data.access_password) {
      try { window.localStorage.setItem(SESSION_KEY, 'yes') } catch {}
      setAuthed(true)
    } else {
      setError('Incorrect password')
    }
  }

  if (checking) {
    return <div className="min-h-screen flex items-center justify-center text-gray-300">Loading...</div>
  }

  if (authed) return <>{children}</>

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-gradient-to-br from-blue-50 to-indigo-50">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <img src="/logo.jpg" alt="Paw People" className="w-20 h-20 rounded-full object-cover shadow-md mb-4" />
          <h1 className="text-xl font-bold text-gray-900">Paw People</h1>
          <p className="text-sm text-gray-500">Treatment Log Platform</p>
        </div>

        <form onSubmit={handleLogin} className="bg-white rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-gray-700">
            <Lock size={16} />
            <span className="text-sm font-semibold">Team Access</span>
          </div>
          <p className="text-xs text-gray-400">Enter the shared password to access the platform. You'll only need to do this once on this device.</p>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Password"
            autoFocus
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-400 focus:bg-white"
          />
          {error && <p className="text-xs text-red-500">{error}</p>}
          <button type="submit" disabled={submitting || !password}
            className="w-full bg-blue-600 text-white py-3 rounded-2xl font-semibold text-sm disabled:opacity-60">
            {submitting ? 'Checking...' : 'Enter'}
          </button>
        </form>
      </div>
    </div>
  )
}

export function logout() {
  try { window.localStorage.removeItem(SESSION_KEY) } catch {}
  window.location.href = '/'
}
