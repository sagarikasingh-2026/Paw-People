'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { FollowUp, Dog, Medicine } from '@/types'
import { formatDate, getFollowUpUrgency, patientTypeBadgeColor, cn } from '@/lib/utils'
import { format } from 'date-fns'
import { AlertCircle, CheckCircle2, Clock, ChevronRight, Package } from 'lucide-react'
import Link from 'next/link'

export default function Dashboard() {
  const [followUps, setFollowUps] = useState<FollowUp[]>([])
  const [activeDogs, setActiveDogs] = useState<Dog[]>([])
  const [lowStockMeds, setLowStockMeds] = useState<Medicine[]>([])
  const [loading, setLoading] = useState(true)
  const today = format(new Date(), 'yyyy-MM-dd')

  useEffect(() => {
    async function load() {
      const sevenDaysOut = format(new Date(Date.now() + 7 * 86400000), 'yyyy-MM-dd')
      const [fuRes, dogsRes, medsRes] = await Promise.all([
        supabase.from('follow_ups').select('*, dog:dogs(*)').eq('status', 'Pending').lte('due_date', sevenDaysOut).order('due_date'),
        supabase.from('dogs').select('*').eq('status', 'Active').order('name'),
        supabase.from('medicines').select('*'),
      ])
      const meds = medsRes.data || []
      setFollowUps(fuRes.data || [])
      setActiveDogs(dogsRes.data || [])
      setLowStockMeds(meds.filter((m: Medicine) => m.quantity_in_stock <= m.low_stock_threshold))
      setLoading(false)
    }
    load()
  }, [])

  const todayFollowUps = followUps.filter(f => f.due_date <= today)
  const upcomingFollowUps = followUps.filter(f => f.due_date > today)

  return (
    <div className="pb-nav">
      <div className="px-4 pt-6 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Paw People</h1>
            <p className="text-sm text-gray-500 mt-0.5">{format(new Date(), 'EEEE, dd MMM yyyy')}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white text-lg">🐾</div>
        </div>
      </div>

      <div className="px-4 grid grid-cols-3 gap-3 mb-6">
        <div className="bg-blue-50 rounded-2xl p-3">
          <p className="text-2xl font-bold text-blue-700">{activeDogs.length}</p>
          <p className="text-xs text-blue-500 mt-0.5">Active patients</p>
        </div>
        <div className="bg-orange-50 rounded-2xl p-3">
          <p className="text-2xl font-bold text-orange-700">{todayFollowUps.length}</p>
          <p className="text-xs text-orange-500 mt-0.5">Due today</p>
        </div>
        <div className="bg-red-50 rounded-2xl p-3">
          <p className="text-2xl font-bold text-red-700">{lowStockMeds.length}</p>
          <p className="text-xs text-red-500 mt-0.5">Low stock</p>
        </div>
      </div>

      {lowStockMeds.length > 0 && (
        <div className="mx-4 mb-5 bg-red-50 border border-red-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Package size={16} className="text-red-600" />
            <span className="text-sm font-semibold text-red-700">Low stock alert</span>
          </div>
          {lowStockMeds.map(m => (
            <div key={m.id} className="flex justify-between items-center py-1">
              <span className="text-sm text-red-800">{m.name}</span>
              <span className="text-xs font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-full">{m.quantity_in_stock} left</span>
            </div>
          ))}
          <Link href="/inventory" className="text-xs text-red-600 font-medium mt-1 block">Manage inventory →</Link>
        </div>
      )}

      <div className="px-4 mb-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-900">Due today & overdue</h2>
          <span className="text-xs text-gray-400">{todayFollowUps.length} total</span>
        </div>
        {loading ? (
          <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 bg-gray-100 rounded-2xl animate-pulse" />)}</div>
        ) : todayFollowUps.length === 0 ? (
          <div className="bg-green-50 rounded-2xl p-4 flex items-center gap-3">
            <CheckCircle2 size={20} className="text-green-600" />
            <p className="text-sm text-green-700">All clear for today!</p>
          </div>
        ) : (
          <div className="space-y-2">{todayFollowUps.map(f => <FollowUpCard key={f.id} followUp={f} />)}</div>
        )}
      </div>

      {upcomingFollowUps.length > 0 && (
        <div className="px-4 mb-5">
          <h2 className="font-semibold text-gray-900 mb-3">Upcoming (next 7 days)</h2>
          <div className="space-y-2">{upcomingFollowUps.map(f => <FollowUpCard key={f.id} followUp={f} />)}</div>
        </div>
      )}

      <div className="px-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-900">All active patients</h2>
          <Link href="/dogs" className="text-xs text-blue-600 font-medium">See all</Link>
        </div>
        <div className="space-y-2">
          {activeDogs.map(dog => (
            <Link key={dog.id} href={`/dogs/${dog.id}`}
              className="flex items-center justify-between bg-gray-50 rounded-2xl px-4 py-3 hover:bg-gray-100">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900">{dog.name}</span>
                  <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full', patientTypeBadgeColor(dog.patient_type))}>{dog.patient_type}</span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">#{dog.patient_id}</p>
              </div>
              <ChevronRight size={16} className="text-gray-400" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

function FollowUpCard({ followUp }: { followUp: FollowUp }) {
  const urgency = getFollowUpUrgency(followUp.due_date)
  const dog = followUp.dog as Dog
  const config = {
    overdue: { bg: 'bg-red-50 border-red-200', text: 'text-red-700', badge: 'bg-red-100 text-red-700', label: 'Overdue', icon: <AlertCircle size={16} className="text-red-600" /> },
    today: { bg: 'bg-orange-50 border-orange-200', text: 'text-orange-700', badge: 'bg-orange-100 text-orange-700', label: 'Today', icon: <Clock size={16} className="text-orange-600" /> },
    tomorrow: { bg: 'bg-yellow-50 border-yellow-200', text: 'text-yellow-700', badge: 'bg-yellow-100 text-yellow-700', label: 'Tomorrow', icon: <Clock size={16} className="text-yellow-600" /> },
    upcoming: { bg: 'bg-blue-50 border-blue-200', text: 'text-blue-700', badge: 'bg-blue-100 text-blue-700', label: formatDate(followUp.due_date), icon: <Clock size={16} className="text-blue-600" /> },
  }[urgency]
  return (
    <Link href={`/dogs/${followUp.dog_id}`} className={cn('flex items-center justify-between border rounded-2xl px-4 py-3', config.bg)}>
      <div className="flex items-center gap-3">
        {config.icon}
        <div>
          <div className="flex items-center gap-2">
            <span className={cn('font-semibold text-sm', config.text)}>{dog?.name ?? '—'}</span>
            <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full', config.badge)}>{followUp.follow_up_type}</span>
          </div>
          {followUp.notes && <p className="text-xs text-gray-500 mt-0.5">{followUp.notes}</p>}
        </div>
      </div>
      <span className={cn('text-xs font-semibold', config.text)}>{config.label}</span>
    </Link>
  )
}
