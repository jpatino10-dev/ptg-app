import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

async function verifyAdmin() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!['admin', 'director'].includes(profile?.role ?? '')) return null
  return createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function POST(req: NextRequest) {
  const admin = await verifyAdmin()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { email, full_name, temp_password, role = 'coach' } = await req.json()
  if (!email || !full_name || !temp_password) {
    return NextResponse.json({ error: 'Email, name, and password required' }, { status: 400 })
  }

  // Find and delete any existing user with this email via profiles table
  const { data: existingProfile } = await admin
    .from('profiles')
    .select('id')
    .eq('email', email)
    .maybeSingle()

  if (existingProfile?.id) {
    await admin.auth.admin.deleteUser(existingProfile.id)
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: temp_password,
    email_confirm: true,
    user_metadata: { full_name, role },
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await admin.from('profiles').upsert({
    id: data.user.id,
    email,
    full_name,
    role,
    must_reset_password: true,
  }, { onConflict: 'id' })

  return NextResponse.json({ ok: true })
}
