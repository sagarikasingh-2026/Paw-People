'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Medicine } from '@/types'
import { cn } from '@/lib/utils'
import { Plus, AlertTriangle, Package, ChevronDown, ChevronUp, X } from 'lucide-react'

export default function InventoryPage() {
  const [medicines, setMedicines] = useState<Medicine[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [restockId, setRestockId] = useState<string | null>(null)
  const [restockQty, setRestockQty] = useState('')

  useEffect(() => { loadMedicines() }, [])

  async function loadMedicines() {
    const { data } = await supabase.from('medicines').select('*').order('name')
    setMedicines(data || [])
    setLoading(false)
  }

  async function handleRestock(id: string) {
    const qty = parseFloat(restockQty)
    if (!qty || qty <= 0) return
    const med = medicines.find(m => m.id === id)
    if (!med) return
    await supabase.from('medicines').update({ quantity_in_stock: med.quantity_in_stock + qty }).eq('id', id)
    setRestockId(null)
    setRestockQty('')
    loadMedicines()
  }

  const lowStock = medicines.filter(m => m.quantity_in_stock <= m.low_stock_threshold)

  return (
    <div className="pb-24 md:pb-0">
      <div className="px-4 pt-6 pb-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
          <button onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium">
            <Plus size={16} /> Add
          </button>
        </div>

        {lowStock.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-3 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={16} className="text-red-600" />
              <span className="text-sm font-semibold text-red-700">{lowStock.length} medicine{lowStock.length > 1 ? 's' : ''} running low</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {lowStock.map(m => (
                <span key={m.id} className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
                  {m.name}: {m.quantity_in_stock} left
                </span>
              ))}
            </div>
          </div>
        )}

        {showAddForm && <AddMedicineForm onAdded={() => { setShowAddForm(false); loadMedicines() }} />}
      </div>

      <div className="px-4 space-y-2">
        {loading ? (
          [1,2,3,4,5].map(i => <div key={i} className="h-16 bg-gray-100 rounded-2xl animate-pulse" />)
        ) : medicines.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Package size={40} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">No medicines in inventory</p>
          </div>
        ) : medicines.map(med => {
          const isLow = med.quantity_in_stock <= med.low_stock_threshold
          const isExpanded = expandedId === med.id
          const isRestocking = restockId === med.id
          const stockPct = Math.min(100, (med.quantity_in_stock / Math.max(1, med.low_stock_threshold * 4)) * 100)

          return (
            <div key={med.id} className={cn('rounded-2xl border', isLow ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-gray-50')}>
              <button onClick={() => setExpandedId(isExpanded ? null : med.id)}
                className="w-full flex items-center justify-between px-4 py-3 text-left">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-gray-900 truncate">{med.name}</span>
                    {isLow && <AlertTriangle size={13} className="text-red-500 flex-shrink-0" />}
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className={cn('text-base font-bold', isLow ? 'text-red-700' : 'text-gray-700')}>{med.quantity_in_stock}</span>
                    <span className="text-xs text-gray-400">units in stock</span>
                    {med.power_mg && <span className="text-xs text-gray-400">{med.power_mg}</span>}
                  </div>
                  <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden w-40">
                    <div className={cn('h-full rounded-full', isLow ? 'bg-red-400' : 'bg-green-400')} style={{ width: `${stockPct}%` }} />
                  </div>
                </div>
                {isExpanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
              </button>

              {isExpanded && (
                <div className="px-4 pb-3 border-t border-gray-200 pt-3 space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                    {med.composition && <Info label="Composition" value={med.composition} />}
                    {med.cost_per_unit != null && <Info label="Cost/unit" value={`₹${med.cost_per_unit}`} />}
                    {med.issued_by && <Info label="Issued by" value={med.issued_by} />}
                    <Info label="Low stock at" value={`${med.low_stock_threshold} units`} />
                  </div>

                  {isRestocking ? (
                    <div className="flex gap-2 mt-2">
                      <input type="number" value={restockQty} onChange={e => setRestockQty(e.target.value)}
                        placeholder="Qty to add" className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-xl text-sm outline-none focus:border-blue-400" />
                      <button onClick={() => handleRestock(med.id)} className="bg-green-600 text-white px-3 py-2 rounded-xl text-sm font-medium">Add</button>
                      <button onClick={() => { setRestockId(null); setRestockQty('') }} className="p-2 rounded-xl bg-gray-200"><X size={14} /></button>
                    </div>
                  ) : (
                    <button onClick={() => setRestockId(med.id)} className="w-full mt-1 py-2 border border-dashed border-green-400 text-green-700 rounded-xl text-sm font-medium hover:bg-green-50">
                      + Restock
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (<div><p className="text-[10px] text-gray-400 uppercase tracking-wide">{label}</p><p className="font-medium text-gray-700">{value}</p></div>)
}

function AddMedicineForm({ onAdded }: { onAdded: () => void }) {
  const [form, setForm] = useState({ name: '', composition: '', power_mg: '', quantity_in_stock: '', cost_per_unit: '', low_stock_threshold: '5', issued_by: '' })
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.from('medicines').insert([{
      name: form.name,
      composition: form.composition || null,
      power_mg: form.power_mg || null,
      quantity_in_stock: parseFloat(form.quantity_in_stock) || 0,
      cost_per_unit: form.cost_per_unit ? parseFloat(form.cost_per_unit) : null,
      low_stock_threshold: parseInt(form.low_stock_threshold) || 5,
      issued_by: form.issued_by || null,
    }])
    setLoading(false)
    if (!error) onAdded()
    else alert('Error: ' + error.message)
  }

  return (
    <form onSubmit={submit} className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-4 space-y-3">
      <p className="text-sm font-semibold text-blue-800">Add Medicine</p>
      <input required placeholder="Medicine name *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inputCls} />
      <div className="grid grid-cols-2 gap-2">
        <input placeholder="Composition" value={form.composition} onChange={e => setForm(f => ({ ...f, composition: e.target.value }))} className={inputCls} />
        <input placeholder="Power/Mg" value={form.power_mg} onChange={e => setForm(f => ({ ...f, power_mg: e.target.value }))} className={inputCls} />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <input required type="number" placeholder="Qty *" value={form.quantity_in_stock} onChange={e => setForm(f => ({ ...f, quantity_in_stock: e.target.value }))} className={inputCls} />
        <input type="number" placeholder="Cost/unit" value={form.cost_per_unit} onChange={e => setForm(f => ({ ...f, cost_per_unit: e.target.value }))} className={inputCls} />
        <input type="number" placeholder="Alert at" value={form.low_stock_threshold} onChange={e => setForm(f => ({ ...f, low_stock_threshold: e.target.value }))} className={inputCls} />
      </div>
      <input placeholder="Issued by" value={form.issued_by} onChange={e => setForm(f => ({ ...f, issued_by: e.target.value }))} className={inputCls} />
      <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-60">
        {loading ? 'Adding...' : 'Add Medicine'}
      </button>
    </form>
  )
}

const inputCls = 'w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-400'
