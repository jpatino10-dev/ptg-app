'use client'

import dynamic from 'next/dynamic'
import { useState } from 'react'

const RadarChart    = dynamic(() => import('recharts').then(m => m.RadarChart), { ssr: false })
const Radar         = dynamic(() => import('recharts').then(m => m.Radar), { ssr: false })
const PolarGrid     = dynamic(() => import('recharts').then(m => m.PolarGrid), { ssr: false })
const PolarAngleAxis = dynamic(() => import('recharts').then(m => m.PolarAngleAxis), { ssr: false })
const ResponsiveContainer = dynamic(() => import('recharts').then(m => m.ResponsiveContainer), { ssr: false })

export const SKILLS = ['first_touch', 'shooting', 'positioning', 'fitness', 'mentality', 'dribbling'] as const
export type Skill = typeof SKILLS[number]

export const SKILL_LABELS: Record<Skill, string> = {
  first_touch: 'First Touch', shooting: 'Shooting', positioning: 'Positioning',
  fitness: 'Fitness', mentality: 'Mentality', dribbling: 'Dribbling',
}

type ProgressEntry = {
  id: string; date: string; notes: string | null
} & Record<Skill, number | null>

export default function ProgressChart({
  entries,
  canEdit,
  playerId,
  onAdded,
}: {
  entries: ProgressEntry[]
  canEdit: boolean
  playerId: string
  onAdded: (entry: ProgressEntry) => void
}) {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm]  = useState<Record<Skill, number> & { date: string; notes: string }>({
    date: new Date().toISOString().slice(0, 10),
    first_touch: 5, shooting: 5, positioning: 5, fitness: 5, mentality: 5, dribbling: 5,
    notes: '',
  })
  const [saving, setSaving] = useState(false)

  const latest = entries[entries.length - 1]
  const radarData = SKILLS.map(s => ({
    skill: SKILL_LABELS[s],
    value: latest ? (latest[s] ?? 0) : 0,
    fullMark: 10,
  }))

  async function saveProgress(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const res = await fetch(`/api/progress/${playerId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      const data = await res.json()
      onAdded(data)
      setShowForm(false)
    }
    setSaving(false)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">
          Progress {latest ? `· Last updated ${latest.date}` : '· No data yet'}
        </p>
        {canEdit && (
          <button onClick={() => setShowForm(!showForm)}
            className="text-xs text-[#cee800] hover:underline font-semibold">
            {showForm ? 'Cancel' : '+ Add Check-in'}
          </button>
        )}
      </div>

      {/* Radar chart */}
      {latest ? (
        <div className="h-48 mb-3">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData}>
              <PolarGrid stroke="#3f3f46" />
              <PolarAngleAxis dataKey="skill" tick={{ fill: '#a1a1aa', fontSize: 10 }} />
              <Radar dataKey="value" stroke="#cee800" fill="#cee800" fillOpacity={0.25} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-32 flex items-center justify-center text-zinc-600 text-sm mb-3">
          No progress data yet.
        </div>
      )}

      {/* Skill bars (latest snapshot) */}
      {latest && (
        <div className="space-y-2 mb-3">
          {SKILLS.map(s => (
            <div key={s} className="flex items-center gap-2">
              <span className="text-zinc-400 text-xs w-24 shrink-0">{SKILL_LABELS[s]}</span>
              <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all"
                  style={{ width: `${((latest[s] ?? 0) / 10) * 100}%`, backgroundColor: '#cee800' }} />
              </div>
              <span className="text-xs font-black w-4 text-right">{latest[s] ?? '—'}</span>
            </div>
          ))}
        </div>
      )}

      {/* History (compact) */}
      {entries.length > 1 && (
        <div className="border-t border-zinc-800 pt-3">
          <p className="text-xs text-zinc-500 mb-2">History</p>
          <div className="space-y-1">
            {[...entries].reverse().slice(0, 5).map(e => (
              <div key={e.id} className="flex items-center gap-2 text-xs">
                <span className="text-zinc-500 w-20 shrink-0">{e.date}</span>
                <div className="flex gap-1 flex-1">
                  {SKILLS.map(s => (
                    <span key={s} className="text-zinc-300 font-semibold"
                      title={SKILL_LABELS[s]}>
                      {e[s] ?? '—'}
                    </span>
                  ))}
                </div>
                {e.notes && <span className="text-zinc-600 truncate max-w-24">{e.notes}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add check-in form */}
      {showForm && (
        <form onSubmit={saveProgress} className="border-t border-zinc-800 pt-4 mt-3 space-y-3">
          <div>
            <label className="text-xs text-zinc-400 font-semibold">Date</label>
            <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
              className="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-[#cee800]" />
          </div>
          <div className="space-y-2">
            {SKILLS.map(s => (
              <div key={s} className="flex items-center gap-3">
                <span className="text-xs text-zinc-400 w-24 shrink-0">{SKILL_LABELS[s]}</span>
                <input type="range" min={1} max={10} value={form[s]}
                  onChange={e => setForm(f => ({ ...f, [s]: Number(e.target.value) }))}
                  className="flex-1 accent-[#cee800]" />
                <span className="text-sm font-black w-4 text-right text-[#cee800]">{form[s]}</span>
              </div>
            ))}
          </div>
          <div>
            <label className="text-xs text-zinc-400 font-semibold">Notes (optional)</label>
            <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Overall session notes..."
              className="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-[#cee800]" />
          </div>
          <button type="submit" disabled={saving}
            className="w-full bg-[#cee800] text-black font-black py-2 rounded-xl text-sm hover:bg-[#d4f030] transition disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Check-in'}
          </button>
        </form>
      )}
    </div>
  )
}
