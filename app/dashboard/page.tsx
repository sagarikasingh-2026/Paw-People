'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { FollowUp, Dog, Medicine, TreatmentLog } from '@/types'
import { formatDate, getFollowUpUrgency, patientTypeBadgeColor, cn } from '@/lib/utils'
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns'
import { AlertCircle, CheckCircle2, Clock, ChevronRight, Package, TrendingUp, Calendar, Filter } from 'lucide-react'
import Link from 'next/link'

type FilterType = 'all' | 'today' | 'week' | 'month'
type PatientFilter = 'All' | 'IPD' | 'Resident' | 'Visit' | 'House Visit'

interface MedUsage { name: string; count: number; total_qty: number }

export default function Dashboard() {
  const [followUps, setFollowUps] = useState<FollowUp[]>([])
  const [activeDogs, setActiveDogs] = useState<Dog[]>([])
  const [lowStockMeds, setLowStockMeds] = useState<Medicine[]>([])
  const [weeklyUsage, setWeeklyUsage] = useState<MedUsage[]>([])
  const [loading, setLoading] = useState(true)
  const [followUpFilter, setFollowUpFilter] = useState<FilterType>('all')
  const [patientFilter, setPatientFilter] = useState<PatientFilter>('All')
  const today = format(new Date(), 'yyyy-MM-dd')

  useEffect(() => {
    async function load() {
      const sevenDaysOut = format(new Date(Date.now() + 7 * 86400000), 'yyyy-MM-dd')
      const weekStart = format(startOfWeek(new Date()), 'yyyy-MM-dd')
      const weekEnd = format(endOfWeek(new Date()), 'yyyy-MM-dd')

      const [fuRes, dogsRes, medsRes, txRes] = await Promise.all([
        supabase.from('follow_ups').select('*, dog:dogs(*)').eq('status', 'Pending').lte('due_date', sevenDaysOut).order('due_date'),
        supabase.from('dogs').select('*').eq('status', 'Active').order('name'),
        supabase.from('medicines').select('*'),
        supabase.from('treatment_logs').select('*, medicine:medicines(name)').gte('date', weekStart).lte('date', weekEnd),
      ])

      const meds = medsRes.data || []
      setFollowUps(fuRes.data || [])
      setActiveDogs(dogsRes.data || [])
      setLowStockMeds(meds.filter((m: Medicine) => m.quantity_in_stock <= m.low_stock_threshold))

      // Weekly medicine usage
      const txs = txRes.data || []
      const usageMap: Record<string, MedUsage> = {}
      txs.forEach((t: any) => {
        if (!t.medicine?.name) return
        const name = t.medicine.name
        if (!usageMap[name]) usageMap[name] = { name, count: 0, total_qty: 0 }
        usageMap[name].count++
        usageMap[name].total_qty += t.quantity_used || 0
      })
      setWeeklyUsage(Object.values(usageMap).sort((a, b) => b.total_qty - a.total_qty).slice(0, 5))
      setLoading(false)
    }
    load()
  }, [])

  const todayFollowUps = followUps.filter(f => f.due_date <= today)
  const upcomingFollowUps = followUps.filter(f => f.due_date > today)

  const filteredDogs = patientFilter === 'All' ? activeDogs : activeDogs.filter(d => d.patient_type === patientFilter)

  const displayedFollowUps = followUpFilter === 'today'
    ? followUps.filter(f => f.due_date === today)
    : followUpFilter === 'week'
    ? followUps.filter(f => f.due_date >= today && f.due_date <= format(new Date(Date.now() + 7 * 86400000), 'yyyy-MM-dd'))
    : followUps

  return (
    <div className="pb-24 md:pb-0 px-4 md:px-8 pt-6 md:pt-0">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">{format(new Date(), 'EEEE, dd MMMM yyyy')}</p>
        </div>
        <div className="md:hidden w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white text-lg">🐾</div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 md:gap-4 mb-6">
        <StatCard value={activeDogs.length} label="Active patients" tone="blue" />
        <StatCard value={todayFollowUps.length} label="Due today" tone="orange" />
        <StatCard value={lowStockMeds.length} label="Low stock" tone="red" />
      </div>

      <div className="md:grid md:grid-cols-3 md:gap-6">
        <div className="md:col-span-2 space-y-6">

          {/* Low stock */}
          {lowStockMeds.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Package size={16} className="text-red-600" />
                <span className="text-sm font-semibold text-red-700">Low stock alert</span>
              </div>
              <div className="grid md:grid-cols-2 gap-1">
                {lowStockMeds.map(m => (
                  <div key={m.id} className="flex justify-between items-center py-1">
                    <span className="text-sm text-red-800">{m.name}</span>
                    <span className="text-xs font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-full">{m.quantity_in_stock} left</span>
                  </div>
                ))}
              </div>
              <Link href="/inventory" className="text-xs text-red-600 font-medium mt-2 inline-block">Manage inventory →</Link>
            </div>
          )}

          {/* Weekly usage summary */}
          {weeklyUsage.length > 0 && (
            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp size={16} className="text-blue-600" />
                <span className="text-sm font-semibold text-blue-700">This week's medicine usage</span>
              </div>
              <div className="space-y-2">
                {weeklyUsage.map(m => {
                  const maxQty = weeklyUsage[0].total_qty || 1
                  return (
                    <div key={m.name} className="flex items-center gap-3">
                      <span className="text-xs text-gray-700 w-32 truncate flex-shrink-0">{m.name}</span>
                      <div className="flex-1 h-2 bg-blue-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-400 rounded-full" style={{ width: `${(m.total_qty / maxQty) * 100}%` }} />
                      </div>
                      <span className="text-xs text-blue-600 font-medium w-16 text-right flex-shrink-0">{m.total_qty} units</span>
                    </div>
                  )
                })}
              </div>
              <p className="text-[10px] text-blue-400 mt-2">Based on treatment logs this week</p>
            </div>
          )}

          {/* Follow-ups with filter */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-gray-900">Follow-ups</h2>
              <div className="flex gap-1">
                {(['all', 'today', 'week'] as FilterType[]).map(f => (
                  <button key={f} onClick={() => setFollowUpFilter(f)}
                    className={cn('px-2 py-1 rounded-lg text-[11px] font-medium transition-colors',
                      followUpFilter === f ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600')}>
                    {f === 'all' ? 'All' : f === 'today' ? 'Today' : '7 days'}
                  </button>
                ))}
              </div>
            </div>
            {loading ? (
              <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 bg-gray-100 rounded-2xl animate-pulse" />)}</div>
            ) : displayedFollowUps.length === 0 ? (
              <div className="bg-green-50 rounded-2xl p-4 flex items-center gap-3">
                <CheckCircle2 size={20} className="text-green-600" />
                <p className="text-sm text-green-700">All clear!</p>
              </div>
            ) : (
              <div className="space-y-2">{displayedFollowUps.map(f => <FollowUpCard key={f.id} followUp={f} />)}</div>
            )}
          </div>
        </div>

        {/* Right column — patients */}
        <div className="mt-6 md:mt-0">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900">Active patients</h2>
            <Link href="/dogs" className="text-xs text-blue-600 font-medium">See all</Link>
          </div>

          {/* Patient type filter */}
          <div className="flex gap-1 flex-wrap mb-3">
            {(['All', 'IPD', 'Resident', 'Visit', 'House Visit'] as PatientFilter[]).map(f => (
              <button key={f} onClick={() => setPatientFilter(f)}
                className={cn('px-2 py-1 rounded-lg text-[11px] font-medium transition-colors',
                  patientFilter === f ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600')}>
                {f}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            {filteredDogs.map(dog => (
              <Link key={dog.id} href={`/dogs/${dog.id}`}
                className="flex items-center justify-between bg-gray-50 rounded-2xl px-4 py-3 hover:bg-gray-100">
                <div className="flex items-center gap-3">
                  {dog.photo_url ? (
                    <img src={dog.photo_url} alt={dog.name} className="w-8 h-8 rounded-xl object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center text-sm flex-shrink-0">🐕</div>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-gray-900">{dog.name}</span>
                      <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full', patientTypeBadgeColor(dog.patient_type))}>{dog.patient_type}</span>
                    </div>
                    <p className="text-xs text-gray-500">#{dog.patient_id}</p>
                  </div>
                </div>
                <ChevronRight size={16} className="text-gray-400" />
              </Link>
            ))}
            {filteredDogs.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No patients</p>}
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ value, label, tone }: { value: number; label: string; tone: 'blue' | 'orange' | 'red' }) {
  const tones = { blue: 'bg-blue-50 text-blue-700', orange: 'bg-orange-50 text-orange-700', red: 'bg-red-50 text-red-700' }
  return (
    <div className={cn('rounded-2xl p-3 md:p-4', tones[tone])}>
      <p className="text-2xl md:text-3xl font-bold">{value}</p>
      <p className="text-xs mt-0.5 opacity-75">{label}</p>
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
      <span className={cn('text-xs font-semibold flex-shrink-0', config.text)}>{config.label}</span>
    </Link>
  )
}
