'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Medicine } from '@/types'
import { cn, sanitizeQuantity } from '@/lib/utils'
import { Plus, AlertTriangle, Package, ChevronDown, ChevronUp, X, Edit2, Trash2, Search } from 'lucide-react'

type StockFilter = 'all' | 'low' | 'ok' | 'out'

export default function InventoryPage() {
  const [medicines, setMedicines] = useState<Medicine[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [restockId, setRestockId] = useState<string | null>(null)
  const [restockQty, setRestockQty] = useState('')
  const [editing, setEditing] = useState<Medicine | null>(null)
  const [search, setSearch] = useState('')
  const [stockFilter, setStockFilter] = useState<StockFilter>('all')
  const [showAllLowStock, setShowAllLowStock] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
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
    setRestockId(null); setRestockQty(''); load()
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this medicine? This will not affect existing treatment logs.')) return
    await supabase.from('medicines').delete().eq('id', id)
    load()
  }

  const filtered = medicines
    .filter(m => m.name.toLowerCase().includes(search.toLowerCase()) || (m.composition ?? '').toLowerCase().includes(search.toLowerCase()))
    .filter(m => {
      if (stockFilter === 'all') return true
      if (stockFilter === 'low') return m.quantity_in_stock > 0 && m.quantity_in_stock <= m.low_stock_threshold
      if (stockFilter === 'ok') return m.quantity_in_stock > m.low_stock_threshold
      if (stockFilter === 'out') return m.quantity_in_stock === 0
      return true
    })

  const lowStock = medicines.filter(m => m.quantity_in_stock <= m.low_stock_threshold)

  return (
    <div className="pb-24 md:pb-8 px-4 md:px-0 pt-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Inventory</h1>
        <button onClick={() => setShowAddForm(!showAddForm)} className="flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium">
          <Plus size={16} /> Add
        </button>
      </div>

      {lowStock.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-600" />
              <span className="text-sm font-semibold text-amber-800">{lowStock.length} item{lowStock.length > 1 ? 's' : ''} at or below alert level</span>
            </div>
            {lowStock.length > 8 && (
              <button onClick={() => setShowAllLowStock(s => !s)} className="text-xs text-amber-700 font-medium flex-shrink-0">
                {showAllLowStock ? 'Show less' : `+${lowStock.length - 8} more`}
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(showAllLowStock ? lowStock : lowStock.slice(0, 8)).map(m => (
              <span key={m.id} className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-medium">{m.name}: {m.quantity_in_stock}</span>
            ))}
          </div>
          <p className="text-[11px] text-amber-600 mt-2">Alert level defaults to 5. Edit any item (✏️) to change its alert level, or set it to 0 to stop alerts for that item.</p>
        </div>
      )}

      {showAddForm && <AddMedicineForm onAdded={() => { setShowAddForm(false); load() }} />}

      {/* Search + filter */}
      <div className="space-y-2 mb-4">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Search medicine..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-400" />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {(['all', 'low', 'ok', 'out'] as StockFilter[]).map(f => (
            <button key={f} onClick={() => setStockFilter(f)}
              className={cn('px-3 py-1.5 rounded-lg text-xs font-medium',
                stockFilter === f ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600')}>
              {f === 'all' ? 'All' : f === 'low' ? 'Low stock' : f === 'ok' ? 'In stock' : 'Out of stock'}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {loading ? (
          [1,2,3,4,5].map(i => <div key={i} className="h-16 bg-gray-100 rounded-2xl animate-pulse" />)
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Package size={40} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">No medicines found</p>
          </div>
        ) : filtered.map(med => {
          const isLow = med.quantity_in_stock <= med.low_stock_threshold
          const isOut = med.quantity_in_stock === 0
          const isExpanded = expandedId === med.id
          const isRestocking = restockId === med.id
          const stockPct = Math.min(100, (med.quantity_in_stock / Math.max(1, med.low_stock_threshold * 4)) * 100)

          return (
            <div key={med.id} className={cn('rounded-2xl border',
              isOut ? 'border-red-300 bg-red-50' : isLow ? 'border-amber-200 bg-amber-50' : 'border-gray-200 bg-gray-50')}>
              <button onClick={() => setExpandedId(isExpanded ? null : med.id)} className="w-full flex items-center justify-between px-4 py-3 text-left">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-gray-900 truncate">{med.name}</span>
                    {isOut ? <span className="text-[10px] bg-red-200 text-red-800 px-1.5 py-0.5 rounded font-bold">OUT</span> : isLow && <AlertTriangle size={13} className="text-amber-500 flex-shrink-0" />}
                  </div>
                  {med.composition && <p className="text-[11px] text-gray-400 mt-0.5">{med.composition}</p>}
                  <div className="flex items-center gap-3 mt-1">
                    <span className={cn('text-base font-bold', isOut ? 'text-red-700' : isLow ? 'text-amber-700' : 'text-gray-700')}>{med.quantity_in_stock}</span>
                    <span className="text-xs text-gray-400">units in stock</span>
                    {med.power_mg && <span className="text-xs text-gray-400">{med.power_mg}</span>}
                  </div>
                  <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden w-40">
                    <div className={cn('h-full rounded-full', isOut ? 'bg-red-400' : isLow ? 'bg-amber-400' : 'bg-green-400')} style={{ width: `${stockPct}%` }} />
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
                      <input type="text" inputMode="decimal" value={restockQty} onChange={e => setRestockQty(sanitizeQuantity(e.target.value))} placeholder="Qty to add"
                        className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-xl text-sm outline-none focus:border-blue-400" />
                      <button onClick={() => handleRestock(med.id)} className="bg-green-600 text-white px-3 py-2 rounded-xl text-sm font-medium">Add</button>
                      <button onClick={() => { setRestockId(null); setRestockQty('') }} className="p-2 rounded-xl bg-gray-200"><X size={14} /></button>
                    </div>
                  ) : (
                    <div className="flex gap-1.5 mt-1">
                      <button onClick={() => setRestockId(med.id)} className="flex-1 py-2 border border-dashed border-green-400 text-green-700 rounded-xl text-sm font-medium hover:bg-green-50">+ Restock</button>
                      <button onClick={() => setEditing(med)} className="px-3 py-2 border border-gray-200 text-gray-600 rounded-xl"><Edit2 size={14} /></button>
                      <button onClick={() => handleDelete(med.id)} className="px-3 py-2 border border-red-200 text-red-500 rounded-xl"><Trash2 size={14} /></button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {editing && <EditMedicineModal med={editing} onSaved={() => { setEditing(null); load() }} onClose={() => setEditing(null)} />}
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
    e.preventDefault(); setLoading(true)
    const { error } = await supabase.from('medicines').insert([{
      name: form.name, composition: form.composition || null, power_mg: form.power_mg || null,
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
        <input required type="text" inputMode="decimal" placeholder="Qty *" value={form.quantity_in_stock} onChange={e => setForm(f => ({ ...f, quantity_in_stock: sanitizeQuantity(e.target.value) }))} className={inputCls} />
        <input type="text" inputMode="decimal" placeholder="Cost/unit" value={form.cost_per_unit} onChange={e => setForm(f => ({ ...f, cost_per_unit: sanitizeQuantity(e.target.value) }))} className={inputCls} />
        <input type="text" inputMode="numeric" placeholder="Alert at" value={form.low_stock_threshold} onChange={e => setForm(f => ({ ...f, low_stock_threshold: e.target.value.replace(/\D/g, '') }))} className={inputCls} />
      </div>
      <input placeholder="Issued by" value={form.issued_by} onChange={e => setForm(f => ({ ...f, issued_by: e.target.value }))} className={inputCls} />
      <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-60">{loading ? 'Adding...' : 'Add Medicine'}</button>
    </form>
  )
}

function EditMedicineModal({ med, onSaved, onClose }: { med: Medicine; onSaved: () => void; onClose: () => void }) {
  const [form, setForm] = useState({
    name: med.name, composition: med.composition || '', power_mg: med.power_mg || '',
    quantity_in_stock: med.quantity_in_stock.toString(),
    cost_per_unit: med.cost_per_unit?.toString() || '',
    low_stock_threshold: med.low_stock_threshold.toString(),
    issued_by: med.issued_by || '',
  })
  const [loading, setLoading] = useState(false)
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true)
    const { error } = await supabase.from('medicines').update({
      name: form.name, composition: form.composition || null, power_mg: form.power_mg || null,
      quantity_in_stock: parseFloat(form.quantity_in_stock) || 0,
      cost_per_unit: form.cost_per_unit ? parseFloat(form.cost_per_unit) : null,
      low_stock_threshold: parseInt(form.low_stock_threshold) || 5,
      issued_by: form.issued_by || null,
    }).eq('id', med.id)
    setLoading(false)
    if (!error) onSaved()
  }
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-md p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Edit Medicine</h2>
          <button onClick={onClose} className="p-2 rounded-xl bg-gray-100"><X size={16} /></button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Medicine Name</label>
            <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Composition</label>
            <input placeholder="e.g. Cefotaxime Sodium" value={form.composition} onChange={e => setForm(f => ({ ...f, composition: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Power / Strength</label>
            <input placeholder="e.g. 500 mg" value={form.power_mg} onChange={e => setForm(f => ({ ...f, power_mg: e.target.value }))} className={inputCls} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Quantity</label>
              <input inputMode="decimal" placeholder="Qty" value={form.quantity_in_stock} onChange={e => setForm(f => ({ ...f, quantity_in_stock: sanitizeQuantity(e.target.value) }))} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Cost (₹)</label>
              <input inputMode="decimal" placeholder="Cost" value={form.cost_per_unit} onChange={e => setForm(f => ({ ...f, cost_per_unit: sanitizeQuantity(e.target.value) }))} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Alert at</label>
              <input inputMode="numeric" placeholder="5" value={form.low_stock_threshold} onChange={e => setForm(f => ({ ...f, low_stock_threshold: e.target.value.replace(/\D/g, '') }))} className={inputCls} />
            </div>
          </div>
          <p className="text-[11px] text-gray-400 -mt-1">"Alert at" sets the low-stock warning level. Set to 0 to never get a low-stock alert for this item.</p>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Issued By</label>
            <input placeholder="Optional" value={form.issued_by} onChange={e => setForm(f => ({ ...f, issued_by: e.target.value }))} className={inputCls} />
          </div>
          <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-3 rounded-2xl font-semibold text-sm disabled:opacity-60">{loading ? 'Saving...' : 'Save Changes'}</button>
        </form>
      </div>
    </div>
  )
}

const inputCls = 'w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-400'
