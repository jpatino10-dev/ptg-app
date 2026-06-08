'use client'

import { useState } from 'react'

const TYPES = [
  { id: 'individual', label: 'Individual' },
  { id: 'semi',       label: 'Semi-Private' },
  { id: 'group',      label: 'Group' },
  { id: 'camp',       label: 'Camp / Clinic' },
]

const DURATIONS = [
  { label: '30 min', value: 30 },
  { label: '1 hr',   value: 60 },
  { label: '1.5 hrs',value: 90 },
  { label: '2 hrs',  value: 120 },
]

function toTimeInput(display: string): string {
  const m = display.match(/^(\d+):(\d+)\s*(AM|PM)$/i)
  if (!m) return '16:00'
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

type Props = { onClose: () => void; onCreated: () => void }

export default function CoachNewSessionModal({ onClose, onCreated }: Props) {
  const [client,   setClient]   = useState('')
  const [type,     setType]     = useState('individual')
  const [date,     setDate]     = useState(new Date().toISOString().split('T')[0])
  const [hour,     setHour]     = useState('4:00 PM')
  const [duration, setDuration] = useState(60)
  const [notes,    setNotes]    = useState('')
  const [location, setLocation] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/coach/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client, type, date, hour, duration, notes, location }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create session')
      onCreated(); onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-end sm:items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-black text-[#cee800]">NEW SESSION</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Player / Client Name</label>
            <input required value={client} onChange={e => setClient(e.target.value)}
              placeholder="e.g. Liam McGrath"
              className="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-[#cee800]" />
          </div>

          <div>
            <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Session Type</label>
            <div className="mt-1 grid grid-cols-2 gap-2">
              {TYPES.map(t => (
                <button key={t.id} type="button" onClick={() => setType(t.id)}
                  className={`px-3 py-2 rounded-xl text-sm font-semibold border transition ${type === t.id ? 'bg-[#cee800] text-black border-[#cee800]' : 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:border-[#cee800]'}`}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Date</label>
              <input type="date" required value={date} onChange={e => setDate(e.target.value)}
                className="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#cee800]" />
            </div>
            <div>
              <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Time</label>
              <input type="time" step="900" value={toTimeInput(hour)}
                onChange={e => e.target.value && setHour(fromTimeInput(e.target.value))}
                className="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#cee800]" />
            </div>
          </div>

          <div>
            <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Duration</label>
            <div className="mt-1 grid grid-cols-4 gap-2">
              {DURATIONS.map(d => (
                <button key={d.value} type="button" onClick={() => setDuration(d.value)}
                  className={`px-2 py-2 rounded-xl text-sm font-semibold border transition ${duration === d.value ? 'bg-[#cee800] text-black border-[#cee800]' : 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:border-[#cee800]'}`}>
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Location <span className="text-zinc-600 normal-case">(optional)</span></label>
            <input value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Field 3"
              className="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-[#cee800]" />
          </div>

          <div>
            <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Notes <span className="text-zinc-600 normal-case">(optional)</span></label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              placeholder="Focus area, equipment needed..."
              className="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-[#cee800] resize-none" />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button type="submit" disabled={loading}
            className="w-full bg-[#cee800] text-black font-black py-3 rounded-xl hover:bg-[#d4f030] transition disabled:opacity-50">
            {loading ? 'ADDING...' : 'ADD SESSION'}
          </button>
        </form>
      </div>
    </div>
  )
}
