import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

async function verifyCoach() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single()
  if (!profile || !['coach', 'admin', 'director'].includes(profile.role ?? '')) return null
  return {
    service: createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!),
    fullName: profile.full_name as string,
    role: profile.role as string,
  }
}

const SELECT = 'id,date,hour,coach,type,status,price,player_name,parent_name,notes,duration_minutes,client'

export async function GET(req: NextRequest) {
  const debug = req.nextUrl.searchParams.has('debug')

  const ctx = await verifyCoach()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Use first name to handle mismatches between profile full_name ("Josh Patino")
  // and the name stored on sessions ("Coach Josh")
  const firstName = (ctx.fullName || '').split(' ')[0]
  const namePattern = firstName ? `%${firstName}%` : `%${ctx.fullName}%`

  const { data: sessions, error: queryError } = await ctx.service
    .from('bookings')
    .select(SELECT)
    .ilike('coach', namePattern)
    .order('date', { ascending: false })

  if (debug) {
    return NextResponse.json({
      role: ctx.role,
      fullName: ctx.fullName,
      firstName,
      namePattern,
      count: sessions?.length ?? 0,
      error: queryError?.message ?? null,
      sample: (sessions || []).slice(0, 3),
    })
  }

  return NextResponse.json(sessions || [])
}

export async function POST(req: NextRequest) {
  const ctx = await verifyCoach()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { client, type, date, hour, duration, notes, location } = await req.json()
  if (!client || !date || !hour) return NextResponse.json({ error: 'Client, date and time required' }, { status: 400 })

  const { error } = await ctx.service.from('bookings').insert({
    id:               crypto.randomUUID(),
    client,
    player_name:      client,
    coach:            ctx.fullName,
    type:             type || 'individual',
    date,
    hour,
    duration_minutes: duration || 60,
    notes:            notes || null,
    location:         location || null,
    status:           'confirmed',
    source:           'coach',
    is_group_slot:    false,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
