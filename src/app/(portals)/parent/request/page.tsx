'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

type Player = { id: string; player_name: string }
type Request = { id: string; player_name: string; requested_date: string; session_type: string; status: string; admin_notes: string | null; created_at: string }

const SESSION_TYPES = ['individual', 'semi', 'group', 'duo', 'camp']

export default function RequestSessionPage() {
  const router = useRouter()
  const [players, setPlayers]   = useState<Player[]>([])
  const [requests, setRequests] = useState<Request[]>([])
  const [form, setForm] = useState({
    player_name: '', player_id: '', requested_date: '', requested_time: '', session_type: 'individual', notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    fetch('/api/parent/players').then(r => r.json()).then(d => {
      setPlayers(d)
      if (d.length > 0) setForm(f => ({ ...f, player_name: d[0].player_name, player_id: d[0].id }))
    })
    fetch('/api/booking-requests').then(r => r.json()).then(setRequests)
  }, [])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    const res = await fetch('/api/booking-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      const data = await res.json()
      setRequests(r => [data, ...r])
      setSuccess(true)
      setForm(f => ({ ...f, requested_date: '', requested_time: '', notes: '' }))
    } else {
      const d = await res.json()
      setError(d.error || 'Something went wrong')
    }
    setSaving(false)
  }

  const statusColor: Record<string, string> = {
    pending: 'bg-yellow-500/20 text-yellow-400',
    approved: 'bg-[#cee800]/20 text-[#cee800]',
    declined: 'bg-red-900/30 text-red-400',
  }

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-6">
      <div className="max-w-lg mx-auto">

        <div className="flex items-center gap-4 mb-6">
          <Link href="/parent" className="text-zinc-500 hover:text-white text-sm">← Home</Link>
          <h1 className="text-2xl font-black text-[#cee800] tracking-widest">REQUEST SESSION</h1>
        </div>

        {/* Request form */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-6">
          {success && (
            <div className="bg-[#cee800]/10 border border-[#cee800]/30 rounded-xl p-3 mb-4 text-[#cee800] text-sm font-semibold">
              Request sent! We'll confirm your session shortly.
            </div>
          )}

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Player</label>
              {players.length > 0 ? (
                <select value={form.player_id}
                  onChange={e => {
                    const p = players.find(p => p.id === e.target.value)
                    setForm(f => ({ ...f, player_id: e.target.value, player_name: p?.player_name || '' }))
                  }}
                  className="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#cee800]">
                  {players.map(p => <option key={p.id} value={p.id}>{p.player_name}</option>)}
                </select>
              ) : (
                <input value={form.player_name} onChange={e => setForm(f => ({ ...f, player_name: e.target.value }))}
                  required placeholder="Player name"
                  className="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#cee800]" />
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Preferred Date</label>
                <input type="date" required value={form.requested_date}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={e => setForm(f => ({ ...f, requested_date: e.target.value }))}
                  className="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#cee800]" />
              </div>
              <div>
                <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Preferred Time</label>
                <input type="time" value={form.requested_time}
                  onChange={e => setForm(f => ({ ...f, requested_time: e.target.value }))}
                  className="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#cee800]" />
              </div>
            </div>

            <div>
              <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Session Type</label>
              <div className="grid grid-cols-3 gap-2 mt-1">
                {SESSION_TYPES.map(t => (
                  <button key={t} type="button" onClick={() => setForm(f => ({ ...f, session_type: t }))}
                    className={`py-2 rounded-xl text-sm font-black capitalize transition ${
                      form.session_type === t ? 'bg-[#cee800] text-black' : 'bg-zinc-800 text-zinc-400 hover:text-white'
                    }`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Notes (optional)</label>
              <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3}
                placeholder="Specific goals, coach preference, availability notes..."
                className="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-[#cee800] resize-none" />
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <button type="submit" disabled={saving}
              className="w-full bg-[#cee800] text-black font-black py-3 rounded-xl hover:bg-[#d4f030] transition disabled:opacity-50">
              {saving ? 'SENDING...' : 'SEND REQUEST'}
            </button>
          </form>
        </div>

        {/* Past requests */}
        {requests.length > 0 && (
          <div>
            <h2 className="font-black mb-3 text-zinc-300">My Requests</h2>
            <div className="space-y-2">
              {requests.map(r => (
                <div key={r.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{r.player_name} · <span className="capitalize">{r.session_type}</span></p>
                      <p className="text-zinc-400 text-sm">{r.requested_date}</p>
                      {r.admin_notes && <p className="text-zinc-500 text-xs mt-1 italic">{r.admin_notes}</p>}
                    </div>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 capitalize ${statusColor[r.status] || 'bg-zinc-700 text-zinc-400'}`}>
                      {r.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
