import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

async function verifyCoachOrAdmin() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('role, full_name').eq('id', user.id).single()
  if (!['coach', 'admin'].includes(profile?.role || '')) return null
  return {
    service: createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!),
    userId: user.id,
  }
}

async function verifyAny() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  return createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = await params
  const service = await verifyAny()
  if (!service) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await service.from('session_reports').select('*').eq('booking_id', bookingId).maybeSingle()
  return NextResponse.json(data || null)
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = await params
  const ctx = await verifyCoachOrAdmin()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const allowed = ['player_id', 'what_we_covered', 'key_wins', 'areas_to_improve', 'homework', 'video_url']
  const payload: Record<string, unknown> = { booking_id: bookingId, coach_id: ctx.userId }
  for (const key of allowed) { if (key in body) payload[key] = body[key] }

  // Upsert by booking_id
  const { data, error } = await ctx.service
    .from('session_reports')
    .upsert(payload, { onConflict: 'booking_id' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = await params
  const ctx = await verifyCoachOrAdmin()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const allowed = ['what_we_covered', 'key_wins', 'areas_to_improve', 'homework', 'video_url']
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  for (const key of allowed) { if (key in body) update[key] = body[key] }

  const { data, error } = await ctx.service
    .from('session_reports')
    .update(update)
    .eq('booking_id', bookingId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
