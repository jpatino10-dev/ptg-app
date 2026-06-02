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
  if (!['admin','director'].includes(profile?.role ?? '')) return null
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
    .select('id,date,hour,coach,type,player_name,parent_name,client,status,price,is_group_slot,group_slot_id,capacity,duration_minutes,location,notes,coach_pay,director_pay')
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

  const { title, coach, type, date, hour, duration, notes, location, recurType, occurrences: occ, price, coach_pay, director_pay, extraDates, capacity, isGroup } = await req.json()

  const makeRow = (d: string, h: string) => ({
    id:               crypto.randomUUID(),
    date:             d,
    hour:             h,
    coach,
    type,
    client:           title || 'Admin Booking',
    player_name:      title || null,
    status:           'confirmed',
    source:           'admin',
    notes:            notes || null,
    location:         location || null,
    price:            price || null,
    coach_pay:        coach_pay || null,
    director_pay:     director_pay || null,
    is_group_slot:    isGroup || type === 'group',
    capacity:         isGroup || type === 'group' ? (capacity || 12) : null,
    duration_minutes: duration || 60,
  })

  const rows = []
  if (Array.isArray(extraDates) && extraDates.length > 0) {
    // Group session modal: explicit list of date/hour pairs
    rows.push(makeRow(date, hour))
    for (const extra of extraDates) rows.push(makeRow(extra.date, extra.hour))
  } else {
    const base = new Date(date + 'T00:00:00')
    const count = recurType !== 'none' ? Math.min(parseInt(occ) || 1, 52) : 1
    const stepDays = recurType === 'daily' ? 1 : 7
    for (let i = 0; i < count; i++) {
      const d = new Date(base)
      d.setDate(d.getDate() + i * (recurType !== 'none' ? stepDays : 0))
      rows.push(makeRow(d.toISOString().split('T')[0], hour))
    }
  }

  const { error } = await admin.from('bookings').insert(rows)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ created: rows.length })
}
