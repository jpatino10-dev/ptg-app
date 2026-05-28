'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

const LEVELS = ['All Levels','recreational','competitive','ecnl_mls','ga']
const LEVEL_LABELS: Record<string, string> = {
  recreational: 'Recreational',
  competitive:  'Competitive',
  ecnl_mls:     'ECNL / MLS Next',
  ga:           'GA',
}

type Player = {
  id: string
  player_name: string
  parent_name: string | null
  email: string | null
  phone: string | null
  age_group: string | null
  gender: string | null
  level: string | null
  club: string | null
  created_at: string
}

type NewPlayer = {
  player_name: string
  parent_name: string
  email: string
  phone: string
  age_group: string
  gender: string
  level: string
  club: string
  goals: string
}

const BLANK: NewPlayer = {
  player_name: '', parent_name: '', email: '', phone: '',
  age_group: '', gender: '', level: '', club: '', goals: '',
}

export default function PlayersPage() {
  const [players, setPlayers]   = useState<Player[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [levelFilter, setLevelFilter] = useState('All Levels')
  const [showAdd, setShowAdd]   = useState(false)
  const [form, setForm]         = useState<NewPlayer>(BLANK)
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')

  async function load() {
    setLoading(true)
    const res = await fetch('/api/players')
    if (res.ok) setPlayers(await res.json())
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtered = players.filter(p => {
    const matchSearch = !search ||
      p.player_name.toLowerCase().includes(search.toLowerCase()) ||
      (p.parent_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.email || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.club || '').toLowerCase().includes(search.toLowerCase())
    const matchLevel = levelFilter === 'All Levels' || p.level === levelFilter
    return matchSearch && matchLevel
  })

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setShowAdd(false)
      setForm(BLANK)
      load()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to add player')
    } finally { setSaving(false) }
  }

  function initials(name: string) {
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  }

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-6">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="text-zinc-500 hover:text-white text-sm">← Admin</Link>
            <h1 className="text-2xl font-black text-[#cee800] tracking-widest">PLAYERS</h1>
            <span className="text-zinc-500 text-sm">{players.length} total</span>
          </div>
          <button onClick={() => setShowAdd(true)}
            className="px-4 py-1.5 bg-[#cee800] text-black font-black text-sm rounded-lg hover:bg-[#d4f030] transition">
            + Add Player
          </button>
        </div>

        {/* Search + filter */}
        <div className="flex gap-3 mb-6 flex-wrap">
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, parent, email, club..."
            className="flex-1 min-w-64 bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2.5 text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-[#cee800]"
          />
          <select value={levelFilter} onChange={e => setLevelFilter(e.target.value)}
            className="bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#cee800]">
            {LEVELS.map(l => <option key={l}>{l}</option>)}
          </select>
        </div>

        {/* Player grid */}
        {loading ? (
          <div className="text-zinc-500 text-sm">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-12 text-center">
            <p className="text-zinc-400 mb-1">{search ? 'No players match your search.' : 'No players yet.'}</p>
            {!search && <p className="text-zinc-600 text-sm">Add players manually or they'll be imported from bookings.</p>}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(p => (
              <Link key={p.id} href={`/admin/players/${p.id}`}
                className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 hover:border-[#cee800] transition block">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-[#cee800] flex items-center justify-center text-black font-black text-sm shrink-0">
                    {initials(p.player_name)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-black truncate">{p.player_name}</p>
                    {p.parent_name && <p className="text-zinc-400 text-xs truncate">{p.parent_name}</p>}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {p.age_group && (
                    <span className="text-xs px-2 py-0.5 bg-zinc-800 rounded-full text-zinc-300">{p.age_group}</span>
                  )}
                  {p.level && (
                    <span className="text-xs px-2 py-0.5 bg-zinc-800 rounded-full text-zinc-300">
                      {LEVEL_LABELS[p.level] || p.level}
                    </span>
                  )}
                  {p.club && (
                    <span className="text-xs px-2 py-0.5 bg-zinc-800 rounded-full text-zinc-300 truncate max-w-32">{p.club}</span>
                  )}
                </div>
                {p.email && <p className="text-zinc-500 text-xs mt-2 truncate">{p.email}</p>}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Add player modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/80 flex items-end sm:items-center justify-center z-50 p-4" onClick={() => setShowAdd(false)}>
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-black text-[#cee800]">ADD PLAYER</h2>
              <button onClick={() => setShowAdd(false)} className="text-zinc-500 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Player Name *</label>
                  <input required value={form.player_name} onChange={e => setForm(f => ({ ...f, player_name: e.target.value }))}
                    className="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#cee800]" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Parent / Guardian</label>
                  <input value={form.parent_name} onChange={e => setForm(f => ({ ...f, parent_name: e.target.value }))}
                    className="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#cee800]" />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Email</label>
                  <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    className="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#cee800]" />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Phone</label>
                  <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    className="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#cee800]" />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Age Group</label>
                  <input placeholder="e.g. U12, U15" value={form.age_group} onChange={e => setForm(f => ({ ...f, age_group: e.target.value }))}
                    className="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#cee800]" />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Gender</label>
                  <select value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}
                    className="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#cee800]">
                    <option value="">Select</option>
                    <option>Male</option><option>Female</option><option>Other</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Level</label>
                  <select value={form.level} onChange={e => setForm(f => ({ ...f, level: e.target.value }))}
                    className="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#cee800]">
                    <option value="">Select</option>
                    <option value="recreational">Recreational</option>
                    <option value="competitive">Competitive</option>
                    <option value="ecnl_mls">ECNL / MLS Next</option>
                    <option value="ga">GA</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Club</label>
                  <input value={form.club} onChange={e => setForm(f => ({ ...f, club: e.target.value }))}
                    className="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#cee800]" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Goals</label>
                  <textarea value={form.goals} onChange={e => setForm(f => ({ ...f, goals: e.target.value }))} rows={2}
                    placeholder="What does this player want to improve?"
                    className="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-[#cee800] resize-none" />
                </div>
              </div>
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <button type="submit" disabled={saving}
                className="w-full bg-[#cee800] text-black font-black py-3 rounded-xl hover:bg-[#d4f030] transition disabled:opacity-50">
                {saving ? 'SAVING...' : 'ADD PLAYER'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
