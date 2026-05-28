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
  const { data: profile } = await supabase.from('profiles').select('role, full_name').eq('id', user.id).single()
  if (!profile?.role) return null
  return {
    service: createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!),
    role: profile.role as string,
    userId: user.id,
    fullName: profile.full_name as string,
  }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ playerId: string }> }) {
  const { playerId } = await params
  const ctx = await verify()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await ctx.service
    .from('messages')
    .select('*')
    .eq('player_id', playerId)
    .order('created_at', { ascending: true })

  // Mark as read for this viewer's role
  if (data && data.length > 0) {
    const unreadField = ctx.role === 'coach' ? 'read_by_coach' : 'read_by_parent'
    await ctx.service
      .from('messages')
      .update({ [unreadField]: true })
      .eq('player_id', playerId)
      .eq(unreadField, false)
  }

  return NextResponse.json(data || [])
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ playerId: string }> }) {
  const { playerId } = await params
  const ctx = await verify()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { body: messageBody } = await req.json()
  if (!messageBody?.trim()) return NextResponse.json({ error: 'Message required' }, { status: 400 })

  const { data, error } = await ctx.service
    .from('messages')
    .insert({
      player_id: playerId,
      sender_id: ctx.userId,
      sender_name: ctx.fullName,
      sender_role: ctx.role,
      body: messageBody.trim(),
      read_by_coach: ctx.role === 'coach' || ctx.role === 'admin',
      read_by_parent: ctx.role === 'parent',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
