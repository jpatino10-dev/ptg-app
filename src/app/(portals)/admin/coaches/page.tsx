import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import InviteCoachForm from '@/components/InviteCoachForm'
import SetRoleButton from '@/components/SetRoleButton'

const RATES: Record<string, { individual: number; semi: number; group: number }> = {
  aidan:  { individual: 50,  semi: 45, group: 150 },
  coachA: { individual: 75,  semi: 55, group: 150 },
  josh:   { individual: 105, semi: 85, group: 150 },
}

export default async function CoachesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: myProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const isAdmin = myProfile?.role === 'admin'

  const { data: coaches } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, created_at')
    .in('role', ['coach', 'director'])
    .order('full_name')

  const today = new Date().toISOString().split('T')[0]
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const { data: recentBookings } = await supabase
    .from('bookings')
    .select('coach, type, price, date, status')
    .gte('date', thirtyDaysAgo)
    .lte('date', today)

  function sessionsForCoach(name: string) {
    return (recentBookings || []).filter(b =>
      b.coach?.toLowerCase().includes(name?.toLowerCase().split(' ').pop() || '')
    )
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-5xl mx-auto">

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="text-zinc-500 hover:text-white text-sm">← Admin</Link>
            <h1 className="text-2xl font-black text-[#cee800] tracking-widest">COACHES</h1>
          </div>
          <InviteCoachForm />
        </div>

        {(!coaches || coaches.length === 0) ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center">
            <p className="text-zinc-400 mb-2">No coaches yet.</p>
            <p className="text-zinc-600 text-sm">Create coach accounts in Supabase → Authentication → Users, then set their role to <code className="text-[#cee800]">coach</code> in the profiles table.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {coaches.map(coach => {
              const sessions = sessionsForCoach(coach.full_name || '')
              const completed = sessions.filter(s => s.status === 'confirmed' || s.status === 'paid')
              const revenue = completed.reduce((sum, s) => sum + (parseFloat(s.price || '0')), 0)
              return (
                <div key={coach.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 hover:border-[#cee800] transition">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <h3 className="font-black text-lg">{coach.full_name || 'Unnamed Coach'}</h3>
                        {coach.role === 'director' && (
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#cee800]/20 text-[#cee800]">Director</span>
                        )}
                      </div>
                      <p className="text-zinc-400 text-sm">{coach.email}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="w-10 h-10 rounded-full bg-[#cee800] flex items-center justify-center text-black font-black text-sm">
                        {(coach.full_name || 'C').split(' ').map((n: string) => n[0]).join('').slice(0,2)}
                      </div>
                      {isAdmin && <SetRoleButton userId={coach.id} currentRole={coach.role} />}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-zinc-800 rounded-xl p-3">
                      <p className="text-zinc-500 text-xs">Sessions (30d)</p>
                      <p className="text-xl font-black">{sessions.length}</p>
                    </div>
                    <div className="bg-zinc-800 rounded-xl p-3">
                      <p className="text-zinc-500 text-xs">Revenue (30d)</p>
                      <p className="text-xl font-black">${revenue.toFixed(0)}</p>
                    </div>
                  </div>

                  <div className="border-t border-zinc-800 pt-4">
                    <p className="text-zinc-500 text-xs mb-2 font-semibold uppercase tracking-wider">Rates</p>
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      {['individual','semi','group'].map(type => {
                        const coachKey = Object.keys(RATES).find(k =>
                          coach.full_name?.toLowerCase().includes(k.toLowerCase())
                        )
                        const rate = coachKey ? RATES[coachKey][type as keyof typeof RATES[string]] : '—'
                        return (
                          <div key={type} className="bg-zinc-800 rounded-lg p-2">
                            <p className="text-zinc-500 capitalize">{type}</p>
                            <p className="font-black text-[#cee800]">{rate ? `$${rate}` : '—'}</p>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Recent sessions table */}
        {recentBookings && recentBookings.length > 0 && (
          <div className="mt-8">
            <h2 className="text-lg font-black mb-4 text-zinc-300">Recent Sessions (Last 30 Days)</h2>
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="text-left px-4 py-3 text-zinc-400 font-semibold">Coach</th>
                    <th className="text-left px-4 py-3 text-zinc-400 font-semibold">Date</th>
                    <th className="text-left px-4 py-3 text-zinc-400 font-semibold">Type</th>
                    <th className="text-left px-4 py-3 text-zinc-400 font-semibold">Status</th>
                    <th className="text-right px-4 py-3 text-zinc-400 font-semibold">Price</th>
                  </tr>
                </thead>
                <tbody>
                  {recentBookings.slice(0, 20).map((b, i) => (
                    <tr key={i} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                      <td className="px-4 py-3">{b.coach || '—'}</td>
                      <td className="px-4 py-3 text-zinc-400">{b.date}</td>
                      <td className="px-4 py-3 capitalize text-zinc-400">{b.type}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          b.status === 'confirmed' || b.status === 'paid'
                            ? 'bg-[#cee800]/20 text-[#cee800]'
                            : 'bg-zinc-700 text-zinc-400'
                        }`}>{b.status}</span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">{b.price ? `$${b.price}` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
