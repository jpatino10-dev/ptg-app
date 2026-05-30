import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function GroupSessionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: myProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!['admin', 'director'].includes(myProfile?.role ?? '')) redirect('/login')

  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: slots } = await admin
    .from('bookings')
    .select('id, date, hour, client, capacity, location, status')
    .eq('is_group_slot', true)
    .order('date')
    .order('hour')

  const slotIds = (slots || []).map(s => s.id)

  const { data: registrations } = slotIds.length > 0
    ? await admin.from('group_registrations').select('slot_id, status').in('slot_id', slotIds)
    : { data: [] }

  const regBySlot = (registrations || []).reduce((acc, r) => {
    if (!acc[r.slot_id]) acc[r.slot_id] = []
    acc[r.slot_id].push(r)
    return acc
  }, {} as Record<string, { slot_id: string; status: string }[]>)

  const today = new Date().toISOString().slice(0, 10)

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/admin" className="text-zinc-500 hover:text-white text-sm">← Admin</Link>
          <h1 className="text-2xl font-black text-[#cee800] tracking-widest">GROUP SESSIONS</h1>
        </div>

        {(!slots || slots.length === 0) ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center">
            <p className="text-zinc-400 mb-2">No group sessions seeded yet.</p>
            <p className="text-zinc-600 text-sm">
              Go to the{' '}
              <Link href="/admin/calendar" className="text-[#cee800] hover:underline">Calendar</Link>
              {' '}and click <span className="text-[#cee800]">+ June Groups</span> to add sessions.
            </p>
          </div>
        ) : (
          ['Elite Boys', 'Elite Girls'].map(group => {
            const groupSlots = (slots || []).filter(s => s.client === group)
            if (groupSlots.length === 0) return null
            return (
              <div key={group} className="mb-8">
                <h2 className="text-lg font-black text-zinc-300 mb-3">{group}</h2>
                <div className="space-y-3">
                  {groupSlots.map(slot => {
                    const regs = regBySlot[slot.id] || []
                    const attended = regs.filter(r => r.status === 'attended').length
                    const total = regs.filter(r => r.status !== 'cancelled').length
                    const capacity = slot.capacity || 12
                    const isPast = slot.date < today
                    const fillPct = Math.min(100, Math.round((total / capacity) * 100))

                    return (
                      <Link key={slot.id} href={`/admin/group-sessions/${slot.id}`}
                        className="block bg-zinc-900 border border-zinc-800 hover:border-[#cee800] rounded-2xl p-5 transition">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <p className="font-black text-lg">{slot.date} · {slot.hour}</p>
                            {slot.location && <p className="text-zinc-400 text-sm">{slot.location}</p>}
                          </div>
                          <div className="text-right">
                            <p className="font-black text-2xl">
                              {total}
                              <span className="text-zinc-500 text-base font-normal">/{capacity}</span>
                            </p>
                            <p className="text-zinc-500 text-xs">
                              {isPast && attended > 0 ? `${attended} attended` : 'registered'}
                            </p>
                          </div>
                        </div>
                        <div className="w-full bg-zinc-800 rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full transition-all ${
                              fillPct >= 100 ? 'bg-red-500' : fillPct >= 70 ? 'bg-yellow-500' : 'bg-[#00e676]'
                            }`}
                            style={{ width: `${fillPct}%` }}
                          />
                        </div>
                        {total >= capacity && (
                          <p className="text-red-400 text-xs mt-2 font-semibold">FULL</p>
                        )}
                      </Link>
                    )
                  })}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
