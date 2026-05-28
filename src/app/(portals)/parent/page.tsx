'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

type Booking = {
  id: string; date: string; hour: string; coach: string; type: string
  status: string; price: string | null; player_name: string | null; client: string | null
}

const TYPE_COLORS: Record<string, string> = {
  individual: '#cee800', semi: '#00e5ff', group: '#00e676', camp: '#b388ff', duo: '#ff6b35',
}

export default function ParentDashboard() {
  const router = useRouter()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [userName, setUserName] = useState('')
  const [loading, setLoading]  = useState(true)

  useEffect(() => {
    async function init() {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
      setUserName(profile?.full_name || user.email || '')

      const res = await fetch('/api/parent/bookings')
      if (res.ok) setBookings(await res.json())
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
  const upcoming   = bookings.filter(b => b.date >= today).sort((a, b) => a.date < b.date ? -1 : 1)
  const paid       = bookings.filter(b => b.status === 'confirmed' || b.status === 'paid')
  const totalSpent = paid.reduce((sum, b) => sum + parseFloat(b.price || '0'), 0)
  const nextUp     = upcoming.slice(0, 3)

  const stats = [
    { label: 'Upcoming Sessions', value: loading ? '—' : String(upcoming.length) },
    { label: 'Total Sessions', value: loading ? '—' : String(bookings.length) },
    { label: 'Total Invested', value: loading ? '—' : `$${totalSpent.toFixed(0)}` },
  ]

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-6">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="PTG" width={36} height={36} />
            <h1 className="text-2xl font-black text-[#cee800] tracking-widest">PTG</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-zinc-400 text-sm hidden sm:block">{userName}</span>
            <button onClick={signOut} className="text-zinc-500 hover:text-white text-sm transition">Sign out</button>
          </div>
        </div>

        {/* Welcome */}
        {userName && (
          <p className="text-zinc-400 text-sm mb-6">Welcome back, {userName.split(' ')[0]}.</p>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {stats.map(({ label, value }) => (
            <div key={label} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-center">
              <p className="text-zinc-400 text-xs mb-1">{label}</p>
              <p className="text-2xl font-black">{value}</p>
            </div>
          ))}
        </div>

        {/* Nav cards */}
        <div className="grid grid-cols-1 gap-3 mb-6">
          {[
            { title: 'My Bookings', desc: 'View upcoming and past sessions', href: '/parent/bookings' },
            { title: 'My Players', desc: 'Player profiles and coach notes', href: '/parent/players' },
          ].map(({ title, desc, href }) => (
            <Link key={title} href={href}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 hover:border-[#cee800] transition flex items-center justify-between">
              <div>
                <h3 className="font-black text-lg">{title}</h3>
                <p className="text-zinc-400 text-sm mt-0.5">{desc}</p>
              </div>
              <span className="text-zinc-600 text-xl">→</span>
            </Link>
          ))}
        </div>

        {/* Upcoming sessions */}
        {!loading && nextUp.length > 0 && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
              <h2 className="font-black">Upcoming Sessions</h2>
              <Link href="/parent/bookings" className="text-[#cee800] text-sm hover:underline">View all</Link>
            </div>
            <div className="divide-y divide-zinc-800">
              {nextUp.map(b => (
                <div key={b.id} className="px-5 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-1 h-10 rounded-full shrink-0"
                      style={{ backgroundColor: TYPE_COLORS[b.type] || '#666' }} />
                    <div>
                      <p className="font-semibold">{b.client || b.player_name || 'Session'}</p>
                      <p className="text-zinc-400 text-sm">{b.date} · {b.hour} · {b.coach}</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full text-black shrink-0"
                    style={{ backgroundColor: TYPE_COLORS[b.type] || '#666' }}>
                    {b.type}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {!loading && upcoming.length === 0 && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center">
            <p className="text-zinc-400 mb-1">No upcoming sessions.</p>
            <p className="text-zinc-600 text-sm">Contact PTG to schedule a session.</p>
          </div>
        )}

      </div>
    </div>
  )
}
