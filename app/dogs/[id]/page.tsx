'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Dog, TreatmentLog, FollowUp, Diagnostic } from '@/types'
import { formatDate, patientTypeBadgeColor, treatmentTypeBadgeColor, cn } from '@/lib/utils'
import { ArrowLeft, Phone, Plus, Share2, CheckCircle, Microscope } from 'lucide-react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { format } from 'date-fns'

type Tab = 'overview' | 'treatments' | 'followups' | 'diagnostics'
type TxWithMed = TreatmentLog & { medicine?: { name: string } | null }

export default function DogProfilePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [dog, setDog] = useState<Dog | null>(null)
  const [treatments, setTreatments] = useState<TxWithMed[]>([])
  const [followUps, setFollowUps] = useState<FollowUp[]>([])
  const [diagnostics, setDiagnostics] = useState<Diagnostic[]>([])
  const [tab, setTab] = useState<Tab>('overview')
  const [loading, setLoading] = useState(true)
  const [showFollowUpForm, setShowFollowUpForm] = useState(false)
  const [showDiagnosticForm, setShowDiagnosticForm] = useState(false)

  useEffect(() => {
    async function load() {
      const [dogRes, txRes, fuRes, dxRes] = await Promise.all([
        supabase.from('dogs').select('*').eq('id', id).single(),
        supabase.from('treatment_logs').select('*, medicine:medicines(name)').eq('dog_id', id).order('date', { ascending: false }),
        supabase.from('follow_ups').select('*').eq('dog_id', id).order('due_date'),
        supabase.from('diagnostics').select('*').eq('dog_id', id).order('date', { ascending: false }),
      ])
      setDog(dogRes.data)
      setTreatments(txRes.data || [])
      setFollowUps(fuRes.data || [])
      setDiagnostics(dxRes.data || [])
      setLoading(false)
    }
    load()
  }, [id])

  async function markFollowUpDone(fuId: string) {
    await supabase.from('follow_ups').update({ status: 'Done' }).eq('id', fuId)
    setFollowUps(prev => prev.map(f => f.id === fuId ? { ...f, status: 'Done' } : f))
  }

  async function handleDischarge() {
    if (!confirm('Mark this patient as discharged?')) return
    await supabase.from('dogs').update({ status: 'Discharged' }).eq('id', id)
    router.push('/dogs')
  }

  function handleShare() {
    if (!dog) return
    let text = `🐾 *${dog.name}* — Paw People\n`
    text += `ID: #${dog.patient_id} | Type: ${dog.patient_type}\n`
    if (dog.guardian_name) text += `Guardian: ${dog.guardian_name} (${dog.guardian_contact || '—'})\n`
    text += `\n*Current Treatment:*\n${dog.current_treatment || 'None'}\n`
    if (treatments.length > 0) {
      text += `\n*Recent Treatments:*\n`
      treatments.slice(0, 5).forEach(t => {
        text += `• ${formatDate(t.date)} — ${t.treatment_type}${t.medicine?.name ? `: ${t.medicine.name}` : ''}\n`
      })
    }
    const pending = followUps.filter(f => f.status === 'Pending')
    if (pending.length > 0) {
      text += `\n*Follow-ups:*\n`
      pending.forEach(f => text += `• ${formatDate(f.due_date)} — ${f.follow_up_type}\n`)
    }
    if (navigator.share) navigator.share({ title: `${dog.name} — Paw People`, text })
    else { navigator.clipboard.writeText(text); alert('Copied to clipboard!') }
  }

  if (loading) return <div className="p-8 text-center text-gray-400">Loading...</div>
  if (!dog) return <div className="p-8 text-center text-gray-400">Patient not found</div>

  return (
    <div className="pb-nav">
      <div className="px-4 pt-6 pb-4">
        <div className="flex items-center justify-between mb-4">
          <Link href="/dogs" className="p-2 rounded-xl bg-gray-100"><ArrowLeft size={18} /></Link>
          <div className="flex gap-2">
            <button onClick={handleShare} className="p-2 rounded-xl bg-gray-100"><Share2 size={18} /></button>
            <Link href={`/treatments/new?dogId=${id}`} className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-2 rounded-xl text-sm font-medium">
              <Plus size={14} /> Log
            </Link>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-3xl p-4">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{dog.name}</h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-sm text-gray-500">#{dog.patient_id}</span>
                <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full', patientTypeBadgeColor(dog.patient_type))}>{dog.patient_type}</span>
                {dog.status === 'Discharged' && <span className="text-[10px] text-gray-400 bg-gray-200 px-2 py-0.5 rounded-full">Discharged</span>}
              </div>
            </div>
            <div className="text-4xl">🐕</div>
          </div>
          {dog.guardian_name && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-blue-100">
              <Phone size={14} className="text-blue-500" />
              <span className="text-sm text-gray-700">{dog.guardian_name}</span>
              {dog.guardian_contact && <a href={`tel:${dog.guardian_contact}`} className="text-sm text-blue-600 font-medium">{dog.guardian_contact}</a>}
            </div>
          )}
        </div>
      </div>

      {dog.current_treatment && (
        <div className="mx-4 mb-4 bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <p className="text-xs font-semibold text-amber-700 mb-1 uppercase tracking-wide">Current Treatment</p>
          <p className="text-sm text-amber-900">{dog.current_treatment}</p>
        </div>
      )}

      <div className="px-4 mb-4">
        <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
          {([
            { key: 'overview', label: 'Overview' },
            { key: 'treatments', label: `Treatments (${treatments.length})` },
            { key: 'followups', label: `Follow-ups` },
            { key: 'diagnostics', label: 'Diagnostics' },
          ] as { key: Tab; label: string }[]).map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={cn('flex-1 py-1.5 rounded-lg text-[11px] font-medium', tab === t.key ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500')}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4">
        {tab === 'overview' && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2 text-center">
              <Stat label="Treatments" value={treatments.length} />
              <Stat label="Follow-ups" value={followUps.filter(f => f.status === 'Pending').length} sub="pending" />
              <Stat label="Diagnostics" value={diagnostics.length} />
            </div>
            {dog.status === 'Active' && (
              <button onClick={handleDischarge} className="w-full border border-red-200 text-red-600 py-2.5 rounded-xl text-sm font-medium hover:bg-red-50">
                Mark as Discharged
              </button>
            )}
          </div>
        )}

        {tab === 'treatments' && (
          <div className="space-y-2">
            {treatments.length === 0 ? <EmptyState icon="💊" text="No treatments logged yet" /> :
              treatments.map(t => (
                <div key={t.id} className="bg-gray-50 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold text-gray-900">{t.medicine?.name ?? 'No medicine'}</span>
                    <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full', treatmentTypeBadgeColor(t.treatment_type))}>{t.treatment_type}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                    <span>{formatDate(t.date)}</span>
                    {t.quantity_used && <span>{t.quantity_used} units</span>}
                    {t.mg && <span>{t.mg}</span>}
                    {t.cost && <span>₹{t.cost}</span>}
                  </div>
                  {t.notes && <p className="text-xs text-gray-500 mt-1">{t.notes}</p>}
                </div>
              ))}
          </div>
        )}

        {tab === 'followups' && (
          <div className="space-y-3">
            <button onClick={() => setShowFollowUpForm(!showFollowUpForm)} className="w-full flex items-center justify-center gap-2 border border-dashed border-blue-300 text-blue-600 py-2.5 rounded-xl text-sm font-medium">
              <Plus size={16} /> Add Follow-up
            </button>
            {showFollowUpForm && <AddFollowUpForm dogId={id} onAdded={(fu) => { setFollowUps(prev => [...prev, fu]); setShowFollowUpForm(false) }} />}
            {followUps.length === 0 ? <EmptyState icon="📅" text="No follow-ups scheduled" /> :
              followUps.map(f => (
                <div key={f.id} className={cn('rounded-2xl p-4 border', f.status === 'Done' ? 'bg-gray-50 border-gray-200 opacity-60' : 'bg-blue-50 border-blue-200')}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900">{f.follow_up_type}</span>
                        <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium', f.status === 'Done' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700')}>{f.status}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{formatDate(f.due_date)}</p>
                      {f.notes && <p className="text-xs text-gray-400 mt-0.5">{f.notes}</p>}
                    </div>
                    {f.status === 'Pending' && (
                      <button onClick={() => markFollowUpDone(f.id)} className="p-2 rounded-xl bg-white border border-green-200 text-green-600 hover:bg-green-50">
                        <CheckCircle size={18} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
          </div>
        )}

        {tab === 'diagnostics' && (
          <div className="space-y-3">
            <button onClick={() => setShowDiagnosticForm(!showDiagnosticForm)} className="w-full flex items-center justify-center gap-2 border border-dashed border-blue-300 text-blue-600 py-2.5 rounded-xl text-sm font-medium">
              <Plus size={16} /> Log Diagnostic
            </button>
            {showDiagnosticForm && <AddDiagnosticForm dogId={id} onAdded={(dx) => { setDiagnostics(prev => [dx, ...prev]); setShowDiagnosticForm(false) }} />}
            {diagnostics.length === 0 ? <EmptyState icon="🔬" text="No diagnostics logged yet" /> :
              diagnostics.map(d => (
                <div key={d.id} className="bg-gray-50 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Microscope size={14} className="text-gray-500" />
                    <span className="text-sm font-semibold text-gray-900">{d.diagnostic_type}</span>
                    <span className="text-xs text-gray-400">{formatDate(d.date)}</span>
                  </div>
                  {d.notes && <p className="text-xs text-gray-500">{d.notes}</p>}
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  )
}

function Stat({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (<div className="bg-gray-50 rounded-2xl p-3"><p className="text-2xl font-bold text-gray-900">{value}</p><p className="text-xs text-gray-500">{label}</p>{sub && <p className="text-[10px] text-gray-400">{sub}</p>}</div>)
}

function EmptyState({ icon, text }: { icon: string; text: string }) {
  return (<div className="text-center py-10 text-gray-400"><p className="text-3xl mb-2">{icon}</p><p className="text-sm">{text}</p></div>)
}

function AddFollowUpForm({ dogId, onAdded }: { dogId: string; onAdded: (fu: FollowUp) => void }) {
  const [form, setForm] = useState({ follow_up_type: 'Treatment', due_date: '', notes: '' })
  const [loading, setLoading] = useState(false)
  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { data, error } = await supabase.from('follow_ups').insert([{ ...form, dog_id: dogId, status: 'Pending' }]).select().single()
    setLoading(false)
    if (!error && data) onAdded(data)
  }
  return (
    <form onSubmit={submit} className="bg-blue-50 rounded-2xl p-4 space-y-3">
      <select value={form.follow_up_type} onChange={e => setForm(f => ({ ...f, follow_up_type: e.target.value }))} className={inputCls}>
        <option>Treatment</option><option>Vaccination</option><option>Deworming</option><option>Vet Consult</option>
      </select>
      <input required type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} className={inputCls} />
      <input type="text" placeholder="Notes (optional)" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className={inputCls} />
      <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-60">{loading ? 'Saving...' : 'Add Follow-up'}</button>
    </form>
  )
}

function AddDiagnosticForm({ dogId, onAdded }: { dogId: string; onAdded: (dx: Diagnostic) => void }) {
  const [form, setForm] = useState({ diagnostic_type: 'X-Ray', date: format(new Date(), 'yyyy-MM-dd'), notes: '' })
  const [loading, setLoading] = useState(false)
  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { data, error } = await supabase.from('diagnostics').insert([{ ...form, dog_id: dogId }]).select().single()
    setLoading(false)
    if (!error && data) onAdded(data)
  }
  return (
    <form onSubmit={submit} className="bg-gray-50 rounded-2xl p-4 space-y-3">
      <select value={form.diagnostic_type} onChange={e => setForm(f => ({ ...f, diagnostic_type: e.target.value }))} className={inputCls}>
        <option>X-Ray</option><option>CBC</option><option>Blood Test</option><option>Ultrasound</option><option>Other</option>
      </select>
      <input required type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className={inputCls} />
      <textarea placeholder="Notes / findings" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} className={inputCls} />
      <button type="submit" disabled={loading} className="w-full bg-gray-700 text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-60">{loading ? 'Saving...' : 'Log Diagnostic'}</button>
    </form>
  )
}

const inputCls = 'w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-400'
