'use client'
import { useEffect, useState, Suspense } from 'react'
import { supabase } from '@/lib/supabase'
import { Dog, Medicine, TreatmentType, TimeOfDay, Prescription, PrescriptionItem } from '@/types'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Sun, Moon, Zap, Trash2, Plus, AlertTriangle, Pill } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import MedicineSearch from '@/components/MedicineSearch'
import { cn, sanitizeQuantity, timeOfDayColor } from '@/lib/utils'

interface DraftRow {
  medicine_id: string
  medicine: Medicine | null
  treatment_type: TreatmentType
  mg: string
  quantity_used: string
  cost: string
  notes: string
}

function newRow(med?: Medicine, dose?: string, tx: TreatmentType = 'General'): DraftRow {
  return {
    medicine_id: med?.id ?? '',
    medicine: med ?? null,
    treatment_type: tx,
    mg: med?.power_mg ?? '',
    quantity_used: dose ? '1' : '',
    cost: '',
    notes: '',
  }
}

function NewTreatmentInner() {
  const router = useRouter()
  const params = useSearchParams()
  const prefillDogId = params.get('dogId') ?? ''

  const [dogs, setDogs] = useState<Dog[]>([])
  const [medicines, setMedicines] = useState<Medicine[]>([])
  const [activeRx, setActiveRx] = useState<Prescription | null>(null)
  const [loading, setLoading] = useState(false)
  const [selectedDog, setSelectedDog] = useState<Dog | null>(null)

  const [dogId, setDogId] = useState(prefillDogId)
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>('Morning')
  const [loggedBy, setLoggedBy] = useState('')
  const [rows, setRows] = useState<DraftRow[]>([newRow()])

  const [followUpDate, setFollowUpDate] = useState('')
  const [followUpType, setFollowUpType] = useState('Treatment')
  const [followUpNotes, setFollowUpNotes] = useState('')

  useEffect(() => {
    async function load() {
      const [dogsRes, medsRes] = await Promise.all([
        supabase.from('dogs').select('*').eq('status', 'Active').order('name'),
        supabase.from('medicines').select('*').order('name'),
      ])
      setDogs(dogsRes.data || [])
      setMedicines(medsRes.data || [])
      if (prefillDogId) {
        const d = dogsRes.data?.find((x: Dog) => x.id === prefillDogId) ?? null
        setSelectedDog(d)
      }
    }
    load()
  }, [prefillDogId])

  // When dog or time of day changes, load active prescription and auto-populate rows
  useEffect(() => {
    if (!dogId) { setActiveRx(null); return }

    async function loadRx() {
      const { data } = await supabase.from('prescriptions')
        .select('*, items:prescription_items(*, medicine:medicines(*))')
        .eq('dog_id', dogId).eq('is_active', true).maybeSingle()
      setActiveRx(data)
    }
    loadRx()
  }, [dogId])

  // Auto-populate rows from active prescription items matching current time of day
  useEffect(() => {
    if (!activeRx?.items) return
    const items = (activeRx.items as PrescriptionItem[]).filter(i =>
      i.time_of_day === timeOfDay || i.time_of_day === 'Both'
    )
    // Only auto-populate if rows are empty or single empty row
    const hasContent = rows.some(r => r.medicine_id)
    if (!hasContent && items.length > 0) {
      const newRows = items.map(item => {
        const med = item.medicine ?? medicines.find(m => m.id === item.medicine_id) ?? null
        const qty = item.quantity?.toString() ?? '1'
        const cost = med?.cost_per_unit && item.quantity ? (med.cost_per_unit * item.quantity).toFixed(2) : ''
        return {
          medicine_id: item.medicine_id,
          medicine: med,
          treatment_type: 'General' as TreatmentType,
          mg: item.dose ?? med?.power_mg ?? '',
          quantity_used: qty,
          cost,
          notes: '',
        }
      })
      setRows(newRows)
    }
  }, [activeRx, timeOfDay])  // eslint-disable-line react-hooks/exhaustive-deps

  function handleDogChange(newId: string) {
    setDogId(newId)
    setSelectedDog(dogs.find(d => d.id === newId) ?? null)
    // Reset rows to one empty row so auto-populate can re-run
    setRows([newRow()])
  }

  function updateRow(i: number, patch: Partial<DraftRow>) {
    setRows(prev => prev.map((r, idx) => idx === i ? { ...r, ...patch } : r))
  }

  function setRowMedicine(i: number, medId: string, med: Medicine | null) {
    const qty = parseFloat(rows[i].quantity_used)
    const cost = med?.cost_per_unit && !isNaN(qty) && qty > 0
      ? (med.cost_per_unit * qty).toFixed(2)
      : ''
    updateRow(i, {
      medicine_id: medId, medicine: med,
      mg: med?.power_mg ?? rows[i].mg,
      cost,
    })
  }

  function setRowQuantity(i: number, raw: string) {
    const sanitized = sanitizeQuantity(raw)
    const qty = parseFloat(sanitized)
    const med = rows[i].medicine
    const cost = med?.cost_per_unit && !isNaN(qty) && qty > 0
      ? (med.cost_per_unit * qty).toFixed(2)
      : ''
    updateRow(i, { quantity_used: sanitized, cost })
  }

  function addRow() { setRows(prev => [...prev, newRow()]) }
  function removeRow(i: number) { setRows(prev => prev.filter((_, idx) => idx !== i)) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!dogId) return alert('Please select a patient')
    const validRows = rows.filter(r => r.medicine_id || r.notes)
    if (validRows.length === 0) return alert('Add at least one medicine or note')

    // Validate quantities
    for (const r of validRows) {
      if (r.quantity_used && parseFloat(r.quantity_used) < 0) return alert('Quantity must be positive')
    }

    setLoading(true)

    const payloads = validRows.map(r => ({
      dog_id: dogId,
      medicine_id: r.medicine_id || null,
      date,
      time_of_day: timeOfDay,
      treatment_type: r.treatment_type,
      mg: r.mg || null,
      quantity_used: r.quantity_used ? parseFloat(r.quantity_used) : null,
      cost: r.cost ? parseFloat(r.cost) : null,
      notes: r.notes || null,
      logged_by: loggedBy || null,
    }))

    const { error } = await supabase.from('treatment_logs').insert(payloads)
    if (error) { setLoading(false); alert('Error: ' + error.message); return }

    if (followUpDate) {
      await supabase.from('follow_ups').insert([{
        dog_id: dogId, follow_up_type: followUpType,
        due_date: followUpDate, status: 'Pending',
        notes: followUpNotes || null,
      }])
    }

    setLoading(false)
    router.push(`/dogs/${dogId}`)
  }

  const totalCost = rows.reduce((sum, r) => sum + (parseFloat(r.cost) || 0), 0)

  return (
    <div className="pb-40 md:pb-8">  {/* extra bottom space for sticky button + bottom nav */}
      <div className="px-4 md:px-0 pt-6 pb-4 flex items-center gap-3">
        <Link href="/dashboard" className="p-2 rounded-xl bg-gray-100"><ArrowLeft size={18} /></Link>
        <h1 className="text-xl font-bold text-gray-900">Log Treatment</h1>
      </div>

      <form onSubmit={handleSubmit} className="px-4 md:px-0 space-y-4">
        <Field label="Patient *">
          <select required value={dogId} onChange={e => handleDogChange(e.target.value)} className={inputCls}>
            <option value="">Select patient</option>
            {dogs.map(d => <option key={d.id} value={d.id}>{d.name} (#{d.patient_id})</option>)}
          </select>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Date *">
            <input required type="date" value={date} onChange={e => setDate(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Logged by">
            <input type="text" value={loggedBy} onChange={e => setLoggedBy(e.target.value)} placeholder="Your name" className={inputCls} />
          </Field>
        </div>

        <Field label="Time of Day *">
          <div className="grid grid-cols-2 gap-2">
            {([
              { val: 'Morning', icon: <Sun size={15} />, label: 'Morning' },
              { val: 'Evening', icon: <Moon size={15} />, label: 'Evening' },
            ] as { val: TimeOfDay; icon: React.ReactNode; label: string }[]).map(t => (
              <button key={t.val} type="button" onClick={() => setTimeOfDay(t.val)}
                className={cn('flex items-center justify-center gap-1.5 py-3 rounded-xl text-sm font-medium border transition-all',
                  timeOfDay === t.val ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50 text-gray-600 border-gray-200')}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>
        </Field>

        {/* Auto-populate indicator */}
        {activeRx && activeRx.items && activeRx.items.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
            <Pill size={14} className="text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-amber-800">
              <span className="font-semibold">Active prescription loaded</span> — medicines for {timeOfDay.toLowerCase()} have been auto-filled below. Adjust as needed.
            </div>
          </div>
        )}

        {/* Medicine rows */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Medicines</label>
            <span className="text-xs text-gray-400">{rows.filter(r => r.medicine_id).length} added</span>
          </div>

          {rows.map((row, i) => (
            <div key={i} className="bg-gray-50 border border-gray-200 rounded-2xl p-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500">#{i + 1}</span>
                {rows.length > 1 && (
                  <button type="button" onClick={() => removeRow(i)} className="text-gray-400 hover:text-red-500">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>

              <MedicineSearch medicines={medicines} value={row.medicine_id}
                onChange={(id, med) => setRowMedicine(i, id, med)} />

              {/* Treatment type */}
              <div className="flex gap-1.5">
                {(['General', 'Vaccination', 'Deworming'] as TreatmentType[]).map(t => (
                  <button key={t} type="button" onClick={() => updateRow(i, { treatment_type: t })}
                    className={cn('flex-1 py-1.5 rounded-lg text-[11px] font-medium border',
                      row.treatment_type === t ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200')}>
                    {t}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] text-gray-500 mb-0.5">Dose / Mg</label>
                  <input type="text" value={row.mg} onChange={e => updateRow(i, { mg: e.target.value })} placeholder="150mg" className={inputClsSm} />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 mb-0.5">Qty *</label>
                  <input type="text" inputMode="decimal" value={row.quantity_used}
                    onChange={e => setRowQuantity(i, e.target.value)} placeholder="1" className={inputClsSm} />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 mb-0.5">Cost (₹)</label>
                  <input type="text" inputMode="decimal" value={row.cost}
                    onChange={e => updateRow(i, { cost: sanitizeQuantity(e.target.value) })}
                    placeholder={row.medicine?.cost_per_unit ? 'auto' : 'manual'}
                    className={inputClsSm} />
                </div>
              </div>

              {row.medicine && !row.medicine.cost_per_unit && (
                <div className="flex items-start gap-1.5 text-[11px] text-amber-600">
                  <AlertTriangle size={11} className="mt-0.5 flex-shrink-0" />
                  <span>No cost set for this medicine in inventory — enter manually</span>
                </div>
              )}

              <input type="text" value={row.notes} onChange={e => updateRow(i, { notes: e.target.value })}
                placeholder="Notes (optional)" className={inputClsSm} />
            </div>
          ))}

          <button type="button" onClick={addRow}
            className="w-full py-2.5 border border-dashed border-blue-300 text-blue-600 rounded-xl text-sm font-medium hover:bg-blue-50 flex items-center justify-center gap-1.5">
            <Plus size={14} /> Add another medicine
          </button>
        </div>

        {totalCost > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex justify-between items-center">
            <span className="text-sm text-blue-700 font-medium">Total cost</span>
            <span className="text-lg font-bold text-blue-900">₹{totalCost.toFixed(2)}</span>
          </div>
        )}

        <div className="border-t border-gray-100 pt-4 space-y-3">
          <p className="text-sm font-semibold text-gray-700">Schedule follow-up (optional)</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Follow-up date">
              <input type="date" value={followUpDate} onChange={e => setFollowUpDate(e.target.value)} className={inputCls} />
            </Field>
            <Field label="Type">
              <select value={followUpType} onChange={e => setFollowUpType(e.target.value)} className={inputCls}>
                <option>Treatment</option><option>Vaccination</option><option>Deworming</option><option>Vet Consult</option>
              </select>
            </Field>
          </div>
          {followUpDate && (
            <input type="text" placeholder="Follow-up notes..." value={followUpNotes} onChange={e => setFollowUpNotes(e.target.value)} className={inputCls} />
          )}
        </div>

        {/* Inline submit for desktop AND a copy that's always visible at end of form (mobile-safe) */}
        <button type="submit" disabled={loading}
          className="w-full bg-blue-600 text-white py-3.5 rounded-2xl font-semibold text-sm disabled:opacity-60 shadow-lg shadow-blue-200">
          {loading ? 'Saving...' : `Log ${rows.filter(r => r.medicine_id).length || ''} Treatment${rows.filter(r => r.medicine_id).length === 1 ? '' : 's'}`.trim()}
        </button>
      </form>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (<div><label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">{label}</label>{children}</div>)
}

const inputCls = 'w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-400 focus:bg-white'
const inputClsSm = 'w-full px-2.5 py-2 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-400'

export default function Page() {
  return <Suspense fallback={<div className="p-8 text-gray-400">Loading...</div>}><NewTreatmentInner /></Suspense>
}
