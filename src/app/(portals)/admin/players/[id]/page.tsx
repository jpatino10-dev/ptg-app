'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'

const LEVEL_LABELS: Record<string, string> = {
  recreational: 'Recreational',
  competitive:  'Competitive',
  ecnl_mls:     'ECNL / MLS Next',
  ga:           'GA',
}

const SESSION_COLORS: Record<string, string> = {
  individual: '#cee800', semi: '#00e5ff', group: '#00e676', camp: '#b388ff', duo: '#ff6b35',
}

type Player = {
  id: string; player_name: string; parent_name: string | null
  email: string | null; phone: string | null; dob: string | null
  age_group: string | null; gender: string | null; level: string | null
  club: string | null; goals: string | null; coach_notes: string | null
  created_at: string
}

type Booking = {
  id: string; date: string; hour: string; coach: string; type: string
  status: string; price: string | null; duration_minutes: number | null; notes: string | null
}

export default function PlayerDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router  = useRouter()
  const [player, setPlayer]     = useState<Player | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading]   = useState(true)
  const [editing, setEditing]   = useState(false)
  const [form, setForm]         = useState<Partial<Player>>({})
  const [notes, setNotes]       = useState('')
  const [savingNotes, setSavingNotes] = useState(false)
  const [saving, setSaving]     = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function load() {
    setLoading(true)
    const res = await fetch(`/api/players/${id}`)
    if (res.ok) {
      const data = await res.json()
      setPlayer(data.player)
      setBookings(data.bookings || [])
      setForm(data.player)
      setNotes(data.player.coach_notes || '')
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await fetch(`/api/players/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setSaving(false)
    setEditing(false)
    load()
  }

  async function saveNotes() {
    setSavingNotes(true)
    await fetch(`/api/players/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ coach_notes: notes }),
    })
    setSavingNotes(false)
  }

  async function handleDelete() {
    if (!confirm(`Delete ${player?.player_name}? This cannot be undone.`)) return
    setDeleting(true)
    await fetch(`/api/players/${id}`, { method: 'DELETE' })
    router.push('/admin/players')
  }

  const totalSessions = bookings.length
  const totalSpend    = bookings.reduce((s, b) => s + parseFloat(b.price || '0'), 0)
  const lastSession   = bookings[0]

  function initials(name: string) {
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  }

  if (loading) return <div className="min-h-screen bg-black text-zinc-500 flex items-center justify-center">Loading...</div>
  if (!player) return <div className="min-h-screen bg-black text-zinc-500 flex items-center justify-center">Player not found.</div>

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-6">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex items-center gap-4">
            <Link href="/admin/players" className="text-zinc-500 hover:text-white text-sm">← Players</Link>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setEditing(!editing)}
              className={`px-4 py-1.5 text-sm font-black rounded-lg transition ${editing ? 'bg-zinc-700 text-white' : 'bg-[#cee800] text-black hover:bg-[#d4f030]'}`}>
              {editing ? 'Cancel' : 'Edit'}
            </button>
            <button onClick={handleDelete} disabled={deleting}
              className="px-4 py-1.5 text-sm font-black rounded-lg border border-red-900 text-red-400 hover:bg-red-900/20 transition">
              Delete
            </button>
          </div>
        </div>

        {/* Profile card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-4">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-[#cee800] flex items-center justify-center text-black font-black text-xl shrink-0">
              {initials(player.player_name)}
            </div>
            <div>
              <h1 className="text-2xl font-black">{player.player_name}</h1>
              {player.parent_name && <p className="text-zinc-400">Parent: {player.parent_name}</p>}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-zinc-800 rounded-xl p-3 text-center">
              <p className="text-zinc-500 text-xs">Sessions</p>
              <p className="text-2xl font-black">{totalSessions}</p>
            </div>
            <div className="bg-zinc-800 rounded-xl p-3 text-center">
              <p className="text-zinc-500 text-xs">Total Spent</p>
              <p className="text-2xl font-black">${totalSpend.toFixed(0)}</p>
            </div>
            <div className="bg-zinc-800 rounded-xl p-3 text-center">
              <p className="text-zinc-500 text-xs">Last Session</p>
              <p className="text-lg font-black">{lastSession?.date || '—'}</p>
            </div>
          </div>

          {/* Info or edit form */}
          {editing ? (
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {([
                  ['player_name', 'Player Name', 'text'],
                  ['parent_name', 'Parent / Guardian', 'text'],
                  ['email',       'Email', 'email'],
                  ['phone',       'Phone', 'text'],
                  ['dob',         'Date of Birth', 'text'],
                  ['age_group',   'Age Group', 'text'],
                  ['club',        'Club', 'text'],
                ] as [keyof Player, string, string][]).map(([key, label, type]) => (
                  <div key={key} className={key === 'player_name' || key === 'parent_name' ? 'col-span-2' : ''}>
                    <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">{label}</label>
                    <input type={type} value={(form[key] as string) || ''} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                      className="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#cee800]" />
                  </div>
                ))}
                <div>
                  <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Gender</label>
                  <select value={(form.gender as string) || ''} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}
                    className="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#cee800]">
                    <option value="">Select</option>
                    <option>Male</option><option>Female</option><option>Other</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Level</label>
                  <select value={(form.level as string) || ''} onChange={e => setForm(f => ({ ...f, level: e.target.value }))}
                    className="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#cee800]">
                    <option value="">Select</option>
                    <option value="recreational">Recreational</option>
                    <option value="competitive">Competitive</option>
                    <option value="ecnl_mls">ECNL / MLS Next</option>
                    <option value="ga">GA</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Goals</label>
                  <textarea value={(form.goals as string) || ''} onChange={e => setForm(f => ({ ...f, goals: e.target.value }))} rows={2}
                    className="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#cee800] resize-none" />
                </div>
              </div>
              <button type="submit" disabled={saving}
                className="w-full bg-[#cee800] text-black font-black py-3 rounded-xl hover:bg-[#d4f030] transition disabled:opacity-50">
                {saving ? 'SAVING...' : 'SAVE CHANGES'}
              </button>
            </form>
          ) : (
            <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
              {([
                ['Email',     player.email],
                ['Phone',     player.phone],
                ['DOB',       player.dob],
                ['Age Group', player.age_group],
                ['Gender',    player.gender],
                ['Level',     player.level ? (LEVEL_LABELS[player.level] || player.level) : null],
                ['Club',      player.club],
                ['Goals',     player.goals],
              ] as [string, string|null][]).filter(([,v]) => v).map(([k,v]) => (
                <div key={k}>
                  <p className="text-zinc-500 text-xs">{k}</p>
                  <p className="font-semibold">{v}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Coach notes */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-4">
          <h2 className="font-black text-lg mb-3">Coach Notes</h2>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={4}
            placeholder="Training notes, strengths, areas to work on, attitude, injuries..."
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-[#cee800] resize-none mb-3"
          />
          <button onClick={saveNotes} disabled={savingNotes}
            className="px-6 py-2 bg-[#cee800] text-black font-black text-sm rounded-xl hover:bg-[#d4f030] transition disabled:opacity-50">
            {savingNotes ? 'Saving...' : 'Save Notes'}
          </button>
        </div>

        {/* Booking history */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-zinc-800">
            <h2 className="font-black text-lg">Session History</h2>
          </div>
          {bookings.length === 0 ? (
            <p className="text-zinc-500 text-sm p-6">No sessions found for this player.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left px-4 py-3 text-zinc-400 font-semibold">Date</th>
                  <th className="text-left px-4 py-3 text-zinc-400 font-semibold">Time</th>
                  <th className="text-left px-4 py-3 text-zinc-400 font-semibold">Type</th>
                  <th className="text-left px-4 py-3 text-zinc-400 font-semibold">Coach</th>
                  <th className="text-left px-4 py-3 text-zinc-400 font-semibold">Status</th>
                  <th className="text-right px-4 py-3 text-zinc-400 font-semibold">Price</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map(b => (
                  <tr key={b.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                    <td className="px-4 py-3">{b.date}</td>
                    <td className="px-4 py-3 text-zinc-400">{b.hour}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full text-black"
                        style={{ backgroundColor: SESSION_COLORS[b.type] || '#666' }}>
                        {b.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-400">{b.coach}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        b.status === 'confirmed' || b.status === 'paid'
                          ? 'bg-[#cee800]/20 text-[#cee800]' : 'bg-zinc-700 text-zinc-400'
                      }`}>{b.status?.replace('_',' ')}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">{b.price ? `$${b.price}` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
