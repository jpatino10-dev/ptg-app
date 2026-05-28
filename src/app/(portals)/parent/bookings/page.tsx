'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type Booking = {
  id: string; date: string; hour: string; coach: string; type: string
  status: string; price: string | null; player_name: string | null
  client: string | null; notes: string | null; duration_minutes: number | null
}

const TYPE_COLORS: Record<string, string> = {
  individual: '#cee800', semi: '#00e5ff', group: '#00e676', camp: '#b388ff', duo: '#ff6b35',
}

export default function ParentBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading]  = useState(true)
  const [tab, setTab]          = useState<'upcoming' | 'past'>('upcoming')

  useEffect(() => {
    fetch('/api/parent/bookings')
      .then(r => r.json())
      .then(d => { setBookings(d); setLoading(false) })
  }, [])

  const today    = new Date().toISOString().slice(0, 10)
  const upcoming = bookings.filter(b => b.date >= today).sort((a, b) => a.date < b.date ? -1 : 1)
  const past     = bookings.filter(b => b.date < today)
  const shown    = tab === 'upcoming' ? upcoming : past

  function formatHour(h: string) {
    const [hr, min] = h.split(':').map(Number)
    const suffix = hr >= 12 ? 'PM' : 'AM'
    return `${hr % 12 || 12}:${String(min || 0).padStart(2, '0')} ${suffix}`
  }

  // Group by date
  const grouped = shown.reduce<Record<string, Booking[]>>((acc, b) => {
    acc[b.date] = acc[b.date] || []
    acc[b.date].push(b)
    return acc
  }, {})
  const dates = Object.keys(grouped).sort(tab === 'upcoming' ? undefined : (a, b) => b < a ? -1 : 1)

  const totalPaid = past
    .filter(b => b.status === 'confirmed' || b.status === 'paid')
    .reduce((s, b) => s + parseFloat(b.price || '0'), 0)

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-6">
      <div className="max-w-2xl mx-auto">

        <div className="flex items-center gap-4 mb-6">
          <Link href="/parent" className="text-zinc-500 hover:text-white text-sm">← Home</Link>
          <h1 className="text-2xl font-black text-[#cee800] tracking-widest">MY BOOKINGS</h1>
        </div>

        {/* Summary bar */}
        {!loading && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-center">
              <p className="text-zinc-500 text-xs">Upcoming</p>
              <p className="text-2xl font-black">{upcoming.length}</p>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-center">
              <p className="text-zinc-500 text-xs">Total Sessions</p>
              <p className="text-2xl font-black">{bookings.length}</p>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-center">
              <p className="text-zinc-500 text-xs">Total Paid</p>
              <p className="text-2xl font-black">${totalPaid.toFixed(0)}</p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {(['upcoming', 'past'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-5 py-2 rounded-xl text-sm font-black transition capitalize ${
                tab === t ? 'bg-[#cee800] text-black' : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
              }`}>
              {t} ({t === 'upcoming' ? upcoming.length : past.length})
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
                  {grouped[date].map(b => (
                    <div key={b.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-1 h-12 rounded-full shrink-0"
                            style={{ backgroundColor: TYPE_COLORS[b.type] || '#666' }} />
                          <div className="min-w-0">
                            <p className="font-black">{b.client || b.player_name || 'Session'}</p>
                            <p className="text-zinc-400 text-sm">
                              {formatHour(b.hour)} · Coach {b.coach}
                              {b.duration_minutes ? ` · ${Math.floor(b.duration_minutes / 60)}h${b.duration_minutes % 60 ? `${b.duration_minutes % 60}m` : ''}` : ''}
                            </p>
                            {b.notes && <p className="text-zinc-500 text-xs mt-1 truncate">{b.notes}</p>}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full text-black block mb-1"
                            style={{ backgroundColor: TYPE_COLORS[b.type] || '#666' }}>
                            {b.type}
                          </span>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full block mb-1 ${
                            b.status === 'confirmed' || b.status === 'paid'
                              ? 'bg-[#cee800]/20 text-[#cee800]'
                              : 'bg-zinc-700 text-zinc-400'
                          }`}>{b.status?.replace('_', ' ')}</span>
                          {b.price && <p className="text-sm font-semibold">${b.price}</p>}
                        </div>
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
