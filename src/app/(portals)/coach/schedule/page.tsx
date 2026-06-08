'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'

const SessionReportModal    = dynamic(() => import('@/components/SessionReportModal'),    { ssr: false })
const CoachNewSessionModal  = dynamic(() => import('@/components/CoachNewSessionModal'),  { ssr: false })

type Session = {
  id: string; date: string; hour: string; coach: string; type: string
  status: string; price: string | null; player_name: string | null
  client: string | null; notes: string | null; duration_minutes: number | null
}

const TYPE_COLORS: Record<string, string> = {
  individual: '#cee800', semi: '#00e5ff', group: '#00e676', camp: '#b388ff', duo: '#ff6b35',
}

const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

function fmtHour(h: string) {
  if (/AM|PM/i.test(h)) return h
  const [hr, min] = h.split(':').map(Number)
  return `${hr % 12 || 12}:${String(min || 0).padStart(2, '0')} ${hr >= 12 ? 'PM' : 'AM'}`
}

function fmt(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function formatDuration(min: number | null) {
  if (!min) return null
  const h = Math.floor(min / 60), m = min % 60
  return m ? `${h}h ${m}m` : `${h}h`
}

// ── Week Calendar ────────────────────────────────────────────
function WeekView({ anchor, sessions, onSelect }: { anchor: Date; sessions: Session[]; onSelect: (s: Session) => void }) {
  const sunday = new Date(anchor)
  sunday.setDate(anchor.getDate() - anchor.getDay())
  sunday.setHours(0,0,0,0)
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sunday); d.setDate(sunday.getDate() + i); return d
  })
  const todayStr = fmt(new Date())

  return (
    <div className="overflow-x-auto">
      <div className="grid grid-cols-7 gap-1 min-w-[560px]">
        {days.map(day => {
          const dateStr = fmt(day)
          const daySessions = sessions.filter(s => s.date === dateStr).sort((a,b) => a.hour.localeCompare(b.hour))
          const isToday = dateStr === todayStr
          return (
            <div key={dateStr} className="min-h-32">
              <div className={`text-center py-2 text-xs font-bold rounded-lg mb-1 ${isToday ? 'bg-[#cee800] text-black' : 'text-zinc-400'}`}>
                <div>{DAYS_SHORT[day.getDay()]}</div>
                <div className="text-base font-black">{day.getDate()}</div>
              </div>
              <div className="space-y-1">
                {daySessions.map(s => (
                  <button key={s.id} onClick={() => onSelect(s)}
                    className="w-full text-left rounded-lg px-2 py-1.5 text-xs font-semibold text-black leading-tight hover:opacity-80 transition"
                    style={{ backgroundColor: TYPE_COLORS[s.type] || '#666' }}>
                    <div className="truncate">{s.client || s.player_name || 'Session'}</div>
                    <div className="opacity-70">{fmtHour(s.hour)}</div>
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Month Calendar ───────────────────────────────────────────
function MonthView({ anchor, sessions, onSelect }: { anchor: Date; sessions: Session[]; onSelect: (s: Session) => void }) {
  const firstDay = new Date(anchor.getFullYear(), anchor.getMonth(), 1)
  const lastDay  = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0)
  const todayStr = fmt(new Date())

  // Pad start
  const startPad = firstDay.getDay()
  const cells: (Date | null)[] = Array(startPad).fill(null)
  for (let d = 1; d <= lastDay.getDate(); d++) {
    cells.push(new Date(anchor.getFullYear(), anchor.getMonth(), d))
  }
  while (cells.length % 7 !== 0) cells.push(null)

  return (
    <div>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {DAYS_SHORT.map(d => (
          <div key={d} className="text-center text-xs font-bold text-zinc-500 py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (!day) return <div key={i} className="min-h-16 rounded-lg" />
          const dateStr = fmt(day)
          const daySessions = sessions.filter(s => s.date === dateStr).sort((a,b) => a.hour.localeCompare(b.hour))
          const isToday = dateStr === todayStr
          return (
            <div key={dateStr} className={`min-h-16 rounded-lg p-1 ${isToday ? 'bg-zinc-800 ring-1 ring-[#cee800]' : 'bg-zinc-900'}`}>
              <p className={`text-xs font-bold mb-1 ${isToday ? 'text-[#cee800]' : 'text-zinc-500'}`}>{day.getDate()}</p>
              <div className="space-y-0.5">
                {daySessions.slice(0, 3).map(s => (
                  <button key={s.id} onClick={() => onSelect(s)}
                    className="w-full text-left rounded px-1 py-0.5 text-[10px] font-bold text-black leading-tight hover:opacity-80 truncate block"
                    style={{ backgroundColor: TYPE_COLORS[s.type] || '#666' }}>
                    {s.client || s.player_name || 'Session'}
                  </button>
                ))}
                {daySessions.length > 3 && (
                  <p className="text-[10px] text-zinc-500 pl-1">+{daySessions.length - 3} more</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Session Detail Sheet ─────────────────────────────────────
function SessionDetail({ session, onClose, onMarkComplete, marking }: {
  session: Session; onClose: () => void
  onMarkComplete: () => void; marking: boolean
}) {
  const today = new Date().toISOString().slice(0, 10)
  const isPast = session.date < today
  return (
    <div className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-bold px-2 py-1 rounded-full text-black"
            style={{ backgroundColor: TYPE_COLORS[session.type] || '#666' }}>{session.type}</span>
          <button onClick={onClose} className="text-zinc-500 hover:text-white">✕</button>
        </div>
        <h3 className="font-black text-lg mb-1">{session.client || session.player_name || 'Group Session'}</h3>
        <p className="text-zinc-400 text-sm mb-4">
          {new Date(session.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          {' · '}{fmtHour(session.hour)}
          {session.duration_minutes ? ` · ${formatDuration(session.duration_minutes)}` : ''}
        </p>
        {session.notes && <p className="text-zinc-500 text-sm mb-4 italic">{session.notes}</p>}
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold px-2 py-1 rounded-full ${
            session.status === 'completed' ? 'bg-[#00e676]/20 text-[#00e676]' :
            session.status === 'confirmed' || session.status === 'paid' ? 'bg-[#cee800]/20 text-[#cee800]' :
            'bg-zinc-700 text-zinc-400'
          }`}>{session.status?.replace('_',' ')}</span>
          {isPast && session.status !== 'completed' && (
            <button onClick={onMarkComplete} disabled={marking}
              className="text-xs font-bold px-3 py-1 rounded-full border border-[#00e676]/40 text-[#00e676] hover:bg-[#00e676]/10 transition disabled:opacity-40 ml-auto">
              {marking ? '...' : 'Mark Complete'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────
export default function CoachSchedulePage() {
  const [sessions, setSessions]   = useState<Session[]>([])
  const [loading, setLoading]     = useState(true)
  const [view, setView]           = useState<'list' | 'week' | 'month'>('week')
  const [listTab, setListTab]     = useState<'upcoming' | 'past'>('upcoming')
  const [anchor, setAnchor]       = useState(new Date())
  const [selected, setSelected]     = useState<Session | null>(null)
  const [showNewSession, setShowNewSession] = useState(false)
  const [reportSession, setReportSession]   = useState<Session | null>(null)
  const [reportsExist, setReportsExist]   = useState<Set<string>>(new Set())
  const [marking, setMarking]     = useState(false)

  useEffect(() => {
    fetch('/api/coach/sessions').then(r => r.json()).then(d => { setSessions(d); setLoading(false) })
  }, [])

  async function markComplete(id: string) {
    setMarking(true)
    await fetch(`/api/coach/sessions/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'completed' }),
    })
    setSessions(prev => prev.map(s => s.id === id ? { ...s, status: 'completed' } : s))
    setSelected(prev => prev?.id === id ? { ...prev, status: 'completed' } : prev)
    setMarking(false)
  }

  function navigate(dir: 1 | -1) {
    setAnchor(d => {
      const n = new Date(d)
      if (view === 'week')  n.setDate(n.getDate() + dir * 7)
      if (view === 'month') n.setMonth(n.getMonth() + dir)
      return n
    })
  }

  const today    = new Date().toISOString().slice(0, 10)
  const upcoming = sessions.filter(s => s.date >= today).sort((a, b) => a.date < b.date ? -1 : 1)
  const past     = sessions.filter(s => s.date < today)
  const shown    = listTab === 'upcoming' ? upcoming : past
  const grouped  = shown.reduce<Record<string, Session[]>>((acc, s) => {
    acc[s.date] = acc[s.date] || []; acc[s.date].push(s); return acc
  }, {})
  const dates = Object.keys(grouped).sort(listTab === 'upcoming' ? undefined : (a, b) => b < a ? -1 : 1)

  const headerLabel = view === 'week'
    ? (() => {
        const sun = new Date(anchor); sun.setDate(anchor.getDate() - anchor.getDay())
        const sat = new Date(sun); sat.setDate(sun.getDate() + 6)
        return `${MONTHS[sun.getMonth()]} ${sun.getDate()} – ${sat.getDate()}, ${sat.getFullYear()}`
      })()
    : `${MONTHS[anchor.getMonth()]} ${anchor.getFullYear()}`

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-6">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-4 mb-6 flex-wrap">
          <Link href="/coach" className="text-zinc-500 hover:text-white text-sm">← Dashboard</Link>
          <h1 className="text-2xl font-black text-[#cee800] tracking-widest">MY SCHEDULE</h1>

          <button onClick={() => setShowNewSession(true)}
            className="ml-auto px-4 py-1.5 bg-[#cee800] text-black font-black text-sm rounded-lg hover:bg-[#d4f030] transition">
            + New Session
          </button>

          {/* View tabs */}
          <div className="flex bg-zinc-900 border border-zinc-800 rounded-lg p-0.5">
            {(['week', 'month', 'list'] as const).map(v => (
              <button key={v} onClick={() => setView(v)}
                className={`px-3 py-1 rounded-md text-sm font-semibold capitalize transition ${view === v ? 'bg-[#cee800] text-black' : 'text-zinc-400 hover:text-white'}`}>
                {v}
              </button>
            ))}
          </div>
        </div>

        {/* Calendar nav */}
        {view !== 'list' && (
          <div className="flex items-center justify-between mb-4">
            <span className="font-semibold text-sm">{headerLabel}</span>
            <div className="flex gap-2">
              <button onClick={() => navigate(-1)} className="px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg hover:border-[#cee800] text-sm transition">←</button>
              <button onClick={() => setAnchor(new Date())} className="px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg hover:border-[#cee800] text-sm transition">Today</button>
              <button onClick={() => navigate(1)}  className="px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg hover:border-[#cee800] text-sm transition">→</button>
            </div>
          </div>
        )}

        {loading ? <p className="text-zinc-500 text-sm">Loading...</p> : (
          <>
            {view === 'week'  && <WeekView  anchor={anchor} sessions={sessions} onSelect={setSelected} />}
            {view === 'month' && <MonthView anchor={anchor} sessions={sessions} onSelect={setSelected} />}

            {view === 'list' && (
              <>
                <div className="flex gap-2 mb-6">
                  {(['upcoming', 'past'] as const).map(t => (
                    <button key={t} onClick={() => setListTab(t)}
                      className={`px-5 py-2 rounded-xl text-sm font-black transition capitalize ${listTab === t ? 'bg-[#cee800] text-black' : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'}`}>
                      {t} ({t === 'upcoming' ? upcoming.length : past.length})
                    </button>
                  ))}
                </div>
                {shown.length === 0 ? (
                  <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-10 text-center">
                    <p className="text-zinc-400">{listTab === 'upcoming' ? 'No upcoming sessions.' : 'No past sessions.'}</p>
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
                            <div key={s.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
                              <div className="flex items-center gap-4">
                                <div className="w-1 self-stretch rounded-full shrink-0" style={{ backgroundColor: TYPE_COLORS[s.type] || '#666' }} />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <p className="font-black truncate">{s.client || s.player_name || 'Group session'}</p>
                                    <span className="text-xs font-bold px-2 py-0.5 rounded-full shrink-0 text-black" style={{ backgroundColor: TYPE_COLORS[s.type] || '#666' }}>{s.type}</span>
                                  </div>
                                  <p className="text-zinc-400 text-sm">{fmtHour(s.hour)}{s.duration_minutes ? ` · ${formatDuration(s.duration_minutes)}` : ''}</p>
                                  {s.notes && <p className="text-zinc-500 text-xs mt-1 truncate">{s.notes}</p>}
                                </div>
                                <div className="flex flex-col items-end gap-1.5 shrink-0">
                                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${s.status === 'completed' ? 'bg-[#00e676]/20 text-[#00e676]' : s.status === 'confirmed' || s.status === 'paid' ? 'bg-[#cee800]/20 text-[#cee800]' : 'bg-zinc-700 text-zinc-400'}`}>
                                    {s.status?.replace('_', ' ')}
                                  </span>
                                  {listTab === 'past' && s.status !== 'completed' && (
                                    <button onClick={async () => {
                                      await fetch(`/api/coach/sessions/${s.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'completed' }) })
                                      setSessions(prev => prev.map(x => x.id === s.id ? { ...x, status: 'completed' } : x))
                                    }} className="text-xs font-bold px-3 py-1 rounded-full border border-[#00e676]/40 text-[#00e676] hover:bg-[#00e676]/10 transition">
                                      Mark Complete
                                    </button>
                                  )}
                                  <button onClick={() => setReportSession(s)}
                                    className={`text-xs font-bold px-3 py-1 rounded-full transition ${reportsExist.has(s.id) ? 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600' : 'border border-[#cee800]/40 text-[#cee800] hover:bg-[#cee800]/10'}`}>
                                    {reportsExist.has(s.id) ? 'Edit Report' : '+ Report'}
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Legend */}
            {view !== 'list' && (
              <div className="flex gap-4 mt-4 flex-wrap">
                {Object.entries(TYPE_COLORS).map(([type, color]) => (
                  <div key={type} className="flex items-center gap-1.5 text-xs text-zinc-400">
                    <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: color }} />
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Session detail popup */}
      {selected && (
        <SessionDetail
          session={selected}
          onClose={() => setSelected(null)}
          onMarkComplete={() => markComplete(selected.id)}
          marking={marking}
        />
      )}

      {showNewSession && (
        <CoachNewSessionModal
          onClose={() => setShowNewSession(false)}
          onCreated={() => {
            setShowNewSession(false)
            fetch('/api/coach/sessions').then(r => r.json()).then(setSessions)
          }}
        />
      )}

      {reportSession && (
        <SessionReportModal
          bookingId={reportSession.id}
          sessionLabel={`${reportSession.client || reportSession.player_name || 'Session'} · ${reportSession.date} ${fmtHour(reportSession.hour)}`}
          onClose={() => setReportSession(null)}
          onSaved={() => setReportsExist(s => new Set([...s, reportSession.id]))}
        />
      )}
    </div>
  )
}
