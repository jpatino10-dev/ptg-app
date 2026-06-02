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

  const isAdminOrDirector = ctx.role === 'admin' || ctx.role === 'director'

  // Personal sessions — matched by coach name
  const { data: personal, error: e1 } = await ctx.service
    .from('bookings')
    .select(SELECT)
    .ilike('coach', `%${ctx.fullName}%`)
    .order('date', { ascending: false })

  // Admins and directors also see all group slots (is_group_slot = true)
  let groups: typeof personal = []
  let e2 = null
  if (isAdminOrDirector) {
    const { data, error } = await ctx.service
      .from('bookings')
      .select(SELECT)
      .eq('is_group_slot', true)
      .order('date', { ascending: false })
    groups = data || []
    e2 = error
  }

  if (debug) {
    return NextResponse.json({
      role: ctx.role,
      fullName: ctx.fullName,
      personalCount: personal?.length ?? 0,
      personalError: e1?.message ?? null,
      groupCount: groups.length,
      groupError: e2?.message ?? null,
      groupSample: groups.slice(0, 2),
    })
  }

  // Merge and deduplicate by id
  const all = [...(personal || []), ...groups]
  const unique = [...new Map(all.map(s => [s.id, s])).values()]

  return NextResponse.json(unique)
}
