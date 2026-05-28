import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

async function verify() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile?.role) return null
  return {
    service: createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!),
    role: profile.role as string,
    userId: user.id,
  }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ playerId: string }> }) {
  const { playerId } = await params
  const ctx = await verify()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await ctx.service
    .from('player_progress')
    .select('*')
    .eq('player_id', playerId)
    .order('date', { ascending: true })

  return NextResponse.json(data || [])
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ playerId: string }> }) {
  const { playerId } = await params
  const ctx = await verify()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['coach', 'admin'].includes(ctx.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const allowed = ['date', 'first_touch', 'shooting', 'positioning', 'fitness', 'mentality', 'dribbling', 'notes']
  const payload: Record<string, unknown> = { player_id: playerId, coach_id: ctx.userId }
  for (const key of allowed) { if (key in body) payload[key] = body[key] }

  const { data, error } = await ctx.service.from('player_progress').insert(payload).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ playerId: string }> }) {
  const { playerId } = await params
  const ctx = await verify()
  if (!ctx || !['coach', 'admin'].includes(ctx.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  await ctx.service.from('player_progress').delete().eq('id', id).eq('player_id', playerId)
  return NextResponse.json({ ok: true })
}
