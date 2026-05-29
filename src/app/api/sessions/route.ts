import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
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

export async function GET(req: NextRequest) {
  const admin = await verifyAdmin()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const from = searchParams.get('from')
  const to   = searchParams.get('to')

  let query = admin
    .from('bookings')
    .select('id,date,hour,coach,type,player_name,parent_name,client,status,price,is_group_slot,group_slot_id,capacity,duration_minutes,location,notes')
    .order('hour')

  if (from) query = query.gte('date', from)
  if (to)   query = query.lte('date', to)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const admin = await verifyAdmin()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { title, coach, type, date, hour, duration, notes, location, recurType, occurrences: occ } = await req.json()

  const rows = []
  const base = new Date(date + 'T00:00:00')
  const count = recurType !== 'none' ? Math.min(parseInt(occ) || 1, 52) : 1
  const stepDays = recurType === 'daily' ? 1 : 7

  for (let i = 0; i < count; i++) {
    const d = new Date(base)
    d.setDate(d.getDate() + i * (recurType !== 'none' ? stepDays : 0))
    rows.push({
      id:               crypto.randomUUID(),
      date:             d.toISOString().split('T')[0],
      hour,
      coach,
      type,
      client:           title || 'Admin Booking',
      player_name:      title || null,
      status:           'confirmed',
      source:           'admin',
      notes:            notes || null,
      location:         location || null,
      is_group_slot:    type === 'group',
      capacity:         type === 'group' ? 10 : null,
      duration_minutes: duration || 60,
    })
  }

  const { error } = await admin.from('bookings').insert(rows)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ created: rows.length })
}
