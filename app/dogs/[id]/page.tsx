'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Dog, TreatmentLog, FollowUp, Diagnostic, Prescription, PrescriptionItem, Medicine, NextAction } from '@/types'
import { formatDate, patientTypeBadgeColor, treatmentTypeBadgeColor, timeOfDayColor, cn } from '@/lib/utils'
import { ArrowLeft, Phone, Plus, Share2, CheckCircle, Microscope, Edit2, Trash2, X, Save } from 'lucide-react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { format } from 'date-fns'
import PhotoUpload from '@/components/PhotoUpload'
import MedicineSearch from '@/components/MedicineSearch'

type Tab = 'overview' | 'treatments' | 'followups' | 'diagnostics' | 'prescription'
type TxWithMed = TreatmentLog & { medicine?: { name: string } | null }

export default function DogProfilePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [dog, setDog] = useState<Dog | null>(null)
  const [treatments, setTreatments] = useState<TxWithMed[]>([])
  const [followUps, setFollowUps] = useState<FollowUp[]>([])
  const [diagnostics, setDiagnostics] = useState<Diagnostic[]>([])
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([])
  const [medicines, setMedicines] = useState<Medicine[]>([])
  const [tab, setTab] = useState<Tab>('overview')
  const [loading, setLoading] = useState(true)
  const [showFollowUpForm, setShowFollowUpForm] = useState(false)
  const [showDiagnosticForm, setShowDiagnosticForm] = useState(false)
  const [showPrescriptionForm, setShowPrescriptionForm] = useState(false)
  const [editingDog, setEditingDog] = useState(false)
  const [completingFollowUp, setCompletingFollowUp] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const [dogRes, txRes, fuRes, dxRes, rxRes, medRes] = await Promise.all([
        supabase.from('dogs').select('*').eq('id', id).single(),
        supabase.from('treatment_logs').select('*, medicine:medicines(name)').eq('dog_id', id).order('date', { ascending: false }),
        supabase.from('follow_ups').select('*').eq('dog_id', id).order('due_date'),
        supabase.from('diagnostics').select('*').eq('dog_id', id).order('date', { ascending: false }),
        supabase.from('prescriptions').select('*, items:prescription_items(*, medicine:medicines(*))').eq('dog_id', id).order('created_at', { ascending: false }),
        supabase.from('medicines').select('*').order('name'),
      ])
      setDog(dogRes.data)
      setTreatments(txRes.data || [])
      setFollowUps(fuRes.data || [])
      setDiagnostics(dxRes.data || [])
      setPrescriptions(rxRes.data || [])
      setMedicines(medRes.data || [])
      setLoading(false)
    }
    load()
  }, [id])

  async function handleDeleteTreatment(txId: string) {
    if (!confirm('Delete this treatment log?')) return
    await supabase.from('treatment_logs').delete().eq('id', txId)
    setTreatments(prev => prev.filter(t => t.id !== txId))
  }

  async function handleDeleteFollowUp(fuId: string) {
    if (!confirm('Delete this follow-up?')) return
    await supabase.from('follow_ups').delete().eq('id', fuId)
    setFollowUps(prev => prev.filter(f => f.id !== fuId))
  }

  async function handleDeleteDiagnostic(dxId: string) {
    if (!confirm('Delete this diagnostic?')) return
    await supabase.from('diagnostics').delete().eq('id', dxId)
    setDiagnostics(prev => prev.filter(d => d.id !== dxId))
  }

  async function handleDischarge() {
    if (!confirm('Mark this patient as discharged?')) return
    await supabase.from('dogs').update({ status: 'Discharged' }).eq('id', id)
    router.push('/dogs')
  }

  function handleShare() {
    if (!dog) return
    let text = `🐾 *${dog.name}* — Paw People\nID: #${dog.patient_id} | ${dog.patient_type}\n`
    if (dog.guardian_name) text += `Guardian: ${dog.guardian_name} (${dog.guardian_contact || '—'})\n`
    if (treatments.length > 0) {
      text += `\n*Recent Treatments:*\n`
      treatments.slice(0, 5).forEach(t => {
        text += `• ${formatDate(t.date)} ${t.time_of_day} — ${(t as any).medicine?.name ?? t.treatment_type}\n`
      })
    }
    const pending = followUps.filter(f => f.status === 'Pending')
    if (pending.length > 0) {
      text += `\n*Upcoming Follow-ups:*\n`
      pending.forEach(f => text += `• ${formatDate(f.due_date)} — ${f.follow_up_type}\n`)
    }
    if (navigator.share) navigator.share({ title: `${dog.name} — Paw People`, text })
    else { navigator.clipboard.writeText(text); alert('Copied to clipboard!') }
  }

  if (loading) return <div className="p-8 text-center text-gray-400">Loading...</div>
  if (!dog) return <div className="p-8 text-center text-gray-400">Patient not found</div>

  const activePrescription = prescriptions.find(p => p.is_active)
  const pendingFollowUps = followUps.filter(f => f.status === 'Pending')
  const completedFollowUps = followUps.filter(f => f.status === 'Done')

  return (
    <div className="pb-24 md:pb-8">
      <div className="px-4 md:px-0 pt-6 pb-4">
        <div className="flex items-center justify-between mb-4">
          <Link href="/dogs" className="p-2 rounded-xl bg-gray-100"><ArrowLeft size={18} /></Link>
          <div className="flex gap-2">
            <button onClick={handleShare} className="p-2 rounded-xl bg-gray-100"><Share2 size={18} /></button>
            <button onClick={() => setEditingDog(true)} className="p-2 rounded-xl bg-gray-100"><Edit2 size={18} /></button>
            <Link href={`/treatments/new?dogId=${id}`} className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-2 rounded-xl text-sm font-medium">
              <Plus size={14} /> Log
            </Link>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-3xl p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              {dog.photo_url ? (
                <img src={dog.photo_url} alt={dog.name} className="w-16 h-16 rounded-2xl object-cover border-2 border-white shadow-sm" />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center text-3xl">🐕</div>
              )}
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{dog.name}</h1>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="text-sm text-gray-500">#{dog.patient_id}</span>
                  <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full', patientTypeBadgeColor(dog.patient_type))}>{dog.patient_type}</span>
                  {dog.status === 'Discharged' && <span className="text-[10px] text-gray-400 bg-gray-200 px-2 py-0.5 rounded-full">Discharged</span>}
                </div>
              </div>
            </div>
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

      {/* Active prescription summary */}
      {activePrescription && activePrescription.items && activePrescription.items.length > 0 && (
        <div className="mx-4 md:mx-0 mb-4 bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Active Prescription</p>
            <button onClick={() => setTab('prescription')} className="text-xs text-amber-600 font-medium">View all →</button>
          </div>
          {['Morning', 'Evening', 'Both', 'Ad hoc'].map(tod => {
            const items = activePrescription.items!.filter((i: any) => i.time_of_day === tod)
            if (items.length === 0) return null
            return (
              <div key={tod} className="mb-1">
                <span className="text-[10px] font-semibold text-amber-600 uppercase">{tod}: </span>
                <span className="text-xs text-amber-900">{items.map((i: any) => `${i.medicine?.name}${i.dose ? ` ${i.dose}` : ''}`).join(', ')}</span>
              </div>
            )
          })}
        </div>
      )}

      {/* Tabs */}
      <div className="px-4 md:px-0 mb-4">
        <div className="flex bg-gray-100 rounded-xl p-1 gap-1 overflow-x-auto">
          {([
            { key: 'overview', label: 'Overview' },
            { key: 'prescription', label: 'Prescription' },
            { key: 'treatments', label: `Logs (${treatments.length})` },
            { key: 'followups', label: `Follow-ups (${pendingFollowUps.length})` },
            { key: 'diagnostics', label: 'Diagnostics' },
          ] as { key: Tab; label: string }[]).map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={cn('flex-shrink-0 py-1.5 px-2 rounded-lg text-[11px] font-medium whitespace-nowrap', tab === t.key ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500')}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 md:px-0">

        {/* OVERVIEW */}
        {tab === 'overview' && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              <Stat label="Treatments" value={treatments.length} />
              <Stat label="Follow-ups" value={pendingFollowUps.length} sub="pending" />
              <Stat label="Diagnostics" value={diagnostics.length} />
            </div>

            {/* Completed follow-ups timeline */}
            {completedFollowUps.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">Care history</p>
                <div className="space-y-2">
                  {completedFollowUps.map(f => (
                    <div key={f.id} className="bg-green-50 border border-green-100 rounded-2xl p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <CheckCircle size={13} className="text-green-600" />
                        <span className="text-xs font-semibold text-green-700">{f.follow_up_type}</span>
                        <span className="text-xs text-gray-400">{formatDate(f.due_date)}</span>
                      </div>
                      {f.completion_notes && <p className="text-xs text-gray-600 ml-5">{f.completion_notes}</p>}
                      {f.next_action && <p className="text-xs text-blue-600 ml-5 mt-0.5">→ {f.next_action}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {dog.status === 'Active' && (
              <button onClick={handleDischarge} className="w-full border border-red-200 text-red-600 py-2.5 rounded-xl text-sm font-medium hover:bg-red-50">
                Mark as Discharged
              </button>
            )}
          </div>
        )}

        {/* PRESCRIPTION */}
        {tab === 'prescription' && (
          <div className="space-y-3">
            <button onClick={() => setShowPrescriptionForm(!showPrescriptionForm)}
              className="w-full flex items-center justify-center gap-2 border border-dashed border-blue-300 text-blue-600 py-2.5 rounded-xl text-sm font-medium">
              <Plus size={16} /> New Prescription
            </button>
            {showPrescriptionForm && (
              <AddPrescriptionForm dogId={id} medicines={medicines} onAdded={(rx) => {
                setPrescriptions(prev => prev.map(p => ({ ...p, is_active: false })))
                setPrescriptions(prev => [rx, ...prev.map(p => ({ ...p, is_active: false }))])
                setShowPrescriptionForm(false)
              }} />
            )}
            {prescriptions.length === 0 ? <EmptyState icon="💊" text="No prescriptions yet" /> :
              prescriptions.map((rx, i) => (
                <div key={rx.id} className={cn('rounded-2xl border p-4', rx.is_active ? 'border-amber-200 bg-amber-50' : 'border-gray-200 bg-gray-50')}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-gray-700">{formatDate(rx.created_at)}</span>
                      {rx.is_active && <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">Active</span>}
                    </div>
                    {rx.photo_url && (
                      <a href={rx.photo_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 font-medium">View photo</a>
                    )}
                  </div>
                  {rx.items && rx.items.length > 0 && (
                    <div className="space-y-1">
                      {(rx.items as any[]).map((item: any) => (
                        <div key={item.id} className="flex items-center gap-2 text-xs text-gray-700">
                          <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium', timeOfDayColor(item.time_of_day))}>{item.time_of_day}</span>
                          <span className="font-medium">{item.medicine?.name}</span>
                          {item.dose && <span className="text-gray-500">{item.dose}</span>}
                          {item.start_date && <span className="text-gray-400">{formatDate(item.start_date)}{item.end_date ? ` → ${formatDate(item.end_date)}` : ''}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                  {rx.notes && <p className="text-xs text-gray-500 mt-2">{rx.notes}</p>}
                </div>
              ))}
          </div>
        )}

        {/* TREATMENTS */}
        {tab === 'treatments' && (
          <div className="space-y-2">
            {treatments.length === 0 ? <EmptyState icon="💊" text="No treatments logged yet" /> :
              treatments.map(t => (
                <div key={t.id} className="bg-gray-50 rounded-2xl p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-sm font-semibold text-gray-900">{(t as any).medicine?.name ?? 'No medicine'}</span>
                        <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full', treatmentTypeBadgeColor(t.treatment_type))}>{t.treatment_type}</span>
                        <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full', timeOfDayColor(t.time_of_day))}>{t.time_of_day}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 text-xs text-gray-500">
                        <span>{formatDate(t.date)}</span>
                        {t.quantity_used && <span>{t.quantity_used} units</span>}
                        {t.mg && <span>{t.mg}</span>}
                        {t.cost && <span>₹{t.cost}</span>}
                        {t.logged_by && <span>by {t.logged_by}</span>}
                      </div>
                      {t.notes && <p className="text-xs text-gray-500 mt-1">{t.notes}</p>}
                    </div>
                    <button onClick={() => handleDeleteTreatment(t.id)} className="ml-2 p-1.5 text-gray-300 hover:text-red-500 flex-shrink-0">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
          </div>
        )}

        {/* FOLLOW-UPS */}
        {tab === 'followups' && (
          <div className="space-y-3">
            <button onClick={() => setShowFollowUpForm(!showFollowUpForm)}
              className="w-full flex items-center justify-center gap-2 border border-dashed border-blue-300 text-blue-600 py-2.5 rounded-xl text-sm font-medium">
              <Plus size={16} /> Add Follow-up
            </button>
            {showFollowUpForm && <AddFollowUpForm dogId={id} onAdded={(fu) => { setFollowUps(prev => [...prev, fu]); setShowFollowUpForm(false) }} />}

            {pendingFollowUps.length === 0 && completedFollowUps.length === 0 && <EmptyState icon="📅" text="No follow-ups scheduled" />}

            {pendingFollowUps.length > 0 && (
              <>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Pending</p>
                {pendingFollowUps.map(f => (
                  <div key={f.id} className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-gray-900">{f.follow_up_type}</span>
                          <span className="text-[10px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">Pending</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">{formatDate(f.due_date)}</p>
                        {f.notes && <p className="text-xs text-gray-400 mt-0.5">{f.notes}</p>}
                      </div>
                      <div className="flex gap-1.5 ml-2">
                        <button onClick={() => setCompletingFollowUp(f.id)} className="p-1.5 rounded-lg bg-white border border-green-200 text-green-600 hover:bg-green-50">
                          <CheckCircle size={16} />
                        </button>
                        <button onClick={() => handleDeleteFollowUp(f.id)} className="p-1.5 text-gray-300 hover:text-red-500">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    {completingFollowUp === f.id && (
                      <CompleteFollowUpForm followUp={f} onCompleted={(updated) => {
                        setFollowUps(prev => prev.map(fu => fu.id === updated.id ? updated : fu))
                        setCompletingFollowUp(null)
                      }} onCancel={() => setCompletingFollowUp(null)} />
                    )}
                  </div>
                ))}
              </>
            )}

            {completedFollowUps.length > 0 && (
              <>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mt-4">Completed</p>
                {completedFollowUps.map(f => (
                  <div key={f.id} className="bg-gray-50 border border-gray-200 rounded-2xl p-4 opacity-75">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-gray-700">{f.follow_up_type}</span>
                          <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Done</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">{formatDate(f.due_date)}</p>
                        {f.completion_notes && <p className="text-xs text-gray-500 mt-1 italic">{f.completion_notes}</p>}
                        {f.next_action && <p className="text-xs text-blue-600 mt-0.5">→ {f.next_action}</p>}
                      </div>
                      <button onClick={() => handleDeleteFollowUp(f.id)} className="p-1.5 text-gray-300 hover:text-red-500">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {/* DIAGNOSTICS */}
        {tab === 'diagnostics' && (
          <div className="space-y-3">
            <button onClick={() => setShowDiagnosticForm(!showDiagnosticForm)}
              className="w-full flex items-center justify-center gap-2 border border-dashed border-blue-300 text-blue-600 py-2.5 rounded-xl text-sm font-medium">
              <Plus size={16} /> Log Diagnostic
            </button>
            {showDiagnosticForm && <AddDiagnosticForm dogId={id} onAdded={(dx) => { setDiagnostics(prev => [dx, ...prev]); setShowDiagnosticForm(false) }} />}
            {diagnostics.length === 0 ? <EmptyState icon="🔬" text="No diagnostics logged yet" /> :
              diagnostics.map(d => (
                <div key={d.id} className="bg-gray-50 rounded-2xl p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Microscope size={14} className="text-gray-500" />
                        <span className="text-sm font-semibold text-gray-900">{d.diagnostic_type}</span>
                        <span className="text-xs text-gray-400">{formatDate(d.date)}</span>
                      </div>
                      {d.notes && <p className="text-xs text-gray-500">{d.notes}</p>}
                      {d.photo_url && (
                        <a href={d.photo_url} target="_blank" rel="noopener noreferrer">
                          <img src={d.photo_url} alt="diagnostic" className="mt-2 w-24 h-24 object-cover rounded-xl border" />
                        </a>
                      )}
                    </div>
                    <button onClick={() => handleDeleteDiagnostic(d.id)} className="p-1.5 text-gray-300 hover:text-red-500">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Edit dog modal */}
      {editingDog && <EditDogModal dog={dog} onSaved={(updated) => { setDog(updated); setEditingDog(false) }} onClose={() => setEditingDog(false)} />}
    </div>
  )
}

function Stat({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (<div className="bg-gray-50 rounded-2xl p-3 text-center"><p className="text-2xl font-bold text-gray-900">{value}</p><p className="text-xs text-gray-500">{label}</p>{sub && <p className="text-[10px] text-gray-400">{sub}</p>}</div>)
}

function EmptyState({ icon, text }: { icon: string; text: string }) {
  return (<div className="text-center py-10 text-gray-400"><p className="text-3xl mb-2">{icon}</p><p className="text-sm">{text}</p></div>)
}

function AddFollowUpForm({ dogId, onAdded }: { dogId: string; onAdded: (fu: FollowUp) => void }) {
  const [form, setForm] = useState({ follow_up_type: 'Treatment', due_date: '', notes: '' })
  const [loading, setLoading] = useState(false)
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true)
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

function CompleteFollowUpForm({ followUp, onCompleted, onCancel }: { followUp: FollowUp; onCompleted: (fu: FollowUp) => void; onCancel: () => void }) {
  const [form, setForm] = useState({ completion_notes: '', next_action: '' as NextAction | '' , next_action_notes: '' })
  const [loading, setLoading] = useState(false)
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true)
    const { data, error } = await supabase.from('follow_ups').update({
      status: 'Done',
      completion_notes: form.completion_notes || null,
      next_action: form.next_action || null,
      next_action_notes: form.next_action_notes || null,
      completed_at: new Date().toISOString(),
    }).eq('id', followUp.id).select().single()
    setLoading(false)
    if (!error && data) onCompleted(data)
  }
  return (
    <form onSubmit={submit} className="mt-3 bg-white border border-green-200 rounded-xl p-3 space-y-2">
      <p className="text-xs font-semibold text-gray-600">What happened?</p>
      <textarea placeholder="Notes on what happened in this follow-up..." value={form.completion_notes} onChange={e => setForm(f => ({ ...f, completion_notes: e.target.value }))} rows={2} className={inputCls} />
      <select value={form.next_action} onChange={e => setForm(f => ({ ...f, next_action: e.target.value as NextAction | '' }))} className={inputCls}>
        <option value="">Next action (optional)</option>
        <option>Treatment Changed</option>
        <option>Treatment Ended</option>
        <option>Treatment Continued</option>
        <option>Diagnostic Action</option>
      </select>
      {form.next_action && <input type="text" placeholder="Details on next action..." value={form.next_action_notes} onChange={e => setForm(f => ({ ...f, next_action_notes: e.target.value }))} className={inputCls} />}
      <div className="flex gap-2">
        <button type="submit" disabled={loading} className="flex-1 bg-green-600 text-white py-2 rounded-xl text-sm font-semibold disabled:opacity-60">{loading ? 'Saving...' : 'Mark Done'}</button>
        <button type="button" onClick={onCancel} className="px-3 py-2 rounded-xl bg-gray-100 text-gray-600 text-sm">Cancel</button>
      </div>
    </form>
  )
}

function AddDiagnosticForm({ dogId, onAdded }: { dogId: string; onAdded: (dx: Diagnostic) => void }) {
  const [form, setForm] = useState({ diagnostic_type: 'X-Ray', date: format(new Date(), 'yyyy-MM-dd'), notes: '', photo_url: '' })
  const [loading, setLoading] = useState(false)
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true)
    const { data, error } = await supabase.from('diagnostics').insert([{ ...form, dog_id: dogId, photo_url: form.photo_url || null }]).select().single()
    setLoading(false)
    if (!error && data) onAdded(data)
  }
  return (
    <form onSubmit={submit} className="bg-gray-50 rounded-2xl p-4 space-y-3">
      <select value={form.diagnostic_type} onChange={e => setForm(f => ({ ...f, diagnostic_type: e.target.value }))} className={inputCls}>
        <option>X-Ray</option><option>CBC</option><option>Blood Test</option><option>LFT</option><option>RFT</option><option>Ultrasound</option><option>Other</option>
      </select>
      <input required type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className={inputCls} />
      <textarea placeholder="Notes / findings" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} className={inputCls} />
      <PhotoUpload folder="diagnostics" label="Upload report / image" onUploaded={url => setForm(f => ({ ...f, photo_url: url }))} />
      <button type="submit" disabled={loading} className="w-full bg-gray-700 text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-60">{loading ? 'Saving...' : 'Log Diagnostic'}</button>
    </form>
  )
}

function AddPrescriptionForm({ dogId, medicines, onAdded }: { dogId: string; medicines: Medicine[]; onAdded: (rx: Prescription) => void }) {
  const [items, setItems] = useState([{ medicine_id: '', time_of_day: 'Both', dose: '', quantity: '', start_date: '', end_date: '' }])
  const [notes, setNotes] = useState('')
  const [photoUrl, setPhotoUrl] = useState('')
  const [loading, setLoading] = useState(false)

  function addItem() { setItems(prev => [...prev, { medicine_id: '', time_of_day: 'Both', dose: '', quantity: '', start_date: '', end_date: '' }]) }
  function removeItem(i: number) { setItems(prev => prev.filter((_, idx) => idx !== i)) }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const validItems = items.filter(i => i.medicine_id)
    if (validItems.length === 0) return alert('Add at least one medicine')
    setLoading(true)
    await supabase.from('prescriptions').update({ is_active: false }).eq('dog_id', dogId)
    const { data: rx, error } = await supabase.from('prescriptions').insert([{ dog_id: dogId, notes: notes || null, photo_url: photoUrl || null, is_active: true }]).select().single()
    if (error || !rx) { setLoading(false); alert('Error creating prescription'); return }
    await supabase.from('prescription_items').insert(validItems.map(i => ({
      prescription_id: rx.id, medicine_id: i.medicine_id, time_of_day: i.time_of_day,
      dose: i.dose || null, quantity: i.quantity ? parseFloat(i.quantity) : null,
      start_date: i.start_date || null, end_date: i.end_date || null,
    })))
    const { data: full } = await supabase.from('prescriptions').select('*, items:prescription_items(*, medicine:medicines(*))').eq('id', rx.id).single()
    setLoading(false)
    if (full) onAdded(full)
  }

  return (
    <form onSubmit={submit} className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-4">
      <p className="text-sm font-semibold text-amber-800">New Prescription</p>
      {items.map((item, i) => (
        <div key={i} className="bg-white rounded-xl p-3 space-y-2 border border-amber-100">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-600">Medicine {i + 1}</span>
            {items.length > 1 && <button type="button" onClick={() => removeItem(i)} className="text-gray-400 hover:text-red-500"><X size={14} /></button>}
          </div>
          <MedicineSearch medicines={medicines} value={item.medicine_id}
            onChange={(id) => setItems(prev => prev.map((it, idx) => idx === i ? { ...it, medicine_id: id } : it))} />
          <div className="grid grid-cols-2 gap-2">
            <select value={item.time_of_day} onChange={e => setItems(prev => prev.map((it, idx) => idx === i ? { ...it, time_of_day: e.target.value } : it))} className={inputCls}>
              <option>Morning</option><option>Evening</option><option>Both</option><option>Ad hoc</option>
            </select>
            <input type="text" placeholder="Dose (e.g. 1 tab, 5ml)" value={item.dose} onChange={e => setItems(prev => prev.map((it, idx) => idx === i ? { ...it, dose: e.target.value } : it))} className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input type="date" placeholder="Start date" value={item.start_date} onChange={e => setItems(prev => prev.map((it, idx) => idx === i ? { ...it, start_date: e.target.value } : it))} className={inputCls} />
            <input type="date" placeholder="End date" value={item.end_date} onChange={e => setItems(prev => prev.map((it, idx) => idx === i ? { ...it, end_date: e.target.value } : it))} className={inputCls} />
          </div>
        </div>
      ))}
      <button type="button" onClick={addItem} className="w-full py-2 border border-dashed border-amber-300 text-amber-700 rounded-xl text-sm font-medium">+ Add Medicine</button>
      <textarea placeholder="Prescription notes..." value={notes} onChange={e => setNotes(e.target.value)} rows={2} className={inputCls} />
      <PhotoUpload folder="prescriptions" label="Upload prescription photo" onUploaded={setPhotoUrl} />
      <button type="submit" disabled={loading} className="w-full bg-amber-600 text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-60">{loading ? 'Saving...' : 'Save Prescription'}</button>
    </form>
  )
}

function EditDogModal({ dog, onSaved, onClose }: { dog: Dog; onSaved: (d: Dog) => void; onClose: () => void }) {
  const [form, setForm] = useState({ name: dog.name, patient_type: dog.patient_type, guardian_name: dog.guardian_name || '', guardian_contact: dog.guardian_contact || '', status: dog.status, photo_url: dog.photo_url || '' })
  const [loading, setLoading] = useState(false)
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true)
    const { data, error } = await supabase.from('dogs').update({ ...form, photo_url: form.photo_url || null }).eq('id', dog.id).select().single()
    setLoading(false)
    if (!error && data) onSaved(data)
  }
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Edit Patient</h2>
          <button onClick={onClose} className="p-2 rounded-xl bg-gray-100"><X size={16} /></button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <PhotoUpload folder="dogs" label="Dog Photo" currentUrl={form.photo_url} onUploaded={url => setForm(f => ({ ...f, photo_url: url }))} />
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Name" className={inputCls} />
          <select value={form.patient_type} onChange={e => setForm(f => ({ ...f, patient_type: e.target.value as any }))} className={inputCls}>
            <option>IPD</option><option>Resident</option><option>Visit</option><option>House Visit</option>
          </select>
          <input value={form.guardian_name} onChange={e => setForm(f => ({ ...f, guardian_name: e.target.value }))} placeholder="Guardian name" className={inputCls} />
          <input value={form.guardian_contact} onChange={e => setForm(f => ({ ...f, guardian_contact: e.target.value }))} placeholder="Guardian contact" className={inputCls} />
          <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as any }))} className={inputCls}>
            <option>Active</option><option>Discharged</option>
          </select>
          <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-3 rounded-2xl font-semibold text-sm disabled:opacity-60">{loading ? 'Saving...' : 'Save Changes'}</button>
        </form>
      </div>
    </div>
  )
}

const inputCls = 'w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-400'
