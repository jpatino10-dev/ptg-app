'use client'

import { useState, useEffect } from 'react'

function toTimeInput(display: string): string {
  const m = display.match(/^(\d+):(\d+)\s*(AM|PM)$/i)
  if (!m) return '18:00'
  let h = parseInt(m[1]); const min = m[2]; const ampm = m[3].toUpperCase()
  if (ampm === 'PM' && h !== 12) h += 12
  if (ampm === 'AM' && h === 12) h = 0
  return `${String(h).padStart(2, '0')}:${min}`
}
function fromTimeInput(val: string): string {
  const [hStr, min] = val.split(':'); let h = parseInt(hStr)
  const ampm = h >= 12 ? 'PM' : 'AM'
  if (h > 12) h -= 12; if (h === 0) h = 12
  return `${h}:${min} ${ampm}`
}

type DateRow = { id: number; date: string; hour: string }

type Props = {
  onClose: () => void
  onCreated: () => void
}

export default function NewGroupSessionModal({ onClose, onCreated }: Props) {
  const [coaches, setCoaches]   = useState<string[]>([])
  const [name, setName]         = useState('')
  const [coach, setCoach]       = useState('')
  const [capacity, setCapacity] = useState('12')
  const [price, setPrice]       = useState('')
  const [location, setLocation] = useState('')
  const [notes, setNotes]       = useState('')
  const [rows, setRows]         = useState<DateRow[]>([
    { id: 1, date: new Date().toISOString().split('T')[0], hour: '6:00 PM' },
  ])
  const [nextId, setNextId]     = useState(2)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  useEffect(() => {
    fetch('/api/coaches').then(r => r.json()).then(data => {
      if (Array.isArray(data)) { setCoaches(data); setCoach(data[0] || '') }
    })
  }, [])

  function addRow() {
    const last = rows[rows.length - 1]
    // Default next date to 7 days after the last one
    const next = last ? new Date(last.date + 'T12:00:00') : new Date()
    if (last) next.setDate(next.getDate() + 7)
    setRows(r => [...r, { id: nextId, date: next.toISOString().split('T')[0], hour: last?.hour || '6:00 PM' }])
    setNextId(n => n + 1)
  }

  function removeRow(id: number) {
    setRows(r => r.filter(row => row.id !== id))
  }

  function updateRow(id: number, field: 'date' | 'hour', value: string) {
    setRows(r => r.map(row => row.id === id ? { ...row, [field]: value } : row))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (rows.length === 0) { setError('Add at least one date.'); return }
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title:       name,
          coach,
          type:        'group',
          date:        rows[0].date,
          hour:        rows[0].hour,
          duration:    60,
          notes:       notes || null,
          location:    location || null,
          price:       price !== '' ? parseFloat(price).toFixed(2) : null,
          recurType:   'none',
          occurrences: 1,
          extraDates:  rows.slice(1).map(r => ({ date: r.date, hour: r.hour })),
          capacity:    parseInt(capacity) || 12,
          isGroup:     true,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create sessions')
      onCreated(); onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-end sm:items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-black text-[#00e676]">NEW GROUP SESSION</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Name */}
          <div>
            <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Session Name</label>
            <input required value={name} onChange={e => setName(e.target.value)}
              placeholder="e.g. Elite Boys July Series"
              className="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-[#00e676]" />
          </div>

          {/* Coach + Capacity */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Coach</label>
              <select value={coach} onChange={e => setCoach(e.target.value)}
                className="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#00e676]">
                {coaches.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Spots (capacity)</label>
              <input type="number" min="1" max="100" value={capacity} onChange={e => setCapacity(e.target.value)} required
                className="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#00e676]" />
            </div>
          </div>

          {/* Price + Location */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Drop-in Price <span className="text-zinc-600 normal-case">(optional)</span></label>
              <div className="mt-1 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">$</span>
                <input type="number" min="0" step="0.01" value={price} onChange={e => setPrice(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl pl-7 pr-3 py-2.5 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-[#00e676]" />
              </div>
            </div>
            <div>
              <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Location <span className="text-zinc-600 normal-case">(optional)</span></label>
              <input value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Field 3"
                className="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-[#00e676]" />
            </div>
          </div>

          {/* Dates */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">
                Dates <span className="text-zinc-600 normal-case">({rows.length} session{rows.length !== 1 ? 's' : ''})</span>
              </label>
              <button type="button" onClick={addRow}
                className="text-xs font-bold text-[#00e676] hover:underline">+ Add date</button>
            </div>
            <div className="space-y-2">
              {rows.map((row, i) => (
                <div key={row.id} className="flex items-center gap-2 bg-zinc-800 rounded-xl px-3 py-2">
                  <span className="text-zinc-500 text-xs w-4 shrink-0">{i + 1}</span>
                  <input type="date" value={row.date} onChange={e => updateRow(row.id, 'date', e.target.value)} required
                    className="flex-1 bg-transparent text-white text-sm focus:outline-none" />
                  <input type="time" step="900" value={toTimeInput(row.hour)}
                    onChange={e => e.target.value && updateRow(row.id, 'hour', fromTimeInput(e.target.value))}
                    className="bg-transparent text-white text-sm focus:outline-none" />
                  {rows.length > 1 && (
                    <button type="button" onClick={() => removeRow(row.id)} className="text-zinc-600 hover:text-red-400 text-lg leading-none">×</button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Notes <span className="text-zinc-600 normal-case">(optional)</span></label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              placeholder="Focus area, equipment, series name..."
              className="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-[#00e676] resize-none" />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button type="submit" disabled={loading}
            className="w-full bg-[#00e676] text-black font-black py-3 rounded-xl hover:bg-[#33eb91] transition disabled:opacity-50">
            {loading ? 'CREATING...' : `CREATE ${rows.length} GROUP SESSION${rows.length !== 1 ? 'S' : ''}`}
          </button>
        </form>
      </div>
    </div>
  )
}
