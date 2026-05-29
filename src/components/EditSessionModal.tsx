'use client'

import { useState } from 'react'

const COACHES = ['Coach Aidan', 'Coach A', 'Coach Josh']
const TYPES = [
  { id: 'individual', label: 'Individual' },
  { id: 'semi',       label: 'Semi-Individual' },
  { id: 'group',      label: 'Group Training' },
  { id: 'camp',       label: 'Camp / Clinic' },
]
const HOURS = [
  '6:00 AM','6:30 AM','7:00 AM','7:30 AM','8:00 AM','8:30 AM',
  '9:00 AM','9:30 AM','10:00 AM','10:30 AM','11:00 AM','11:30 AM',
  '12:00 PM','12:30 PM','1:00 PM','1:30 PM','2:00 PM','2:30 PM',
  '3:00 PM','3:30 PM','4:00 PM','4:30 PM','5:00 PM','5:30 PM',
  '6:00 PM','6:30 PM','7:00 PM','7:30 PM','8:00 PM','8:30 PM',
]
const DURATIONS = [
  { label: '30 min', value: 30 },
  { label: '1 hr',   value: 60 },
  { label: '1.5 hrs',value: 90 },
  { label: '2 hrs',  value: 120 },
  { label: '2.5 hrs',value: 150 },
  { label: '3 hrs',  value: 180 },
]

type Booking = {
  id: string; date: string; hour: string; coach: string; type: string
  player_name: string | null; client: string; status: string
  notes?: string | null; duration_minutes: number | null
}

type Props = {
  booking: Booking
  onClose: () => void
  onSaved: () => void
}

export default function EditSessionModal({ booking, onClose, onSaved }: Props) {
  const isMultiCoach = booking.type === 'camp'
  const initialCoaches = booking.coach?.split(', ').map(s => s.trim()).filter(Boolean) || []

  const [title, setTitle]     = useState(booking.player_name || booking.client || '')
  const [type, setType]       = useState(booking.type || 'individual')
  const [date, setDate]       = useState(booking.date)
  const [hour, setHour]       = useState(booking.hour)
  const [duration, setDuration] = useState(booking.duration_minutes || 60)
  const [notes, setNotes]     = useState(booking.notes || '')
  const [status, setStatus]   = useState(booking.status || 'confirmed')

  // Single coach
  const [coach, setCoach]     = useState(
    !isMultiCoach && initialCoaches.length === 1 ? initialCoaches[0] : COACHES[0]
  )
  // Multi coach (camp)
  const [selectedCoaches, setSelectedCoaches] = useState<string[]>(
    isMultiCoach ? initialCoaches : []
  )

  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [applyToAll, setApplyToAll] = useState(false)

  const isCamp = type === 'camp'

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const coachValue = isCamp ? selectedCoaches.join(', ') : coach
      const res = await fetch(`/api/sessions/${booking.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client:           title,
          player_name:      title,
          type,
          date,
          hour,
          coach:            coachValue,
          duration_minutes: duration,
          notes,
          status,
          applyToAll,
          applyToClient:    applyToAll ? (booking.client || booking.player_name) : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save')
      onSaved()
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-end sm:items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-black text-[#cee800]">EDIT SESSION</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white">✕</button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">

          {/* Title */}
          <div>
            <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Session Title</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} required
              className="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#cee800]" />
          </div>

          {/* Type */}
          <div>
            <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Session Type</label>
            <div className="mt-1 grid grid-cols-2 gap-2">
              {TYPES.map(t => (
                <button key={t.id} type="button" onClick={() => setType(t.id)}
                  className={`px-3 py-2 rounded-xl text-sm font-semibold border transition ${
                    type === t.id ? 'bg-[#cee800] text-black border-[#cee800]' : 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:border-[#cee800]'
                  }`}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Coach */}
          <div>
            <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">
              {isCamp ? 'Coaches (select all attending)' : 'Coach'}
            </label>
            {isCamp ? (
              <div className="mt-1 space-y-2">
                {COACHES.map(c => {
                  const checked = selectedCoaches.includes(c)
                  return (
                    <button key={c} type="button"
                      onClick={() => setSelectedCoaches(prev => checked ? prev.filter(x => x !== c) : [...prev, c])}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-sm font-semibold transition ${
                        checked ? 'bg-[#cee800]/10 border-[#cee800] text-[#cee800]' : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:border-[#cee800]'
                      }`}>
                      <span className={`w-4 h-4 rounded border flex items-center justify-center text-xs shrink-0 ${checked ? 'bg-[#cee800] border-[#cee800] text-black' : 'border-zinc-500'}`}>
                        {checked ? '✓' : ''}
                      </span>
                      {c}
                    </button>
                  )
                })}
              </div>
            ) : (
              <select value={coach} onChange={e => setCoach(e.target.value)}
                className="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#cee800]">
                {COACHES.map(c => <option key={c}>{c}</option>)}
              </select>
            )}
          </div>

          {/* Date + Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} required
                className="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#cee800]" />
            </div>
            <div>
              <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Time</label>
              <select value={hour} onChange={e => setHour(e.target.value)}
                className="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#cee800]">
                {HOURS.map(h => <option key={h}>{h}</option>)}
              </select>
            </div>
          </div>

          {/* Duration */}
          <div>
            <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Duration</label>
            <div className="mt-1 grid grid-cols-3 gap-2">
              {DURATIONS.map(d => (
                <button key={d.value} type="button" onClick={() => setDuration(d.value)}
                  className={`px-2 py-2 rounded-xl text-sm font-semibold border transition ${
                    duration === d.value ? 'bg-[#cee800] text-black border-[#cee800]' : 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:border-[#cee800]'
                  }`}>
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Status</label>
            <select value={status} onChange={e => setStatus(e.target.value)}
              className="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#cee800]">
              {['confirmed','pending_payment','cancelled','completed'].map(s => (
                <option key={s} value={s}>{s.replace('_',' ')}</option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              placeholder="Location, focus area, etc."
              className="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-[#cee800] resize-none" />
          </div>

          {/* Apply scope */}
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setApplyToAll(false)}
              className={`py-2 rounded-xl text-sm font-semibold border transition ${
                !applyToAll ? 'bg-zinc-700 border-zinc-500 text-white' : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-500'
              }`}>
              This session
            </button>
            <button type="button" onClick={() => setApplyToAll(true)}
              className={`py-2 rounded-xl text-sm font-semibold border transition ${
                applyToAll ? 'bg-zinc-700 border-[#cee800] text-[#cee800]' : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-500'
              }`}>
              All "{booking.client || booking.player_name}"
            </button>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button type="submit" disabled={loading}
            className="w-full bg-[#cee800] text-black font-black py-3 rounded-xl hover:bg-[#d4f030] transition disabled:opacity-50">
            {loading ? 'SAVING...' : applyToAll ? 'SAVE ALL SESSIONS' : 'SAVE CHANGES'}
          </button>
        </form>
      </div>
    </div>
  )
}
