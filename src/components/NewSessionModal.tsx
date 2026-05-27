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

type Props = {
  defaultDate?: string
  defaultHour?: string
  onClose: () => void
  onCreated: () => void
}

export default function NewSessionModal({ defaultDate, defaultHour, onClose, onCreated }: Props) {
  const [coach, setCoach]           = useState(COACHES[0])
  const [type, setType]             = useState('individual')
  const [date, setDate]             = useState(defaultDate || new Date().toISOString().split('T')[0])
  const [hour, setHour]             = useState(defaultHour || '4:00 PM')
  const [playerName, setPlayerName] = useState('')
  const [notes, setNotes]           = useState('')
  const [recurring, setRecurring]   = useState(false)
  const [weeks, setWeeks]           = useState('8')
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coach, type, date, hour, playerName, notes, recurring, weeks }),
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

          {/* Coach */}
          <div>
            <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Coach</label>
            <select
              value={coach}
              onChange={e => setCoach(e.target.value)}
              className="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#cee800]"
            >
              {COACHES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>

          {/* Type */}
          <div>
            <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Session Type</label>
            <div className="mt-1 grid grid-cols-2 gap-2">
              {TYPES.map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setType(t.id)}
                  className={`px-3 py-2 rounded-xl text-sm font-semibold border transition ${
                    type === t.id
                      ? 'bg-[#cee800] text-black border-[#cee800]'
                      : 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:border-[#cee800]'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Date + Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Date</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                required
                className="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#cee800]"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Time</label>
              <select
                value={hour}
                onChange={e => setHour(e.target.value)}
                className="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#cee800]"
              >
                {HOURS.map(h => <option key={h}>{h}</option>)}
              </select>
            </div>
          </div>

          {/* Player name */}
          <div>
            <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Player Name <span className="text-zinc-600 normal-case">(optional)</span></label>
            <input
              type="text"
              value={playerName}
              onChange={e => setPlayerName(e.target.value)}
              placeholder="Leave blank for open group slot"
              className="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-[#cee800]"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Notes <span className="text-zinc-600 normal-case">(optional)</span></label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="Location, focus area, etc."
              className="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-[#cee800] resize-none"
            />
          </div>

          {/* Recurring toggle */}
          <div className="bg-zinc-800 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-sm">Recurring</p>
                <p className="text-zinc-500 text-xs">Repeat weekly</p>
              </div>
              <button
                type="button"
                onClick={() => setRecurring(r => !r)}
                className={`w-12 h-6 rounded-full transition-colors relative ${recurring ? 'bg-[#cee800]' : 'bg-zinc-600'}`}
              >
                <span className={`absolute top-1 w-4 h-4 bg-black rounded-full transition-transform ${recurring ? 'translate-x-7' : 'translate-x-1'}`} />
              </button>
            </div>
            {recurring && (
              <div className="mt-3 flex items-center gap-3">
                <label className="text-xs text-zinc-400">Repeat for</label>
                <input
                  type="number"
                  min="1"
                  max="52"
                  value={weeks}
                  onChange={e => setWeeks(e.target.value)}
                  className="w-16 bg-zinc-700 border border-zinc-600 rounded-lg px-2 py-1 text-white text-sm text-center focus:outline-none focus:border-[#cee800]"
                />
                <label className="text-xs text-zinc-400">weeks</label>
              </div>
            )}
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#cee800] text-black font-black py-3 rounded-xl hover:bg-[#d4f030] transition disabled:opacity-50"
          >
            {loading
              ? 'CREATING...'
              : recurring
                ? `CREATE ${weeks} SESSIONS`
                : 'CREATE SESSION'}
          </button>
        </form>
      </div>
    </div>
  )
}
