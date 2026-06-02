import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
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
  if (!['coach', 'admin', 'director'].includes(profile?.role ?? '')) return null
  return {
    service: createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!),
    fullName: profile.full_name as string,
    role: profile.role as string,
  }
}

export async function GET() {
  const ctx = await verifyCoach()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Admins and directors see their personal sessions + all group slots.
  // Coaches see only sessions where they are the assigned coach.
  const filter = (ctx.role === 'admin' || ctx.role === 'director')
    ? `coach.ilike.%${ctx.fullName}%,is_group_slot.eq.true`
    : `coach.ilike.%${ctx.fullName}%`

  const { data: sessions } = await ctx.service
    .from('bookings')
    .select('id,date,hour,coach,type,status,price,player_name,parent_name,notes,duration_minutes,client')
    .or(filter)
    .order('date', { ascending: false })

  return NextResponse.json(sessions || [])
}
