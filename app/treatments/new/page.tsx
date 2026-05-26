'use client'
import { useEffect, useState, Suspense } from 'react'
import { supabase } from '@/lib/supabase'
import { Dog, Medicine, TreatmentType, TimeOfDay } from '@/types'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Sun, Moon, Zap } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import MedicineSearch from '@/components/MedicineSearch'
import { timeOfDayColor, cn } from '@/lib/utils'

function NewTreatmentInner() {
  const router = useRouter()
  const params = useSearchParams()
  const prefillDogId = params.get('dogId') ?? ''

  const [dogs, setDogs] = useState<Dog[]>([])
  const [medicines, setMedicines] = useState<Medicine[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedDog, setSelectedDog] = useState<Dog | null>(null)
  const [selectedMedicine, setSelectedMedicine] = useState<Medicine | null>(null)

  const [form, setForm] = useState({
    dog_id: prefillDogId,
    medicine_id: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    time_of_day: 'Morning' as TimeOfDay,
    treatment_type: 'General' as TreatmentType,
    mg: '',
    quantity_used: '',
    cost: '',
    notes: '',
    logged_by: '',
    follow_up_date: '',
    follow_up_type: 'Treatment',
    follow_up_notes: '',
  })

  useEffect(() => {
    async function load() {
      const [dogsRes, medsRes] = await Promise.all([
        supabase.from('dogs').select('*').eq('status', 'Active').order('name'),
        supabase.from('medicines').select('*').order('name'),
      ])
      setDogs(dogsRes.data || [])
      setMedicines(medsRes.data || [])
      if (prefillDogId) setSelectedDog(dogsRes.data?.find((d: Dog) => d.id === prefillDogId) ?? null)
    }
    load()
  }, [prefillDogId])

  function handleDogChange(dogId: string) {
    setForm(f => ({ ...f, dog_id: dogId }))
    setSelectedDog(dogs.find(d => d.id === dogId) ?? null)
  }

  function handleMedicineChange(medId: string, med: Medicine | null) {
    setSelectedMedicine(med)
    const qty = form.quantity_used ? parseFloat(form.quantity_used) : null
    setForm(f => ({
      ...f,
      medicine_id: medId,
      mg: med?.power_mg ?? f.mg,
      cost: med && qty ? (med.cost_per_unit ? (med.cost_per_unit * qty).toFixed(2) : '') : med?.cost_per_unit?.toString() ?? f.cost,
    }))
  }

  function handleQuantityChange(qty: string) {
    const q = parseFloat(qty)
    const cost = selectedMedicine?.cost_per_unit && !isNaN(q) ? (selectedMedicine.cost_per_unit * q).toFixed(2) : form.cost
    setForm(f => ({ ...f, quantity_used: qty, cost }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.dog_id) return alert('Please select a patient')
    setLoading(true)

    const { error } = await supabase.from('treatment_logs').insert([{
      dog_id: form.dog_id,
      medicine_id: form.medicine_id || null,
      date: form.date,
      time_of_day: form.time_of_day,
      treatment_type: form.treatment_type,
      mg: form.mg || null,
      quantity_used: form.quantity_used ? parseFloat(form.quantity_used) : null,
      cost: form.cost ? parseFloat(form.cost) : null,
      notes: form.notes || null,
      logged_by: form.logged_by || null,
    }])

    if (error) { setLoading(false); alert('Error: ' + error.message); return }

    if (form.follow_up_date) {
      await supabase.from('follow_ups').insert([{
        dog_id: form.dog_id, follow_up_type: form.follow_up_type,
        due_date: form.follow_up_date, status: 'Pending',
        notes: form.follow_up_notes || null,
      }])
    }

    setLoading(false)
    router.push(`/dogs/${form.dog_id}`)
  }

  return (
    <div className="pb-24 md:pb-8">
      <div className="px-4 md:px-0 pt-6 pb-4 flex items-center gap-3">
        <Link href="/dashboard" className="p-2 rounded-xl bg-gray-100"><ArrowLeft size={18} /></Link>
        <h1 className="text-xl font-bold text-gray-900">Log Treatment</h1>
      </div>

      <form onSubmit={handleSubmit} className="px-4 md:px-0 space-y-4">

        <Field label="Patient *">
          <select required value={form.dog_id} onChange={e => handleDogChange(e.target.value)} className={inputCls}>
            <option value="">Select patient</option>
            {dogs.map(d => <option key={d.id} value={d.id}>{d.name} (#{d.patient_id})</option>)}
          </select>
        </Field>

        <Field label="Date *">
          <input required type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className={inputCls} />
        </Field>

        {/* Time of day — prominent */}
        <Field label="Time of Day *">
          <div className="grid grid-cols-3 gap-2">
            {([
              { val: 'Morning', icon: <Sun size={15} />, label: 'Morning' },
              { val: 'Evening', icon: <Moon size={15} />, label: 'Evening' },
              { val: 'Ad hoc', icon: <Zap size={15} />, label: 'Ad hoc' },
            ] as { val: TimeOfDay; icon: React.ReactNode; label: string }[]).map(t => (
              <button key={t.val} type="button" onClick={() => setForm(f => ({ ...f, time_of_day: t.val }))}
                className={cn('flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium border transition-all',
                  form.time_of_day === t.val ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50 text-gray-600 border-gray-200')}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Treatment Type *">
          <div className="flex gap-2">
            {(['General', 'Vaccination', 'Deworming'] as TreatmentType[]).map(t => (
              <button key={t} type="button" onClick={() => setForm(f => ({ ...f, treatment_type: t }))}
                className={cn('flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all',
                  form.treatment_type === t ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50 text-gray-600 border-gray-200')}>
                {t}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Medicine">
          <MedicineSearch medicines={medicines} value={form.medicine_id} onChange={handleMedicineChange} />
        </Field>

        <div className="grid grid-cols-3 gap-3">
          <Field label="Mg / Dose">
            <input type="text" value={form.mg} onChange={e => setForm(f => ({ ...f, mg: e.target.value }))} placeholder="150mg" className={inputCls} />
          </Field>
          <Field label="Quantity">
            <input type="number" step="0.5" value={form.quantity_used} onChange={e => handleQuantityChange(e.target.value)} placeholder="1" className={inputCls} />
          </Field>
          <Field label="Cost (₹)">
            <input type="number" step="0.01" value={form.cost} onChange={e => setForm(f => ({ ...f, cost: e.target.value }))} placeholder="auto" className={inputCls} />
          </Field>
        </div>

        <Field label="Notes">
          <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Any additional notes..." rows={2} className={inputCls} />
        </Field>

        <Field label="Logged by">
          <input type="text" value={form.logged_by} onChange={e => setForm(f => ({ ...f, logged_by: e.target.value }))} placeholder="Your name" className={inputCls} />
        </Field>

        <div className="border-t border-gray-100 pt-4">
          <p className="text-sm font-semibold text-gray-700 mb-3">Schedule follow-up (optional)</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Follow-up date">
              <input type="date" value={form.follow_up_date} onChange={e => setForm(f => ({ ...f, follow_up_date: e.target.value }))} className={inputCls} />
            </Field>
            <Field label="Type">
              <select value={form.follow_up_type} onChange={e => setForm(f => ({ ...f, follow_up_type: e.target.value }))} className={inputCls}>
                <option>Treatment</option><option>Vaccination</option><option>Deworming</option><option>Vet Consult</option>
              </select>
            </Field>
          </div>
          {form.follow_up_date && (
            <input type="text" placeholder="Follow-up notes..." value={form.follow_up_notes} onChange={e => setForm(f => ({ ...f, follow_up_notes: e.target.value }))} className={`${inputCls} mt-3`} />
          )}
        </div>

        {/* Sticky submit on mobile */}
        <div className="fixed bottom-0 left-0 right-0 md:relative md:bottom-auto bg-white border-t border-gray-100 md:border-0 p-4 md:p-0">
          <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-3 rounded-2xl font-semibold text-sm disabled:opacity-60">
            {loading ? 'Saving...' : 'Log Treatment'}
          </button>
        </div>
      </form>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (<div><label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">{label}</label>{children}</div>)
}

const inputCls = 'w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-400 focus:bg-white'

export default function Page() {
  return <Suspense fallback={<div className="p-8 text-gray-400">Loading...</div>}><NewTreatmentInner /></Suspense>
}
