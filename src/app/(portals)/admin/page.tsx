import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Image from 'next/image'

export default async function AdminDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Image src="/logo.jpg" alt="PTG" width={40} height={40} className="rounded-lg" />
            <h1 className="text-2xl font-black text-lime-400 tracking-widest">PTG ADMIN</h1>
          </div>
          <span className="text-zinc-400 text-sm">{user.email}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Total Players', value: '—' },
            { label: 'Sessions This Week', value: '—' },
            { label: 'Revenue This Month', value: '—' },
          ].map(({ label, value }) => (
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
          ].map(({ title, desc }) => (
            <div key={title} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 cursor-pointer hover:border-lime-400 transition">
              <h3 className="font-black text-lg">{title}</h3>
              <p className="text-zinc-400 text-sm mt-1">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
