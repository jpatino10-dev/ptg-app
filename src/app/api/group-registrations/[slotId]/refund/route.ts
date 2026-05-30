import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

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

export async function POST(req: NextRequest, { params }: { params: Promise<{ slotId: string }> }) {
  const { slotId } = await params
  const admin = await verifyAdmin()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { registrationId, issueRefund } = await req.json()
  if (!registrationId) return NextResponse.json({ error: 'Invalid' }, { status: 400 })

  // Fetch the registration
  const { data: reg } = await admin
    .from('group_registrations')
    .select('id, stripe_session_id, player_name')
    .eq('id', registrationId)
    .eq('slot_id', slotId)
    .single()

  if (!reg) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Mark cancelled
  const { error } = await admin
    .from('group_registrations')
    .update({ status: 'cancelled' })
    .eq('id', registrationId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Issue Stripe refund if requested and a payment session exists
  if (issueRefund && reg.stripe_session_id) {
    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
      const session = await stripe.checkout.sessions.retrieve(reg.stripe_session_id)
      if (session.payment_intent) {
        await stripe.refunds.create({ payment_intent: session.payment_intent as string })
      }
    } catch (e) {
      return NextResponse.json({ ok: true, refundError: (e as Error).message })
    }
  }

  return NextResponse.json({ ok: true })
}
