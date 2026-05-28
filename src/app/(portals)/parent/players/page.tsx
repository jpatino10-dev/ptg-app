'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'

const ProgressChart = dynamic(() => import('@/components/ProgressChart'), { ssr: false })
const MessageThread = dynamic(() => import('@/components/MessageThread'), { ssr: false })

type Player = {
  id: string; player_name: string; parent_name: string | null; email: string | null
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

type Tab = 'profile' | 'progress' | 'messages'

export default function ParentPlayersPage() {
  const [players, setPlayers]   = useState<Player[]>([])
  const [loading, setLoading]   = useState(true)
  const [selected, setSelected] = useState<Player | null>(null)
  const [tab, setTab]           = useState<Tab>('profile')
  const [progress, setProgress] = useState<ProgressEntry[]>([])
  const [progressLoading, setProgressLoading] = useState(false)

  useEffect(() => {
    fetch('/api/parent/players')
      .then(r => r.json())
      .then(d => { setPlayers(d); setLoading(false) })
  }, [])

  function selectPlayer(p: Player) {
    setSelected(p)
    setTab('profile')
    setProgressLoading(true)
    fetch(`/api/progress/${p.id}`)
      .then(r => r.json())
      .then(d => { setProgress(d); setProgressLoading(false) })
  }

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-6">
      <div className="max-w-2xl mx-auto">

        <div className="flex items-center gap-4 mb-6">
          <Link href="/parent" className="text-zinc-500 hover:text-white text-sm">← Home</Link>
          <h1 className="text-2xl font-black text-[#cee800] tracking-widest">MY PLAYERS</h1>
        </div>

        {loading ? (
          <p className="text-zinc-500 text-sm">Loading...</p>
        ) : players.length === 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-10 text-center">
            <p className="text-zinc-400 mb-1">No player profiles found.</p>
            <p className="text-zinc-600 text-sm">Your players will appear here once sessions are booked.</p>
          </div>
        ) : !selected ? (
          <div className="space-y-3">
            {players.map(p => (
              <button key={p.id} onClick={() => selectPlayer(p)}
                className="w-full text-left bg-zinc-900 border border-zinc-800 rounded-2xl p-5 hover:border-[#cee800] transition">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-[#cee800] flex items-center justify-center text-black font-black shrink-0">
                    {initials(p.player_name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-lg">{p.player_name}</p>
                    <div className="flex gap-2 flex-wrap mt-1">
                      {p.age_group && <span className="text-xs px-2 py-0.5 bg-zinc-800 rounded-full text-zinc-300">{p.age_group}</span>}
                      {p.level && <span className="text-xs px-2 py-0.5 bg-zinc-800 rounded-full text-zinc-300">{LEVEL_LABELS[p.level] || p.level}</span>}
                      {p.club && <span className="text-xs px-2 py-0.5 bg-zinc-800 rounded-full text-zinc-300">{p.club}</span>}
                    </div>
                  </div>
                  <span className="text-zinc-600 text-xl shrink-0">→</span>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
            {/* Header */}
            <div className="p-5 border-b border-zinc-800 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-[#cee800] flex items-center justify-center text-black font-black text-lg shrink-0">
                {initials(selected.player_name)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-black text-xl">{selected.player_name}</p>
                {selected.parent_name && <p className="text-zinc-400 text-sm">{selected.parent_name}</p>}
              </div>
              <button onClick={() => setSelected(null)} className="text-zinc-500 hover:text-white">✕</button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-zinc-800">
              {(['profile', 'progress', 'messages'] as Tab[]).map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className={`flex-1 py-3 text-sm font-black capitalize transition border-b-2 ${
                    tab === t ? 'border-[#cee800] text-[#cee800]' : 'border-transparent text-zinc-500 hover:text-white'
                  }`}>
                  {t}
                </button>
              ))}
            </div>

            <div className="p-5">
              {/* Profile tab */}
              {tab === 'profile' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      ['Age Group', selected.age_group],
                      ['Gender', selected.gender],
                      ['Level', selected.level ? (LEVEL_LABELS[selected.level] || selected.level) : null],
                      ['Club', selected.club],
                      ['Date of Birth', selected.dob],
                      ['Email', selected.email],
                    ].filter(([, v]) => v).map(([k, v]) => (
                      <div key={k as string}>
                        <p className="text-zinc-500 text-xs">{k}</p>
                        <p className="font-semibold text-sm">{v}</p>
                      </div>
                    ))}
                  </div>

                  {selected.goals && (
                    <div>
                      <p className="text-zinc-500 text-xs mb-1">Goals</p>
                      <p className="text-sm">{selected.goals}</p>
                    </div>
                  )}

                  {selected.coach_notes && (
                    <div className="bg-zinc-800 rounded-xl p-4">
                      <p className="text-xs text-zinc-400 font-semibold uppercase tracking-wider mb-2">Coach Notes</p>
                      <p className="text-sm text-zinc-300 whitespace-pre-wrap">{selected.coach_notes}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Progress tab */}
              {tab === 'progress' && (
                progressLoading ? (
                  <p className="text-zinc-500 text-sm text-center py-8">Loading...</p>
                ) : (
                  <ProgressChart
                    entries={progress}
                    canEdit={false}
                    playerId={selected.id}
                    onAdded={() => {}}
                  />
                )
              )}

              {/* Messages tab */}
              {tab === 'messages' && (
                <MessageThread playerId={selected.id} viewerRole="parent" />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
