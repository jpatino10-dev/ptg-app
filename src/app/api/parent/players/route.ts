import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

async function verifyParent() {
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
  if (profile?.role !== 'parent' && profile?.role !== 'admin') return null
  return {
    service: createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!),
    email: user.email!,
    fullName: profile.full_name as string,
  }
}

export async function GET() {
  const ctx = await verifyParent()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: players } = await ctx.service
    .from('players')
    .select('id,player_name,parent_name,email,phone,dob,age_group,gender,level,club,goals,coach_notes')
    .or(`email.eq.${ctx.email},parent_name.ilike.%${ctx.fullName}%`)
    .order('player_name')

  return NextResponse.json(players || [])
}
