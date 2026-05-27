import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  // Verify the caller is an admin
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() {},
      },
    }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Use service role to bypass RLS
  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const body = await req.json()
  const { coach, type, date, hour, playerName, notes, recurring, weeks } = body

  const rows = []
  const baseDate = new Date(date + 'T00:00:00')

  const occurrences = recurring ? Math.min(parseInt(weeks) || 1, 52) : 1
  for (let i = 0; i < occurrences; i++) {
    const d = new Date(baseDate)
    d.setDate(d.getDate() + i * 7)
    const dateStr = d.toISOString().split('T')[0]
    rows.push({
      id: crypto.randomUUID(),
      date: dateStr,
      hour,
      coach,
      type,
      client: playerName || 'Admin Booking',
      player_name: playerName || null,
      status: 'confirmed',
      source: 'admin',
      notes: notes || null,
      is_group_slot: type === 'group',
      capacity: type === 'group' ? 10 : null,
    })
  }

  const { error } = await admin.from('bookings').insert(rows)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ created: rows.length })
}
