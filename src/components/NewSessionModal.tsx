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
  { label: '30 min',  value: 30  },
  { label: '1 hr',    value: 60  },
  { label: '1.5 hrs', value: 90  },
  { label: '2 hrs',   value: 120 },
  { label: '2.5 hrs', value: 150 },
  { label: '3 hrs',   value: 180 },
]

type RecurType = 'none' | 'weekly' | 'daily'

type Props = {
  defaultDate?: string
  defaultHour?: string
  onClose: () => void
  onCreated: () => void
}

export default function NewSessionModal({ defaultDate, defaultHour, onClose, onCreated }: Props) {
  const [title, setTitle]           = useState('')
  const [coach, setCoach]           = useState(COACHES[0])
  const [type, setType]             = useState('individual')
  const [date, setDate]             = useState(defaultDate || new Date().toISOString().split('T')[0])
  const [hour, setHour]             = useState(defaultHour || '4:00 PM')
  const [duration, setDuration]     = useState(60)
  const [notes, setNotes]           = useState('')
  const [recurType, setRecurType]   = useState<RecurType>('none')
  const [occurrences, setOccurrences] = useState('8')
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')

  const totalSessions = recurType !== 'none' ? parseInt(occurrences) || 1 : 1
  const recurLabel = recurType === 'daily' ? 'consecutive days' : 'weeks'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title, coach, type, date, hour, duration,
          notes, recurType, occurrences: totalSessions,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create session')
      onCreated()
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-end sm:items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-black text-[#cee800]">NEW SESSION</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Title */}
          <div>
            <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Session Title</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Summer Camp Day 1, Speed Training..."
              required
              className="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-[#cee800]"
            />
          </div>

          {/* Coach */}
          <div>
            <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Coach</label>
            <select value={coach} onChange={e => setCoach(e.target.value)}
              className="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#cee800]">
              {COACHES.map(c => <option key={c}>{c}</option>)}
            </select>
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

          {/* Notes */}
          <div>
            <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Notes <span className="text-zinc-600 normal-case">(optional)</span></label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              placeholder="Location, focus area, equipment needed..."
              className="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-[#cee800] resize-none" />
          </div>

          {/* Recurrence */}
          <div className="bg-zinc-800 rounded-xl p-4 space-y-3">
            <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Repeat</label>
            <div className="grid grid-cols-3 gap-2">
              {([
                { id: 'none',   label: 'One-time' },
                { id: 'weekly', label: 'Weekly'   },
                { id: 'daily',  label: 'Daily'    },
              ] as { id: RecurType; label: string }[]).map(r => (
                <button key={r.id} type="button" onClick={() => setRecurType(r.id)}
                  className={`px-2 py-2 rounded-xl text-sm font-semibold border transition ${
                    recurType === r.id ? 'bg-[#cee800] text-black border-[#cee800]' : 'bg-zinc-700 text-zinc-300 border-zinc-600 hover:border-[#cee800]'
                  }`}>
                  {r.label}
                </button>
              ))}
            </div>
            {recurType !== 'none' && (
              <div className="flex items-center gap-3 pt-1">
                <label className="text-xs text-zinc-400">Repeat for</label>
                <input type="number" min="2" max={recurType === 'daily' ? '30' : '52'}
                  value={occurrences} onChange={e => setOccurrences(e.target.value)}
                  className="w-16 bg-zinc-700 border border-zinc-600 rounded-lg px-2 py-1 text-white text-sm text-center focus:outline-none focus:border-[#cee800]" />
                <label className="text-xs text-zinc-400">{recurLabel}</label>
              </div>
            )}
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button type="submit" disabled={loading}
            className="w-full bg-[#cee800] text-black font-black py-3 rounded-xl hover:bg-[#d4f030] transition disabled:opacity-50">
            {loading ? 'CREATING...' : recurType !== 'none' ? `CREATE ${totalSessions} SESSIONS` : 'CREATE SESSION'}
          </button>
        </form>
      </div>
    </div>
  )
}
