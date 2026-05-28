'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type Session = {
  id: string; date: string; hour: string; coach: string; type: string
  status: string; price: string | null; player_name: string | null
  client: string | null; notes: string | null; duration_minutes: number | null
}

const TYPE_COLORS: Record<string, string> = {
  individual: '#cee800', semi: '#00e5ff', group: '#00e676', camp: '#b388ff', duo: '#ff6b35',
}

export default function CoachSchedulePage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading]   = useState(true)
  const [tab, setTab]           = useState<'upcoming' | 'past'>('upcoming')

  useEffect(() => {
    fetch('/api/coach/sessions')
      .then(r => r.json())
      .then(d => { setSessions(d); setLoading(false) })
  }, [])

  const today    = new Date().toISOString().slice(0, 10)
  const upcoming = sessions.filter(s => s.date >= today).sort((a, b) => a.date < b.date ? -1 : 1)
  const past     = sessions.filter(s => s.date < today)
  const shown    = tab === 'upcoming' ? upcoming : past

  function formatHour(h: string) {
    const [hr, min] = h.split(':').map(Number)
    const suffix = hr >= 12 ? 'PM' : 'AM'
    const display = hr % 12 || 12
    return `${display}:${String(min || 0).padStart(2, '0')} ${suffix}`
  }

  function formatDuration(min: number | null) {
    if (!min) return null
    if (min < 60) return `${min}m`
    const h = Math.floor(min / 60), m = min % 60
    return m ? `${h}h ${m}m` : `${h}h`
  }

  // Group by date
  const grouped = shown.reduce<Record<string, Session[]>>((acc, s) => {
    acc[s.date] = acc[s.date] || []
    acc[s.date].push(s)
    return acc
  }, {})

  const dates = Object.keys(grouped).sort(tab === 'upcoming' ? undefined : (a, b) => b < a ? -1 : 1)

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-6">
      <div className="max-w-3xl mx-auto">

        <div className="flex items-center gap-4 mb-6">
          <Link href="/coach" className="text-zinc-500 hover:text-white text-sm">← Dashboard</Link>
          <h1 className="text-2xl font-black text-[#cee800] tracking-widest">MY SCHEDULE</h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {(['upcoming', 'past'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-5 py-2 rounded-xl text-sm font-black transition capitalize ${
                tab === t ? 'bg-[#cee800] text-black' : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
              }`}>
              {t} {t === 'upcoming' ? `(${upcoming.length})` : `(${past.length})`}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-zinc-500 text-sm">Loading...</p>
        ) : shown.length === 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-10 text-center">
            <p className="text-zinc-400">{tab === 'upcoming' ? 'No upcoming sessions.' : 'No past sessions.'}</p>
          </div>
        ) : (
          <div className="space-y-6">
            {dates.map(date => (
              <div key={date}>
                <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wider mb-2">
                  {new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </p>
                <div className="space-y-2">
                  {grouped[date].map(s => (
                    <div key={s.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex items-center gap-4">
                      <div className="w-1 self-stretch rounded-full shrink-0"
                        style={{ backgroundColor: TYPE_COLORS[s.type] || '#666' }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-black truncate">{s.client || s.player_name || 'Group session'}</p>
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full shrink-0 text-black"
                            style={{ backgroundColor: TYPE_COLORS[s.type] || '#666' }}>
                            {s.type}
                          </span>
                        </div>
                        <p className="text-zinc-400 text-sm">
                          {formatHour(s.hour)}
                          {s.duration_minutes ? ` · ${formatDuration(s.duration_minutes)}` : ''}
                        </p>
                        {s.notes && <p className="text-zinc-500 text-xs mt-1 truncate">{s.notes}</p>}
                      </div>
                      <div className="text-right shrink-0">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full block mb-1 ${
                          s.status === 'confirmed' || s.status === 'paid'
                            ? 'bg-[#cee800]/20 text-[#cee800]'
                            : 'bg-zinc-700 text-zinc-400'
                        }`}>{s.status?.replace('_', ' ')}</span>
                        {s.price && <p className="text-sm font-semibold">${s.price}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
