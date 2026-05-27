'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { PatientType } from '@/types'
import PhotoUpload from '@/components/PhotoUpload'

export default function NewDogPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    patient_id: '', patient_type: 'IPD' as PatientType, name: '',
    guardian_name: '', guardian_contact: '', photo_url: '',
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { data, error } = await supabase.from('dogs').insert([{ ...form, status: 'Active', photo_url: form.photo_url || null }]).select().single()
    setLoading(false)
    if (error) return alert('Error: ' + error.message)
    // Redirect straight to the new dog's profile so user can add prescription
    if (data) router.push(`/dogs/${data.id}`)
    else router.push('/dogs')
  }

  return (
    <div className="pb-40 md:pb-8">
      <div className="px-4 md:px-0 pt-6 pb-4 flex items-center gap-3">
        <Link href="/dogs" className="p-2 rounded-xl bg-gray-100"><ArrowLeft size={18} /></Link>
        <h1 className="text-xl font-bold text-gray-900">New Patient</h1>
      </div>

      <form onSubmit={handleSubmit} className="px-4 md:px-0 space-y-4">
        <PhotoUpload folder="dogs" label="Dog Photo (optional)" onUploaded={url => setForm(f => ({ ...f, photo_url: url }))} />

        <Field label="Patient ID *">
          <input required value={form.patient_id} onChange={e => setForm(f => ({ ...f, patient_id: e.target.value }))} placeholder="e.g. 169" className={inputCls} />
        </Field>
        <Field label="Patient Type *">
          <select required value={form.patient_type} onChange={e => setForm(f => ({ ...f, patient_type: e.target.value as PatientType }))} className={inputCls}>
            <option>IPD</option><option>Resident</option><option>Visit</option><option>House Visit</option>
          </select>
        </Field>
        <Field label="Name *">
          <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Dog's name" className={inputCls} />
        </Field>
        <Field label="Guardian Name">
          <input value={form.guardian_name} onChange={e => setForm(f => ({ ...f, guardian_name: e.target.value }))} placeholder="Guardian / caretaker" className={inputCls} />
        </Field>
        <Field label="Guardian Contact">
          <input value={form.guardian_contact} onChange={e => setForm(f => ({ ...f, guardian_contact: e.target.value }))} placeholder="Phone number" type="tel" className={inputCls} />
        </Field>

        <p className="text-xs text-gray-400">After creating the patient, you can add their prescription, treatments, and follow-ups from the profile page.</p>

        <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-3.5 rounded-2xl font-semibold text-sm disabled:opacity-60 shadow-lg shadow-blue-200">
          {loading ? 'Adding...' : 'Add Patient'}
        </button>
      </form>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (<div><label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">{label}</label>{children}</div>)
}

const inputCls = 'w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-400 focus:bg-white'
