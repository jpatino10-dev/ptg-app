'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type BookingRequest = {
  id: string; parent_name: string; parent_email: string; player_name: string
  requested_date: string; requested_time: string | null; session_type: string
  notes: string | null; status: string; admin_notes: string | null; created_at: string
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-500/20 text-yellow-400',
  approved: 'bg-[#cee800]/20 text-[#cee800]',
  declined: 'bg-red-900/30 text-red-400',
}

export default function AdminRequestsPage() {
  const [requests, setRequests] = useState<BookingRequest[]>([])
  const [loading, setLoading]   = useState(true)
  const [filter, setFilter]     = useState<'all' | 'pending' | 'approved' | 'declined'>('pending')
  const [acting, setActing]     = useState<string | null>(null)
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({})

  useEffect(() => {
    fetch('/api/booking-requests')
      .then(r => r.json())
      .then(d => { setRequests(d); setLoading(false) })
  }, [])

  async function updateStatus(id: string, status: 'approved' | 'declined') {
    setActing(id)
    const res = await fetch(`/api/booking-requests/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, admin_notes: adminNotes[id] || null }),
    })
    if (res.ok) {
      const updated = await res.json()
      setRequests(rs => rs.map(r => r.id === id ? updated : r))
    }
    setActing(null)
  }

  const filtered = requests.filter(r => filter === 'all' || r.status === filter)
  const pendingCount = requests.filter(r => r.status === 'pending').length

  function formatDate(d: string) {
    return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-6">
      <div className="max-w-4xl mx-auto">

        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="text-zinc-500 hover:text-white text-sm">← Admin</Link>
            <h1 className="text-2xl font-black text-[#cee800] tracking-widest">SESSION REQUESTS</h1>
            {pendingCount > 0 && (
              <span className="bg-yellow-500 text-black text-xs font-black px-2 py-0.5 rounded-full">
                {pendingCount} pending
              </span>
            )}
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-6">
          {(['pending', 'all', 'approved', 'declined'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-xl text-sm font-black capitalize transition ${
                filter === f ? 'bg-[#cee800] text-black' : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-white'
              }`}>
              {f} {f === 'all' ? `(${requests.length})` : `(${requests.filter(r => r.status === f).length})`}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-zinc-500 text-sm">Loading...</p>
        ) : filtered.length === 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-10 text-center">
            <p className="text-zinc-400">No {filter === 'all' ? '' : filter} requests.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(r => (
              <div key={r.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-black text-lg">{r.player_name}</p>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full capitalize ${STATUS_COLORS[r.status] || 'bg-zinc-700 text-zinc-400'}`}>
                        {r.status}
                      </span>
                    </div>
                    <p className="text-zinc-400 text-sm">{r.parent_name} · {r.parent_email}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-semibold">{formatDate(r.requested_date)}</p>
                    {r.requested_time && <p className="text-zinc-400 text-sm">{r.requested_time}</p>}
                    <p className="text-zinc-500 text-xs capitalize mt-0.5">{r.session_type}</p>
                  </div>
                </div>

                {r.notes && (
                  <div className="bg-zinc-800 rounded-xl px-3 py-2 mb-3">
                    <p className="text-zinc-400 text-sm">{r.notes}</p>
                  </div>
                )}

                {r.status === 'pending' && (
                  <div className="space-y-2">
                    <input
                      value={adminNotes[r.id] || ''}
                      onChange={e => setAdminNotes(n => ({ ...n, [r.id]: e.target.value }))}
                      placeholder="Optional note to parent (e.g. confirmed time, coach assigned)..."
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-[#cee800]"
                    />
                    <div className="flex gap-2">
                      <button onClick={() => updateStatus(r.id, 'approved')} disabled={acting === r.id}
                        className="flex-1 bg-[#cee800] text-black font-black py-2 rounded-xl text-sm hover:bg-[#d4f030] transition disabled:opacity-50">
                        {acting === r.id ? '...' : 'Approve'}
                      </button>
                      <button onClick={() => updateStatus(r.id, 'declined')} disabled={acting === r.id}
                        className="flex-1 border border-red-800 text-red-400 font-black py-2 rounded-xl text-sm hover:bg-red-900/20 transition disabled:opacity-50">
                        Decline
                      </button>
                    </div>
                  </div>
                )}

                {r.admin_notes && r.status !== 'pending' && (
                  <p className="text-zinc-500 text-sm italic mt-2">Note: {r.admin_notes}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
