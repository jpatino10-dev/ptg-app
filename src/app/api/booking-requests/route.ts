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
    email: user.email!,
    fullName: profile.full_name as string,
  }
}

// GET — admin/coach sees all; parent sees only their own
export async function GET() {
  const ctx = await verify()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let query = ctx.service
    .from('booking_requests')
    .select('*')
    .order('created_at', { ascending: false })

  if (ctx.role === 'parent') {
    query = query.eq('parent_id', ctx.userId) as typeof query
  }

  const { data } = await query
  return NextResponse.json(data || [])
}

// POST — parent submits a request
export async function POST(req: NextRequest) {
  const ctx = await verify()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { data, error } = await ctx.service
    .from('booking_requests')
    .insert({
      parent_id: ctx.userId,
      parent_name: ctx.fullName,
      parent_email: ctx.email,
      player_name: body.player_name,
      player_id: body.player_id || null,
      requested_date: body.requested_date,
      requested_time: body.requested_time,
      session_type: body.session_type || 'individual',
      notes: body.notes,
      status: 'pending',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
