'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'

const ProgressChart = dynamic(() => import('@/components/ProgressChart'), { ssr: false })
const MessageThread = dynamic(() => import('@/components/MessageThread'), { ssr: false })

type PlayerDetail = {
  id: string | null; player_name: string; parent_name: string | null; email: string | null
  phone: string | null; dob: string | null; age_group: string | null; gender: string | null
  level: string | null; club: string | null; goals: string | null; coach_notes: string | null
}

type ProgressEntry = {
  id: string; date: string; notes: string | null
  first_touch: number | null; shooting: number | null; positioning: number | null
  fitness: number | null; mentality: number | null; dribbling: number | null
}

const LEVEL_LABELS: Record<string, string> = {
  recreational: 'Recreational', competitive: 'Competitive', ecnl_mls: 'ECNL / MLS Next', ga: 'GA',
}

function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
}

type Tab = 'info' | 'progress' | 'messages'

export default function CoachPlayersPage() {
  const [players, setPlayers]           = useState<PlayerDetail[]>([])
  const [loading, setLoading]           = useState(true)
  const [search, setSearch]             = useState('')
  const [selected, setSelected]         = useState<PlayerDetail | null>(null)
  const [notes, setNotes]               = useState('')
  const [savingNotes, setSavingNotes]   = useState(false)
  const [savedMsg, setSavedMsg]         = useState(false)
  const [tab, setTab]                   = useState<Tab>('info')
  const [progress, setProgress]         = useState<ProgressEntry[]>([])
  const [progressLoading, setProgressLoading] = useState(false)

  useEffect(() => {
    fetch('/api/coach/players')
      .then(r => r.json())
      .then(d => { setPlayers(d); setLoading(false) })
  }, [])

  function selectPlayer(p: PlayerDetail) {
    setSelected(p)
    setNotes(p.coach_notes || '')
    setSavedMsg(false)
    setTab('info')
    if (p.id) {
      setProgressLoading(true)
      fetch(`/api/progress/${p.id}`)
        .then(r => r.json())
        .then(d => { setProgress(d); setProgressLoading(false) })
    }
  }

  async function saveNotes() {
    if (!selected?.id) return
    setSavingNotes(true)
    await fetch('/api/coach/players', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ player_id: selected.id, coach_notes: notes }),
    })
    setSavingNotes(false)
    setSavedMsg(true)
    setPlayers(ps => ps.map(p => p.id === selected.id ? { ...p, coach_notes: notes } : p))
    setTimeout(() => setSavedMsg(false), 2000)
  }

  const filtered = players.filter(p =>
    !search || p.player_name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-6">
      <div className="max-w-5xl mx-auto">

        <div className="flex items-center gap-4 mb-6">
          <Link href="/coach" className="text-zinc-500 hover:text-white text-sm">← Dashboard</Link>
          <h1 className="text-2xl font-black text-[#cee800] tracking-widest">MY PLAYERS</h1>
          <span className="text-zinc-500 text-sm">{players.length} total</span>
        </div>

        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search players..."
          className="w-full mb-6 bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2.5 text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-[#cee800]"
        />

        <div className="flex flex-col md:flex-row gap-4">
          {/* Player list */}
          <div className="flex-1 min-w-0 space-y-2">
            {loading ? (
              <p className="text-zinc-500 text-sm">Loading...</p>
            ) : filtered.length === 0 ? (
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center">
                <p className="text-zinc-400">{search ? 'No players match.' : 'No players yet.'}</p>
              </div>
            ) : (
              filtered.map(p => (
                <button key={p.player_name} onClick={() => selectPlayer(p)}
                  className={`w-full text-left bg-zinc-900 border rounded-2xl p-4 hover:border-[#cee800] transition ${
                    selected?.player_name === p.player_name ? 'border-[#cee800]' : 'border-zinc-800'
                  }`}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#cee800] flex items-center justify-center text-black font-black text-sm shrink-0">
                      {initials(p.player_name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black truncate">{p.player_name}</p>
                      <div className="flex gap-2 mt-0.5">
                        {p.age_group && <span className="text-zinc-400 text-xs">{p.age_group}</span>}
                        {p.level && <span className="text-zinc-400 text-xs">{LEVEL_LABELS[p.level] || p.level}</span>}
                        {p.club && <span className="text-zinc-400 text-xs truncate">{p.club}</span>}
                      </div>
                    </div>
                    {p.coach_notes && <span className="text-[#cee800] text-xs shrink-0">Notes ✓</span>}
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Detail panel */}
          {selected && (
            <div className="w-full md:w-96 shrink-0">
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 sticky top-6">
                {/* Player header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-[#cee800] flex items-center justify-center text-black font-black text-lg shrink-0">
                    {initials(selected.player_name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-lg leading-tight truncate">{selected.player_name}</p>
                    {selected.parent_name && <p className="text-zinc-400 text-sm">{selected.parent_name}</p>}
                  </div>
                  <button onClick={() => setSelected(null)} className="text-zinc-500 hover:text-white text-lg">✕</button>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 mb-4 bg-zinc-800 p-1 rounded-xl">
                  {(['info', 'progress', 'messages'] as Tab[]).map(t => (
                    <button key={t} onClick={() => setTab(t)}
                      className={`flex-1 py-1.5 text-xs font-black rounded-lg transition capitalize ${
                        tab === t ? 'bg-[#cee800] text-black' : 'text-zinc-400 hover:text-white'
                      }`}>
                      {t}
                    </button>
                  ))}
                </div>

                {/* Info tab */}
                {tab === 'info' && (
                  <div className="space-y-3">
                    {[
                      ['Age Group', selected.age_group],
                      ['Gender', selected.gender],
                      ['Level', selected.level ? (LEVEL_LABELS[selected.level] || selected.level) : null],
                      ['Club', selected.club],
                      ['Goals', selected.goals],
                    ].filter(([, v]) => v).map(([k, v]) => (
                      <div key={k as string}>
                        <p className="text-zinc-500 text-xs">{k}</p>
                        <p className="text-sm font-semibold">{v}</p>
                      </div>
                    ))}

                    {selected.id ? (
                      <div className="pt-2">
                        <p className="text-xs text-zinc-400 font-semibold uppercase tracking-wider mb-2">Coach Notes</p>
                        <textarea
                          value={notes} onChange={e => setNotes(e.target.value)} rows={4}
                          placeholder="Training notes, strengths, areas to improve..."
                          className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-[#cee800] resize-none mb-2"
                        />
                        <button onClick={saveNotes} disabled={savingNotes}
                          className="w-full bg-[#cee800] text-black font-black py-2 rounded-xl text-sm hover:bg-[#d4f030] transition disabled:opacity-50">
                          {savingNotes ? 'Saving...' : savedMsg ? 'Saved!' : 'Save Notes'}
                        </button>
                      </div>
                    ) : (
                      <p className="text-zinc-500 text-xs italic">Not in player database — notes unavailable.</p>
                    )}
                  </div>
                )}

                {/* Progress tab */}
                {tab === 'progress' && (
                  selected.id ? (
                    progressLoading ? (
                      <p className="text-zinc-500 text-sm text-center py-8">Loading...</p>
                    ) : (
                      <ProgressChart
                        entries={progress}
                        canEdit={true}
                        playerId={selected.id}
                        onAdded={entry => setProgress(p => [...p, entry])}
                      />
                    )
                  ) : (
                    <p className="text-zinc-500 text-sm text-center py-8">Player must be in database to track progress.</p>
                  )
                )}

                {/* Messages tab */}
                {tab === 'messages' && (
                  selected.id ? (
                    <MessageThread playerId={selected.id} viewerRole="coach" />
                  ) : (
                    <p className="text-zinc-500 text-sm text-center py-8">Player must be in database to message.</p>
                  )
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
