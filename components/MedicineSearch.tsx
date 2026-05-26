'use client'
import { useState, useRef, useEffect } from 'react'
import { Search, X } from 'lucide-react'
import { Medicine } from '@/types'
import { cn } from '@/lib/utils'

interface Props {
  medicines: Medicine[]
  value: string
  onChange: (medicineId: string, medicine: Medicine | null) => void
  placeholder?: string
  className?: string
}

export default function MedicineSearch({ medicines, value, onChange, placeholder = 'Search medicine...', className }: Props) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const selected = medicines.find(m => m.id === value) ?? null

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const filtered = medicines.filter(m =>
    m.name.toLowerCase().includes(query.toLowerCase()) ||
    (m.composition ?? '').toLowerCase().includes(query.toLowerCase())
  ).slice(0, 10)

  function select(med: Medicine) {
    onChange(med.id, med)
    setQuery('')
    setOpen(false)
  }

  function clear() {
    onChange('', null)
    setQuery('')
  }

  return (
    <div ref={ref} className={cn('relative', className)}>
      {selected ? (
        <div className="flex items-center justify-between px-3 py-2.5 bg-blue-50 border border-blue-200 rounded-xl">
          <div>
            <span className="text-sm font-medium text-blue-900">{selected.name}</span>
            {selected.power_mg && <span className="text-xs text-blue-600 ml-2">{selected.power_mg}</span>}
            <span className="text-xs text-gray-500 ml-2">{selected.quantity_in_stock} in stock</span>
          </div>
          <button type="button" onClick={clear} className="text-blue-400 hover:text-blue-600"><X size={14} /></button>
        </div>
      ) : (
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={e => { setQuery(e.target.value); setOpen(true) }}
            onFocus={() => setOpen(true)}
            placeholder={placeholder}
            className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-400 focus:bg-white"
          />
        </div>
      )}

      {open && !selected && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 max-h-52 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="text-sm text-gray-400 px-4 py-3">No medicines found</p>
          ) : filtered.map(med => (
            <button key={med.id} type="button" onClick={() => select(med)}
              className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 text-left border-b border-gray-50 last:border-0">
              <div>
                <p className="text-sm font-medium text-gray-900">{med.name}</p>
                {med.composition && <p className="text-xs text-gray-400">{med.composition}</p>}
              </div>
              <div className="text-right flex-shrink-0 ml-4">
                {med.power_mg && <p className="text-xs text-gray-500">{med.power_mg}</p>}
                <p className="text-xs text-gray-400">{med.quantity_in_stock} left</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
