'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

type Session = {
  id: string; date: string; hour: string; type: string
  status: string; price: string | null; player_name: string | null; client: string | null
}

const TYPE_COLORS: Record<string, string> = {
  individual: '#cee800', semi: '#00e5ff', group: '#00e676', camp: '#b388ff', duo: '#ff6b35',
}

function fmtHour(h: string) {
  const [hr, min] = h.split(':').map(Number)
  return `${hr % 12 || 12}:${String(min || 0).padStart(2, '0')} ${hr >= 12 ? 'PM' : 'AM'}`
}

export default function CoachDashboard() {
  const router = useRouter()
  const [sessions, setSessions]   = useState<Session[]>([])
  const [userName, setUserName]   = useState('')
  const [userRole, setUserRole]   = useState('')
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    async function init() {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: profile } = await supabase.from('profiles').select('full_name, role').eq('id', user.id).single()
      setUserName(profile?.full_name || user.email || '')
      setUserRole(profile?.role || '')
      const res = await fetch('/api/coach/sessions')
      if (res.ok) setSessions(await res.json())
      setLoading(false)
    }
    init()
  }, [router])

  async function signOut() {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    await supabase.auth.signOut()
    router.push('/login')
  }

  const today      = new Date().toISOString().slice(0, 10)
  const tomorrow   = new Date(Date.now() + 86400000).toISOString().slice(0, 10)
  const weekEnd    = (() => { const d = new Date(); d.setDate(d.getDate() + 6); return d.toISOString().slice(0, 10) })()
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)

  const todaySessions    = sessions.filter(s => s.date === today).sort((a,b) => a.hour.localeCompare(b.hour))
  const upcomingSessions = sessions.filter(s => s.date > today && s.date <= weekEnd).sort((a,b) => a.date < b.date ? -1 : 1)
  const sessionsThisWeek = sessions.filter(s => s.date >= today && s.date <= weekEnd)
  const uniquePlayers    = new Set(sessions.filter(s => s.date >= monthStart).map(s => s.player_name || s.client).filter(Boolean)).size

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-6">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="PTG" width={36} height={36} />
            <div>
              <p className="text-zinc-500 text-xs uppercase tracking-widest">Coach Portal</p>
              <h1 className="text-xl font-black text-white leading-tight">
                {loading ? '—' : `${greeting()}, ${userName.split(' ')[0]}`}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {userRole === 'director' && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#cee800]/20 text-[#cee800]">Director</span>
            )}
            {userRole === 'admin' && (
              <Link href="/admin" className="text-xs font-bold px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition">← Admin</Link>
            )}
            <button onClick={signOut} className="text-zinc-500 hover:text-white text-sm transition">Sign out</button>
          </div>
        </div>

        {/* Today's sessions */}
        {!loading && (
          <div className="mb-6">
            {todaySessions.length > 0 ? (
              <div className="bg-[#cee800]/5 border border-[#cee800]/30 rounded-2xl overflow-hidden">
                <div className="px-5 py-3 border-b border-[#cee800]/20 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#cee800] animate-pulse" />
                    <p className="text-[#cee800] font-black text-sm uppercase tracking-wider">Today</p>
                  </div>
                  <p className="text-zinc-500 text-xs">{todaySessions.length} session{todaySessions.length !== 1 ? 's' : ''}</p>
                </div>
                <div className="divide-y divide-[#cee800]/10">
                  {todaySessions.map(s => (
                    <div key={s.id} className="px-5 py-4 flex items-center justify-between">
                      <div>
                        <p className="font-black text-white">{s.player_name || s.client || 'Group session'}</p>
                        <p className="text-zinc-400 text-sm">{fmtHour(s.hour)}</p>
                      </div>
                      <span className="text-xs font-black px-3 py-1 rounded-full text-black"
                        style={{ backgroundColor: TYPE_COLORS[s.type] || '#444' }}>
                        {s.type}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl px-5 py-4 flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-zinc-600" />
                <p className="text-zinc-500 text-sm">No sessions today</p>
              </div>
            )}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: 'This Week', value: loading ? '—' : String(sessionsThisWeek.length), sub: 'sessions' },
            { label: 'Players', value: loading ? '—' : String(uniquePlayers), sub: 'this month' },
            { label: 'Tomorrow', value: loading ? '—' : String(sessions.filter(s => s.date === tomorrow).length), sub: 'sessions' },
          ].map(({ label, value, sub }) => (
            <div key={label} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-center">
              <p className="text-zinc-500 text-xs uppercase tracking-wider mb-1">{label}</p>
              <p className="text-2xl font-black">{value}</p>
              <p className="text-zinc-600 text-xs">{sub}</p>
            </div>
          ))}
        </div>

        {/* Nav cards */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {[
            { title: 'My Schedule', desc: 'Upcoming & past sessions', href: '/coach/schedule', color: '#cee800' },
            { title: 'My Players', desc: 'Roster and training notes', href: '/coach/players', color: '#00e5ff' },
          ].map(({ title, desc, href, color }) => (
            <Link key={title} href={href}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 hover:border-zinc-600 transition block">
              <div className="w-1.5 h-6 rounded-full mb-3" style={{ backgroundColor: color }} />
              <h3 className="font-black text-lg leading-tight">{title}</h3>
              <p className="text-zinc-500 text-sm mt-1">{desc}</p>
            </Link>
          ))}
        </div>

        {/* Upcoming this week */}
        {!loading && upcomingSessions.length > 0 && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
              <h2 className="font-black text-sm uppercase tracking-wider text-zinc-400">Coming Up</h2>
              <Link href="/coach/schedule" className="text-[#cee800] text-xs font-bold hover:underline">View all →</Link>
            </div>
            <div className="divide-y divide-zinc-800/50">
              {upcomingSessions.slice(0, 5).map(s => {
                const isTomorrow = s.date === tomorrow
                const dateLabel = isTomorrow ? 'Tomorrow' : new Date(s.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
                return (
                  <div key={s.id} className="px-5 py-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-1 self-stretch rounded-full" style={{ backgroundColor: TYPE_COLORS[s.type] || '#444' }} />
                      <div>
                        <p className="font-bold text-sm">{s.player_name || s.client || 'Group session'}</p>
                        <p className="text-zinc-500 text-xs">{dateLabel} · {fmtHour(s.hour)}</p>
                      </div>
                    </div>
                    <span className="text-xs font-black px-2 py-0.5 rounded-full text-black"
                      style={{ backgroundColor: TYPE_COLORS[s.type] || '#444' }}>
                      {s.type}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
