'use client'

import { useState, useEffect } from 'react'

const TYPES = [
  { id: 'individual', label: 'Individual' },
  { id: 'semi',       label: 'Semi-Individual' },
  { id: 'group',      label: 'Group Training' },
  { id: 'camp',       label: 'Camp / Clinic' },
]

// Convert "4:00 PM" → "16:00" for <input type="time">
function toTimeInput(display: string): string {
  const m = display.match(/^(\d+):(\d+)\s*(AM|PM)$/i)
  if (!m) return '16:00'
  let h = parseInt(m[1])
  const min = m[2]
  const ampm = m[3].toUpperCase()
  if (ampm === 'PM' && h !== 12) h += 12
  if (ampm === 'AM' && h === 12) h = 0
  return `${String(h).padStart(2, '0')}:${min}`
}

// Convert "16:00" → "4:00 PM" for storage
function fromTimeInput(val: string): string {
  const [hStr, min] = val.split(':')
  let h = parseInt(hStr)
  const ampm = h >= 12 ? 'PM' : 'AM'
  if (h > 12) h -= 12
  if (h === 0) h = 12
  return `${h}:${min} ${ampm}`
}
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
  isAdmin?: boolean
  onClose: () => void
  onCreated: () => void
}

export default function NewSessionModal({ defaultDate, defaultHour, isAdmin = false, onClose, onCreated }: Props) {
  const [coaches, setCoaches]       = useState<string[]>([])
  const [title, setTitle]           = useState('')
  const [coach, setCoach]           = useState('')
  const [selectedCoaches, setSelectedCoaches] = useState<string[]>([])

  useEffect(() => {
    fetch('/api/coaches').then(r => r.json()).then(data => {
      if (Array.isArray(data)) {
        setCoaches(data)
        setCoach(data[0] || '')
        setSelectedCoaches(data[0] ? [data[0]] : [])
      }
    })
  }, [])
  const [type, setType]             = useState('individual')
  const [date, setDate]             = useState(defaultDate || new Date().toISOString().split('T')[0])
  const [hour, setHour]             = useState(defaultHour || '4:00 PM')
  const [duration, setDuration]     = useState(60)
  const [notes, setNotes]           = useState('')
  const [location, setLocation]     = useState('')
  const [price, setPrice]           = useState('')
  const [coachPay, setCoachPay]     = useState('')
  const [directorPay, setDirectorPay] = useState('')
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
      const coachValue = type === 'camp'
        ? selectedCoaches.join(', ')
        : coach

      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title, coach: coachValue, type, date, hour, duration,
          notes, location, recurType, occurrences: totalSessions,
          price:       price !== '' ? parseFloat(price).toFixed(2) : null,
          coach_pay:   coachPay !== '' ? parseFloat(coachPay) : null,
          director_pay: directorPay !== '' ? parseFloat(directorPay) : null,
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
            <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">
              {type === 'camp' ? 'Coaches (select all attending)' : 'Coach'}
            </label>
            {type === 'camp' ? (
              <div className="mt-1 space-y-2">
                {coaches.map(c => {
                  const checked = selectedCoaches.includes(c)
                  return (
                    <button
                      key={c} type="button"
                      onClick={() => setSelectedCoaches(prev =>
                        checked ? prev.filter(x => x !== c) : [...prev, c]
                      )}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-sm font-semibold transition ${
                        checked ? 'bg-[#cee800]/10 border-[#cee800] text-[#cee800]' : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:border-[#cee800]'
                      }`}
                    >
                      <span className={`w-4 h-4 rounded border flex items-center justify-center text-xs shrink-0 ${checked ? 'bg-[#cee800] border-[#cee800] text-black' : 'border-zinc-500'}`}>
                        {checked ? '✓' : ''}
                      </span>
                      {c}
                    </button>
                  )
                })}
                {selectedCoaches.length === 0 && (
                  <p className="text-red-400 text-xs">Select at least one coach</p>
                )}
              </div>
            ) : (
              <select value={coach} onChange={e => setCoach(e.target.value)}
                className="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#cee800]">
                {coaches.map(c => <option key={c}>{c}</option>)}
              </select>
            )}
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
              <input type="time" step="900" value={toTimeInput(hour)}
                onChange={e => e.target.value && setHour(fromTimeInput(e.target.value))}
                className="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#cee800]" />
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

          {/* Admin-only financial fields */}
          {isAdmin && (
            <>
              <div>
                <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Session Price</label>
                <div className="mt-1 relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">$</span>
                  <input type="number" min="0" step="0.01" value={price} onChange={e => setPrice(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl pl-7 pr-3 py-2.5 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-[#cee800]" />
                </div>
                <p className="text-zinc-600 text-xs mt-1">Amount collected from the client</p>
              </div>
              <div>
                <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Coach Pay</label>
                <div className="mt-1 relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">$</span>
                  <input type="number" min="0" step="0.01" value={coachPay} onChange={e => setCoachPay(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl pl-7 pr-3 py-2.5 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-[#cee800]" />
                </div>
                <p className="text-zinc-600 text-xs mt-1">Amount owed to the assigned coach</p>
              </div>
              <div>
                <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Director Override</label>
                <div className="mt-1 relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">$</span>
                  <input type="number" min="0" step="0.01" value={directorPay} onChange={e => setDirectorPay(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl pl-7 pr-3 py-2.5 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-[#cee800]" />
                </div>
                <p className="text-zinc-600 text-xs mt-1">Amount owed to the Director (Coach A)</p>
              </div>
            </>
          )}

          {/* Location */}
          <div>
            <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Location <span className="text-zinc-600 normal-case">(optional)</span></label>
            <input type="text" value={location} onChange={e => setLocation(e.target.value)}
              placeholder="e.g. PTG Training Facility, Field 3"
              className="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-[#cee800]" />
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Notes <span className="text-zinc-600 normal-case">(optional)</span></label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              placeholder="Focus area, equipment needed..."
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
