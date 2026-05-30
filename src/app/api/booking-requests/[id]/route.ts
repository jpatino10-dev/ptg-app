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
  if (!['admin','director'].includes(profile?.role ?? '')) return null
  return createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

// PATCH — admin approves or declines, optionally creates booking on approve
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const admin = await verifyAdmin()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { status, admin_notes, create_booking } = body

  const { data: updated, error } = await admin
    .from('booking_requests')
    .update({ status, admin_notes })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Optionally create an actual booking when approving
  if (status === 'approved' && create_booking) {
    const { coach, hour, price } = create_booking
    await admin.from('bookings').insert({
      player_name: updated.player_name,
      parent_name: updated.parent_name,
      email: updated.parent_email,
      date: updated.requested_date,
      hour: hour || updated.requested_time || '09:00',
      coach: coach || '',
      type: updated.session_type || 'individual',
      status: 'confirmed',
      price: price || null,
      source: 'request',
    })
  }

  return NextResponse.json(updated)
}
