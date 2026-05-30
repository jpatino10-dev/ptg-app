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

export default function CoachDashboard() {
  const router = useRouter()
  const [sessions, setSessions] = useState<Session[]>([])
  const [userName, setUserName] = useState('')
  const [userRole, setUserRole] = useState('')
  const [loading, setLoading] = useState(true)

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

  const today = new Date().toISOString().slice(0, 10)
  const weekStart = (() => {
    const d = new Date(); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d.toISOString().slice(0, 10)
  })()
  const weekEnd = (() => {
    const d = new Date(); d.setDate(d.getDate() - ((d.getDay() + 6) % 7) + 6); return d.toISOString().slice(0, 10)
  })()
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)

  const upcomingSessions  = sessions.filter(s => s.date >= today)
  const sessionsThisWeek  = sessions.filter(s => s.date >= weekStart && s.date <= weekEnd)
  const earningsThisMonth = sessions
    .filter(s => s.date >= monthStart && (s.status === 'confirmed' || s.status === 'paid'))
    .reduce((sum, s) => sum + parseFloat(s.price || '0'), 0)
  const uniquePlayers = new Set(sessions.map(s => s.player_name || s.client).filter(Boolean)).size

  const stats = [
    { label: 'Upcoming Sessions', value: loading ? '—' : String(upcomingSessions.length) },
    { label: 'Sessions This Week', value: loading ? '—' : String(sessionsThisWeek.length) },
    { label: 'My Players', value: loading ? '—' : String(uniquePlayers) },
    { label: 'Est. Earnings (Mo)', value: loading ? '—' : `$${earningsThisMonth.toFixed(0)}` },
  ]

  const nextFive = upcomingSessions.slice(0, 5)

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-6">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="PTG" width={36} height={36} />
            <h1 className="text-2xl font-black text-[#cee800] tracking-widest">COACH PORTAL</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2">
              {userRole === 'director' && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#cee800]/20 text-[#cee800]">Director</span>
              )}
              <span className="text-zinc-400 text-sm">{userName}</span>
            </div>
            <button onClick={signOut} className="text-zinc-500 hover:text-white text-sm transition">Sign out</button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {stats.map(({ label, value }) => (
            <div key={label} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-center">
              <p className="text-zinc-400 text-xs mb-1">{label}</p>
              <p className="text-2xl font-black">{value}</p>
            </div>
          ))}
        </div>

        {/* Nav cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {[
            { title: 'My Schedule', desc: 'View upcoming and past sessions', href: '/coach/schedule' },
            { title: 'My Players', desc: 'Player roster and training notes', href: '/coach/players' },
          ].map(({ title, desc, href }) => (
            <Link key={title} href={href}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 hover:border-[#cee800] transition block">
              <h3 className="font-black text-lg">{title}</h3>
              <p className="text-zinc-400 text-sm mt-1">{desc}</p>
            </Link>
          ))}
        </div>

        {/* Upcoming sessions preview */}
        {!loading && nextFive.length > 0 && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
              <h2 className="font-black">Upcoming Sessions</h2>
              <Link href="/coach/schedule" className="text-[#cee800] text-sm hover:underline">View all</Link>
            </div>
            <div className="divide-y divide-zinc-800">
              {nextFive.map(s => (
                <div key={s.id} className="px-6 py-4 flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{s.player_name || s.client || 'Group session'}</p>
                    <p className="text-zinc-400 text-sm">{s.date} · {s.hour}</p>
                  </div>
                  <span className="text-xs font-bold px-3 py-1 rounded-full"
                    style={{ backgroundColor: TYPE_COLORS[s.type] || '#444', color: '#000' }}>
                    {s.type}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {!loading && nextFive.length === 0 && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center">
            <p className="text-zinc-400">No upcoming sessions scheduled.</p>
          </div>
        )}

      </div>
    </div>
  )
}

const TYPE_COLORS: Record<string, string> = {
  individual: '#cee800', semi: '#00e5ff', group: '#00e676', camp: '#b388ff', duo: '#ff6b35',
}
