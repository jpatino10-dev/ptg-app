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
  if (profile?.role !== 'coach' && profile?.role !== 'admin') return null
  return {
    service: createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!),
    fullName: profile.full_name as string,
  }
}

// GET all players that have sessions with this coach
export async function GET() {
  const ctx = await verifyCoach()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Get all bookings for this coach
  const { data: bookings } = await ctx.service
    .from('bookings')
    .select('player_name, client, email')
    .ilike('coach', `%${ctx.fullName}%`)

  if (!bookings?.length) return NextResponse.json([])

  // Collect unique player names
  const names = [...new Set(
    bookings.map(b => b.client || b.player_name).filter(Boolean) as string[]
  )]

  // Look up matching players records
  const { data: players } = await ctx.service
    .from('players')
    .select('id,player_name,parent_name,email,phone,dob,age_group,gender,level,club,goals,coach_notes')
    .in('player_name', names)

  // Return players found + placeholder entries for unregistered names
  const registered = new Set((players || []).map(p => p.player_name))
  const unregistered = names
    .filter(n => !registered.has(n))
    .map(n => ({ id: null, player_name: n, parent_name: null, email: null, phone: null, dob: null, age_group: null, gender: null, level: null, club: null, goals: null, coach_notes: null }))

  return NextResponse.json([...(players || []), ...unregistered])
}

// PATCH — coaches can only update coach_notes on their players
export async function PATCH(req: NextRequest) {
  const ctx = await verifyCoach()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { player_id, coach_notes } = await req.json()
  if (!player_id) return NextResponse.json({ error: 'player_id required' }, { status: 400 })

  const { error } = await ctx.service
    .from('players')
    .update({ coach_notes })
    .eq('id', player_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
