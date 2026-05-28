import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient as createServiceClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type !== 'checkout.session.completed') {
    return NextResponse.json({ received: true })
  }

  const session = event.data.object as Stripe.Checkout.Session
  const meta = session.metadata!
  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Map session type to booking type
  const typeMap: Record<string, string> = {
    individual: 'individual', semi: 'semi', duo: 'duo',
    group_dropin: 'group', group_month: 'group',
  }

  // Create booking record
  await admin.from('bookings').insert({
    player_name: meta.player_name,
    parent_name: meta.parent_name,
    email: meta.email,
    type: typeMap[meta.session_type] || meta.session_type,
    date: meta.preferred_date || null,
    hour: '09:00',
    coach: '',
    status: 'paid',
    price: ((session.amount_total ?? 0) / 100).toFixed(2),
    source: 'online',
    notes: [
      meta.notes,
      meta.age_group ? `Age group: ${meta.age_group}` : '',
      meta.phone ? `Phone: ${meta.phone}` : '',
      meta.preferred_date ? `Requested date: ${meta.preferred_date}` : '',
    ].filter(Boolean).join(' | '),
  })

  // Create or find player record
  const { data: existingPlayer } = await admin
    .from('players')
    .select('id')
    .ilike('player_name', meta.player_name)
    .maybeSingle()

  if (!existingPlayer) {
    await admin.from('players').insert({
      player_name: meta.player_name,
      parent_name: meta.parent_name,
      email: meta.email,
      phone: meta.phone || null,
      age_group: meta.age_group || null,
    })
  }

  // Invite parent if they don't already have an account
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://app.trainatptg.com'
  const { data: existingUser } = await admin.auth.admin.listUsers()
  const alreadyHasAccount = existingUser.users.some(u => u.email === meta.email)

  if (!alreadyHasAccount && meta.email) {
    const { data: invited } = await admin.auth.admin.inviteUserByEmail(meta.email, {
      redirectTo: `${siteUrl}/auth/set-password`,
      data: { full_name: meta.parent_name, role: 'parent' },
    })
    if (invited?.user) {
      await admin.from('profiles').upsert({
        id: invited.user.id,
        email: meta.email,
        full_name: meta.parent_name,
        role: 'parent',
      }, { onConflict: 'id' })
    }
  }

  return NextResponse.json({ received: true })
}
