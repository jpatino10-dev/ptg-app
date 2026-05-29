import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'

function getWeekRange() {
  const now = new Date()
  const day = now.getDay() // 0=Sun
  const monday = new Date(now)
  monday.setDate(now.getDate() - ((day + 6) % 7))
  monday.setHours(0, 0, 0, 0)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return {
    start: monday.toISOString().slice(0, 10),
    end: sunday.toISOString().slice(0, 10),
  }
}

function getMonthRange() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  }
}

export default async function AdminDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const week = getWeekRange()
  const month = getMonthRange()

  const [
    { count: totalPlayers },
    { count: sessionsThisWeek },
    { data: monthBookings },
    { count: pendingRequests },
  ] = await Promise.all([
    admin.from('players').select('*', { count: 'exact', head: true }),
    admin.from('bookings')
      .select('*', { count: 'exact', head: true })
      .gte('date', week.start)
      .lte('date', week.end),
    admin.from('bookings')
      .select('price, status')
      .gte('date', month.start)
      .lte('date', month.end)
      .in('status', ['confirmed', 'paid']),
    admin.from('booking_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
  ])

  const revenueThisMonth = (monthBookings || [])
    .reduce((sum, b) => sum + parseFloat(b.price || '0'), 0)

  const stats = [
    { label: 'Total Players', value: String(totalPlayers ?? 0) },
    { label: 'Sessions This Week', value: String(sessionsThisWeek ?? 0) },
    { label: 'Revenue This Month', value: `$${revenueThisMonth.toFixed(0)}` },
  ]

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="PTG" width={40} height={40} />
            <h1 className="text-2xl font-black text-[#cee800] tracking-widest">PTG ADMIN</h1>
          </div>
          <span className="text-zinc-400 text-sm">{user.email}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {stats.map(({ label, value }) => (
            <div key={label} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              <p className="text-zinc-400 text-sm">{label}</p>
              <p className="text-3xl font-black text-white mt-1">{value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { title: 'Calendar', desc: 'Manage sessions and group slots', href: '/admin/calendar' },
            { title: 'Players', desc: 'View and manage player profiles', href: '/admin/players' },
            { title: 'Coaches', desc: 'Coach schedules and payments', href: '/admin/coaches' },
            { title: 'Payments', desc: 'Revenue tracking and history', href: '/admin/payments' },
            { title: 'Requests', desc: `Session requests from parents${(pendingRequests ?? 0) > 0 ? ` · ${pendingRequests} pending` : ''}`, href: '/admin/requests' },
            { title: 'Discounts', desc: 'Create and manage promotion codes', href: '/admin/discounts' },
            { title: 'Coach Portal', desc: 'View your schedule, players, and reports', href: '/coach' },
          ].map(({ title, desc, href }) => (
            <Link key={title} href={href} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 hover:border-[#cee800] transition block">
              <h3 className="font-black text-lg">{title}</h3>
              <p className="text-zinc-400 text-sm mt-1">{desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
