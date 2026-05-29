import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

async function verifyAdmin() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return null
  return createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

const JUNE_SESSIONS = [
  { date: '2026-06-05', hour: '6:00 PM', client: 'Elite Boys',  duration: 60, location: '' },
  { date: '2026-06-12', hour: '6:00 PM', client: 'Elite Boys',  duration: 60, location: '' },
  { date: '2026-06-19', hour: '6:00 PM', client: 'Elite Boys',  duration: 60, location: '' },
  { date: '2026-06-26', hour: '6:00 PM', client: 'Elite Boys',  duration: 60, location: '' },
  { date: '2026-06-05', hour: '7:00 PM', client: 'Elite Girls', duration: 60, location: '' },
  { date: '2026-06-12', hour: '7:00 PM', client: 'Elite Girls', duration: 60, location: '' },
  { date: '2026-06-19', hour: '7:00 PM', client: 'Elite Girls', duration: 60, location: '' },
  { date: '2026-06-26', hour: '7:00 PM', client: 'Elite Girls', duration: 60, location: '' },
]

export async function POST() {
  const admin = await verifyAdmin()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const dates = ['2026-06-05', '2026-06-12', '2026-06-19', '2026-06-26']
  const { data: existing } = await admin
    .from('bookings')
    .select('date, hour, client')
    .in('date', dates)
    .eq('type', 'group')

  const toInsert = JUNE_SESSIONS.filter(s =>
    !existing?.some(e => e.date === s.date && e.hour === s.hour && e.client === s.client)
  )

  if (toInsert.length === 0) return NextResponse.json({ created: 0 })

  const rows = toInsert.map(s => ({
    id:               crypto.randomUUID(),
    date:             s.date,
    hour:             s.hour,
    coach:            '',
    type:             'group',
    client:           s.client,
    player_name:      s.client,
    status:           'confirmed',
    source:           'admin',
    notes:            'June Group Training Series',
    location:         s.location || null,
    is_group_slot:    true,
    capacity:         12,
    duration_minutes: s.duration,
  }))

  const { error } = await admin.from('bookings').insert(rows)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ created: rows.length })
}
