'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { logout } from '@/components/AuthGate'
import { ArrowLeft, Lock, LogOut, Check } from 'lucide-react'
import Link from 'next/link'

export default function SettingsPage() {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  async function changePassword(e: React.FormEvent) {
    e.preventDefault()
    setMsg(null)
    if (next.length < 4) { setMsg({ type: 'err', text: 'New password must be at least 4 characters' }); return }
    if (next !== confirm) { setMsg({ type: 'err', text: 'New passwords do not match' }); return }
    setLoading(true)
    // Verify current password
    const { data, error } = await supabase.from('app_settings').select('access_password').eq('id', 1).single()
    if (error || !data) { setLoading(false); setMsg({ type: 'err', text: 'Could not verify current password' }); return }
    if (data.access_password !== current) { setLoading(false); setMsg({ type: 'err', text: 'Current password is incorrect' }); return }
    const { error: updErr } = await supabase.from('app_settings').update({ access_password: next, updated_at: new Date().toISOString() }).eq('id', 1)
    setLoading(false)
    if (updErr) { setMsg({ type: 'err', text: 'Could not update password' }); return }
    setMsg({ type: 'ok', text: 'Password changed successfully. Everyone will use the new password from next login.' })
    setCurrent(''); setNext(''); setConfirm('')
  }

  return (
    <div className="pb-24 md:pb-8 px-4 md:px-0 pt-6">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard" className="p-2 rounded-xl bg-gray-100"><ArrowLeft size={18} /></Link>
        <h1 className="text-xl font-bold text-gray-900">Settings</h1>
      </div>

      <div className="space-y-6 max-w-md">
        <form onSubmit={changePassword} className="bg-gray-50 rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2 text-gray-700 mb-1">
            <Lock size={16} />
            <span className="text-sm font-semibold">Change shared password</span>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Current password</label>
            <input type="password" value={current} onChange={e => setCurrent(e.target.value)} className={iCls} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">New password</label>
            <input type="password" value={next} onChange={e => setNext(e.target.value)} className={iCls} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Confirm new password</label>
            <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} className={iCls} />
          </div>
          {msg && (
            <div className={`flex items-start gap-2 text-xs ${msg.type === 'ok' ? 'text-green-600' : 'text-red-500'}`}>
              {msg.type === 'ok' && <Check size={14} className="mt-0.5 flex-shrink-0" />}
              <span>{msg.text}</span>
            </div>
          )}
          <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-60">
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </form>

        <button onClick={() => logout()} className="w-full flex items-center justify-center gap-2 border border-gray-200 text-gray-700 py-3 rounded-2xl text-sm font-medium hover:bg-gray-50">
          <LogOut size={16} /> Log out of this device
        </button>
        <p className="text-xs text-gray-400 text-center">Logging out will require the password again on next visit.</p>
      </div>
    </div>
  )
}

const iCls = 'w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-400'
