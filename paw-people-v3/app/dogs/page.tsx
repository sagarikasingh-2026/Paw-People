'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Dog } from '@/types'
import { patientTypeBadgeColor, cn } from '@/lib/utils'
import { Plus, Search, ChevronRight } from 'lucide-react'
import Link from 'next/link'

type StatusFilter = 'Active' | 'Discharged' | 'All'
type TypeFilter = 'All' | 'IPD' | 'Resident' | 'Visit' | 'House Visit'

export default function DogsPage() {
  const [dogs, setDogs] = useState<Dog[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('Active')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('All')

  useEffect(() => {
    async function load() {
      let q = supabase.from('dogs').select('*').order('name')
      if (statusFilter !== 'All') q = q.eq('status', statusFilter)
      const { data } = await q
      setDogs(data || [])
      setLoading(false)
    }
    load()
  }, [statusFilter])

  const filtered = dogs
    .filter(d => typeFilter === 'All' || d.patient_type === typeFilter)
    .filter(d =>
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.patient_id.includes(search) ||
      (d.guardian_name ?? '').toLowerCase().includes(search.toLowerCase())
    )

  return (
    <div className="pb-24 md:pb-8 px-4 md:px-0 pt-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Patients</h1>
        <Link href="/dogs/new" className="flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium">
          <Plus size={16} /> Add
        </Link>
      </div>

      <div className="relative mb-3">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input type="text" placeholder="Search by name, ID, guardian..." value={search} onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-400" />
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex gap-1.5 flex-wrap">
          <span className="text-[10px] text-gray-400 uppercase tracking-wide self-center mr-1">Status:</span>
          {(['Active', 'Discharged', 'All'] as StatusFilter[]).map(f => (
            <button key={f} onClick={() => setStatusFilter(f)}
              className={cn('px-3 py-1.5 rounded-lg text-xs font-medium',
                statusFilter === f ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600')}>{f}</button>
          ))}
        </div>
        <div className="flex gap-1.5 flex-wrap">
          <span className="text-[10px] text-gray-400 uppercase tracking-wide self-center mr-1">Type:</span>
          {(['All', 'IPD', 'Resident', 'Visit', 'House Visit'] as TypeFilter[]).map(f => (
            <button key={f} onClick={() => setTypeFilter(f)}
              className={cn('px-3 py-1.5 rounded-lg text-xs font-medium',
                typeFilter === f ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600')}>{f}</button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {loading ? (
          [1,2,3,4].map(i => <div key={i} className="h-20 bg-gray-100 rounded-2xl animate-pulse" />)
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-4xl mb-2">🐾</p>
            <p className="text-sm">No patients found</p>
          </div>
        ) : filtered.map(dog => (
          <Link key={dog.id} href={`/dogs/${dog.id}`} className="flex items-center justify-between bg-gray-50 rounded-2xl px-4 py-3 hover:bg-gray-100">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {dog.photo_url ? (
                <img src={dog.photo_url} alt={dog.name} className="w-10 h-10 rounded-xl object-cover flex-shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-lg flex-shrink-0">🐕</div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900">{dog.name}</span>
                  <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0', patientTypeBadgeColor(dog.patient_type))}>{dog.patient_type}</span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">#{dog.patient_id}</p>
                {dog.guardian_name && <p className="text-xs text-gray-400 truncate">Guardian: {dog.guardian_name}</p>}
              </div>
            </div>
            <div className="flex items-center gap-2 ml-2">
              {dog.status === 'Discharged' && <span className="text-[10px] text-gray-400 bg-gray-200 px-2 py-0.5 rounded-full">Discharged</span>}
              <ChevronRight size={16} className="text-gray-400 flex-shrink-0" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
