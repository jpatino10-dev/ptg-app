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

export async function GET(req: NextRequest, { params }: { params: Promise<{ slotId: string }> }) {
  const { slotId } = await params
  const admin = await verifyAdmin()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [{ data: slot }, { data: registrations }] = await Promise.all([
    admin.from('bookings')
      .select('id, date, hour, client, capacity, location, status')
      .eq('id', slotId)
      .single(),
    admin.from('group_registrations')
      .select('*')
      .eq('slot_id', slotId)
      .order('created_at'),
  ])

  if (!slot) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ slot, registrations: registrations || [] })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slotId: string }> }) {
  const { slotId } = await params
  const admin = await verifyAdmin()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { player_name, parent_name, email, phone, notes } = await req.json()
  if (!player_name?.trim()) return NextResponse.json({ error: 'player_name required' }, { status: 400 })

  const { error } = await admin.from('group_registrations').insert({
    slot_id: slotId,
    player_name: player_name.trim(),
    parent_name: parent_name || null,
    email: email || null,
    phone: phone || null,
    notes: notes || null,
    status: 'registered',
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ slotId: string }> }) {
  const { slotId } = await params
  const admin = await verifyAdmin()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { registrationId, status } = await req.json()
  const validStatuses = ['registered', 'attended', 'absent', 'cancelled']
  if (!registrationId || !validStatuses.includes(status)) {
    return NextResponse.json({ error: 'Invalid' }, { status: 400 })
  }

  const { error } = await admin.from('group_registrations')
    .update({ status })
    .eq('id', registrationId)
    .eq('slot_id', slotId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ slotId: string }> }) {
  const { slotId } = await params
  const admin = await verifyAdmin()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { registrationId } = await req.json()
  if (!registrationId) return NextResponse.json({ error: 'Invalid' }, { status: 400 })

  const { error } = await admin.from('group_registrations')
    .delete()
    .eq('id', registrationId)
    .eq('slot_id', slotId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
