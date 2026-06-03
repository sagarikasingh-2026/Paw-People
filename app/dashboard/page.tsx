'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { FollowUp, Dog, Medicine } from '@/types'
import { formatDate, getFollowUpUrgency, patientTypeBadgeColor, cn } from '@/lib/utils'
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns'
import { AlertCircle, CheckCircle2, Clock, ChevronRight, Package, TrendingUp, X } from 'lucide-react'
import Link from 'next/link'

type TimeFilter = 'today' | 'week' | 'month' | 'all' | 'custom'
type PatientFilter = 'All' | 'IPD' | 'Resident' | 'Visit' | 'House Visit'
type FollowUpTypeFilter = 'All' | 'Treatment' | 'Vaccination' | 'Deworming' | 'Vet Consult' | 'Diagnostic'
type OverdueSort = 'longest' | 'recent'
type UsageRange = 'week' | 'month'
interface MedUsage { name: string; total_qty: number; total_cost: number }

export default function Dashboard() {
  const [followUps, setFollowUps] = useState<FollowUp[]>([])
  const [activeDogs, setActiveDogs] = useState<Dog[]>([])
  const [lowStockMeds, setLowStockMeds] = useState<Medicine[]>([])
  const [usage, setUsage] = useState<MedUsage[]>([])
  const [loading, setLoading] = useState(true)
  const [usageRange, setUsageRange] = useState<UsageRange>('week')

  // Follow-up filters
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('today')
  const [patientTypeFilter, setPatientTypeFilter] = useState<PatientFilter>('All')
  const [typeFilter, setTypeFilter] = useState<FollowUpTypeFilter>('All')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const [showOverdue, setShowOverdue] = useState(false)
  const [overdueSort, setOverdueSort] = useState<OverdueSort>('longest')

  const [showAllStock, setShowAllStock] = useState(false)
  const [showAllFollowUps, setShowAllFollowUps] = useState(false)

  const today = format(new Date(), 'yyyy-MM-dd')

  useEffect(() => { load() }, [usageRange])  // eslint-disable-line react-hooks/exhaustive-deps

  async function load() {
    const start = usageRange === 'week' ? format(startOfWeek(new Date()), 'yyyy-MM-dd') : format(startOfMonth(new Date()), 'yyyy-MM-dd')
    const end = usageRange === 'week' ? format(endOfWeek(new Date()), 'yyyy-MM-dd') : format(endOfMonth(new Date()), 'yyyy-MM-dd')

    const [fuRes, dogsRes, medsRes, txRes, dxRes] = await Promise.all([
      supabase.from('follow_ups').select('*, dog:dogs(*)').eq('status', 'Pending').order('due_date'),
      supabase.from('dogs').select('*').eq('status', 'Active').order('name'),
      supabase.from('medicines').select('*'),
      supabase.from('treatment_logs').select('*, medicine:medicines(name)').gte('date', start).lte('date', end),
      supabase.from('diagnostics').select('*, dog:dogs(*)').not('follow_up_date', 'is', null).order('follow_up_date'),
    ])
    const dxFollowUps = (dxRes.data || []).map((dx) => ({
      id: 'dx-' + dx.id, dog_id: dx.dog_id, follow_up_type: 'Diagnostic',
      due_date: dx.follow_up_date, status: 'Pending', notes: dx.diagnostic_type + ' reminder',
      completion_notes: null, completed_at: null, next_actions: null, next_action_notes: null, completion_photo_url: null,
      created_at: dx.created_at, updated_at: dx.created_at, dog: dx.dog,
    }))
    const meds = medsRes.data || []
    const allFu = [...(fuRes.data || []), ...dxFollowUps].sort((a, b) => a.due_date.localeCompare(b.due_date))
    setFollowUps(allFu)
    setActiveDogs(dogsRes.data || [])
    setLowStockMeds(meds.filter((m: Medicine) => m.quantity_in_stock <= m.low_stock_threshold))

    const usageMap: Record<string, MedUsage> = {}
    ;(txRes.data || []).forEach((t: any) => {
      if (!t.medicine?.name) return
      const name = t.medicine.name
      if (!usageMap[name]) usageMap[name] = { name, total_qty: 0, total_cost: 0 }
      usageMap[name].total_qty += t.quantity_used || 0
      usageMap[name].total_cost += t.cost || 0
    })
    setUsage(Object.values(usageMap).sort((a, b) => b.total_qty - a.total_qty).slice(0, 6))
    setLoading(false)
  }

  const weekOut = format(new Date(Date.now() + 7 * 86400000), 'yyyy-MM-dd')
  const monthOut = format(endOfMonth(new Date()), 'yyyy-MM-dd')

  // "Due today" = due today OR overdue (matches what's actionable now)
  const dueTodayCount = followUps.filter(f => f.due_date <= today).length
  const overdueFollowUps = followUps.filter(f => f.due_date < today)

  // Apply type + patient filters (shared by both normal and overdue views)
  function applyTypePatient(list: FollowUp[]) {
    return list.filter(f => {
      const typeOk = typeFilter === 'All' || f.follow_up_type === typeFilter
      const dog = f.dog as Dog | undefined
      const patientOk = patientTypeFilter === 'All' || dog?.patient_type === patientTypeFilter
      return typeOk && patientOk
    })
  }

  // Normal (non-overdue) view by time window
  const timeFiltered = followUps.filter(f => {
    if (timeFilter === 'today') return f.due_date <= today          // today + overdue surfaced as "due"
    if (timeFilter === 'week') return f.due_date <= weekOut
    if (timeFilter === 'month') return f.due_date <= monthOut
    if (timeFilter === 'custom') {
      if (customStart && f.due_date < customStart) return false
      if (customEnd && f.due_date > customEnd) return false
      return true
    }
    return true // 'all'
  })
  const displayedFollowUps = applyTypePatient(timeFiltered)

  // Overdue view (independent of time/type/patient filters except sort)
  const sortedOverdue = [...overdueFollowUps].sort((a, b) =>
    overdueSort === 'longest' ? a.due_date.localeCompare(b.due_date) : b.due_date.localeCompare(a.due_date)
  )

  const filteredDogs = activeDogs
  const totalSpend = usage.reduce((sum, u) => sum + u.total_cost, 0)

  return (
    <div className="pb-24 md:pb-0 px-4 md:px-8 pt-6 md:pt-0">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">{format(new Date(), 'EEEE, dd MMMM yyyy')}</p>
        </div>
        <Link href="/settings" className="md:hidden">
          <img src="/logo.jpg" alt="Settings" className="w-10 h-10 rounded-full object-cover" />
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-3 md:gap-4 mb-6">
        <StatCard value={activeDogs.length} label="Active patients" tone="blue" />
        <StatCard value={dueTodayCount} label="Due today" tone="orange" />
        <StatCard value={lowStockMeds.length} label="Low stock" tone="amber" />
      </div>

      <div className="md:grid md:grid-cols-3 md:gap-6">
        <div className="md:col-span-2 space-y-6">

          {/* Follow-ups with filters */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-gray-900">Follow-ups</h2>
            </div>

            {/* Show Overdue pill + (when active) sort */}
            <div className="flex items-center gap-2 flex-wrap mb-3">
              <button onClick={() => setShowOverdue(s => !s)}
                className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                  showOverdue ? 'bg-red-600 text-white border-red-600' : 'bg-white text-red-600 border-red-300 hover:bg-red-50')}>
                {showOverdue && <X size={13} />}
                Show overdue{overdueFollowUps.length > 0 ? ` (${overdueFollowUps.length})` : ''}
              </button>
              {showOverdue && overdueFollowUps.length > 0 && (
                <div className="flex gap-1">
                  {([['longest', 'Longest overdue'], ['recent', 'Most recent']] as [OverdueSort, string][]).map(([val, label]) => (
                    <button key={val} onClick={() => setOverdueSort(val)}
                      className={cn('px-2.5 py-1 rounded-lg text-[11px] font-medium',
                        overdueSort === val ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600')}>
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Normal filters — hidden while viewing overdue to keep things clean */}
            {!showOverdue && (
              <div className="space-y-2 mb-3">
                <div className="flex gap-1.5 flex-wrap">
                  {([['today', 'Today'], ['week', 'This week'], ['month', 'This month'], ['all', 'All'], ['custom', 'Custom']] as [TimeFilter, string][]).map(([val, label]) => (
                    <button key={val} onClick={() => setTimeFilter(val)}
                      className={cn('px-3 py-1.5 rounded-lg text-xs font-medium',
                        timeFilter === val ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600')}>
                      {label}
                    </button>
                  ))}
                </div>
                {timeFilter === 'custom' && (
                  <div className="flex items-center gap-2">
                    <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="flex-1 px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none focus:border-blue-400" />
                    <span className="text-xs text-gray-400">to</span>
                    <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="flex-1 px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none focus:border-blue-400" />
                  </div>
                )}
                <div className="flex gap-1.5 flex-wrap">
                  {(['All', 'Treatment', 'Vaccination', 'Deworming', 'Vet Consult', 'Diagnostic'] as FollowUpTypeFilter[]).map(t => (
                    <button key={t} onClick={() => setTypeFilter(t)}
                      className={cn('px-2.5 py-1 rounded-lg text-[11px] font-medium',
                        typeFilter === t ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-500')}>
                      {t}
                    </button>
                  ))}
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {(['All', 'IPD', 'Resident', 'Visit', 'House Visit'] as PatientFilter[]).map(p => (
                    <button key={p} onClick={() => setPatientTypeFilter(p)}
                      className={cn('px-2.5 py-1 rounded-lg text-[11px] font-medium',
                        patientTypeFilter === p ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-500')}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* The list */}
            {loading ? (
              <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 bg-gray-100 rounded-2xl animate-pulse" />)}</div>
            ) : showOverdue ? (
              sortedOverdue.length === 0 ? (
                <div className="bg-green-50 rounded-2xl p-4 flex items-center gap-3">
                  <CheckCircle2 size={20} className="text-green-600" />
                  <p className="text-sm text-green-700">You're all caught up — no overdue follow-ups! Tap "Show overdue" again to go back.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {(showAllFollowUps ? sortedOverdue : sortedOverdue.slice(0, 5)).map(f => <FollowUpCard key={f.id} followUp={f} />)}
                  {sortedOverdue.length > 5 && (
                    <button onClick={() => setShowAllFollowUps(s => !s)} className="w-full py-2 text-xs text-red-600 font-medium bg-red-50 rounded-xl hover:bg-red-100">
                      {showAllFollowUps ? 'Show less' : `Show ${sortedOverdue.length - 5} more overdue`}
                    </button>
                  )}
                </div>
              )
            ) : displayedFollowUps.length === 0 ? (
              <div className="bg-green-50 rounded-2xl p-4 flex items-center gap-3">
                <CheckCircle2 size={20} className="text-green-600" />
                <p className="text-sm text-green-700">All clear!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {(showAllFollowUps ? displayedFollowUps : displayedFollowUps.slice(0, 5)).map(f => <FollowUpCard key={f.id} followUp={f} />)}
                {displayedFollowUps.length > 5 && (
                  <button onClick={() => setShowAllFollowUps(s => !s)} className="w-full py-2 text-xs text-blue-600 font-medium bg-blue-50 rounded-xl hover:bg-blue-100">
                    {showAllFollowUps ? 'Show less' : `Show ${displayedFollowUps.length - 5} more`}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Medicine usage */}
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <TrendingUp size={16} className="text-blue-600" />
                <span className="text-sm font-semibold text-blue-700">Medicine usage</span>
              </div>
              <div className="flex gap-1">
                {(['week', 'month'] as UsageRange[]).map(r => (
                  <button key={r} onClick={() => setUsageRange(r)}
                    className={cn('px-2 py-1 rounded-lg text-[11px] font-medium',
                      usageRange === r ? 'bg-blue-600 text-white' : 'bg-white text-blue-600 border border-blue-200')}>
                    {r === 'week' ? 'This week' : 'This month'}
                  </button>
                ))}
              </div>
            </div>
            {usage.length === 0 ? (
              <p className="text-xs text-blue-400 py-2">No treatments logged this {usageRange}</p>
            ) : (
              <div className="space-y-2">
                {usage.map(m => {
                  const max = usage[0].total_qty || 1
                  return (
                    <div key={m.name} className="flex items-center gap-3">
                      <span className="text-xs text-gray-700 w-28 md:w-40 truncate flex-shrink-0">{m.name}</span>
                      <div className="flex-1 h-2 bg-blue-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-400 rounded-full" style={{ width: `${(m.total_qty / max) * 100}%` }} />
                      </div>
                      <span className="text-xs text-blue-600 font-medium w-14 text-right flex-shrink-0">{m.total_qty} units</span>
                    </div>
                  )
                })}
              </div>
            )}
            {totalSpend > 0 && (
              <div className="mt-3 pt-3 border-t border-blue-100 flex justify-between items-center">
                <span className="text-xs text-blue-600">Total spend this {usageRange}</span>
                <span className="text-sm font-bold text-blue-900">₹{totalSpend.toFixed(0)}</span>
              </div>
            )}
          </div>

          {/* Low stock alert — amber, below follow-ups + usage */}
          {lowStockMeds.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Package size={16} className="text-amber-600" />
                  <span className="text-sm font-semibold text-amber-800">Low stock</span>
                  <span className="text-xs bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded-full font-bold">{lowStockMeds.length}</span>
                </div>
                {lowStockMeds.length > 6 && (
                  <button onClick={() => setShowAllStock(s => !s)} className="text-xs text-amber-700 font-medium">
                    {showAllStock ? 'Show less' : `+${lowStockMeds.length - 6} more`}
                  </button>
                )}
              </div>
              <div className="grid md:grid-cols-2 gap-1">
                {(showAllStock ? lowStockMeds : lowStockMeds.slice(0, 6)).map(m => (
                  <Link key={m.id} href={`/inventory?focus=${m.id}`} className="flex justify-between items-center py-1 px-1 rounded-lg hover:bg-amber-100">
                    <span className="text-sm text-amber-900">{m.name}</span>
                    <span className="text-xs font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">{m.quantity_in_stock} left</span>
                  </Link>
                ))}
              </div>
              <Link href="/inventory" className="text-xs text-amber-700 font-medium mt-2 inline-block">Manage inventory →</Link>
            </div>
          )}
        </div>

        {/* Active patients — top 5, no filters */}
        <div className="mt-6 md:mt-0">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900">Active patients</h2>
            <Link href="/dogs" className="text-xs text-blue-600 font-medium">See all</Link>
          </div>
          <div className="space-y-2">
            {filteredDogs.slice(0, 5).map(dog => (
              <Link key={dog.id} href={`/dogs/${dog.id}`} className="flex items-center justify-between bg-gray-50 rounded-2xl px-4 py-3 hover:bg-gray-100">
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

function StatCard({ value, label, tone }: { value: number; label: string; tone: 'blue' | 'orange' | 'amber' }) {
  const tones = { blue: 'bg-blue-50 text-blue-700', orange: 'bg-orange-50 text-orange-700', amber: 'bg-amber-50 text-amber-700' }
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
    <Link href={`/dogs/${followUp.dog_id}?tab=followups`} className={cn('flex items-center justify-between border rounded-2xl px-4 py-3', config.bg)}>
      <div className="flex items-center gap-3">
        {dog?.photo_url ? (
          <img src={dog.photo_url} alt={dog.name} className="w-9 h-9 rounded-xl object-cover flex-shrink-0" />
        ) : (
          <div className="w-9 h-9 rounded-xl bg-white/60 flex items-center justify-center text-base flex-shrink-0">🐕</div>
        )}
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
