import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { sendGroupConfirmation, sendIndividualConfirmation } from '@/lib/emails'

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

  // Mapping from static booking IDs used in the book page to slot attributes
  const SLOT_MAP: Record<string, { date: string; hour: string; client: string }> = {
    boys_jun5:   { date: '2026-06-05', hour: '6:00 PM', client: 'Elite Boys'  },
    boys_jun12:  { date: '2026-06-12', hour: '6:00 PM', client: 'Elite Boys'  },
    boys_jun19:  { date: '2026-06-19', hour: '6:00 PM', client: 'Elite Boys'  },
    boys_jun26:  { date: '2026-06-26', hour: '6:00 PM', client: 'Elite Boys'  },
    girls_jun5:  { date: '2026-06-05', hour: '7:00 PM', client: 'Elite Girls' },
    girls_jun12: { date: '2026-06-12', hour: '7:00 PM', client: 'Elite Girls' },
    girls_jun19: { date: '2026-06-19', hour: '7:00 PM', client: 'Elite Girls' },
    girls_jun26: { date: '2026-06-26', hour: '7:00 PM', client: 'Elite Girls' },
  }

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

  // Create group registrations for each selected slot (with capacity check)
  const confirmedSessions: { group: string; date: string; time: string }[] = []
  if (meta.selected_slot_ids) {
    const selectedIds: string[] = JSON.parse(meta.selected_slot_ids)
    for (const staticId of selectedIds) {
      const slotAttrs = SLOT_MAP[staticId]
      if (!slotAttrs) continue
      const { data: slot } = await admin
        .from('bookings')
        .select('id, capacity')
        .eq('date', slotAttrs.date)
        .eq('hour', slotAttrs.hour)
        .eq('client', slotAttrs.client)
        .eq('is_group_slot', true)
        .maybeSingle()
      if (!slot) continue

      // Check capacity before registering
      const { count } = await admin
        .from('group_registrations')
        .select('*', { count: 'exact', head: true })
        .eq('slot_id', slot.id)
        .neq('status', 'cancelled')

      if ((count ?? 0) >= (slot.capacity || 12)) continue // slot full, skip

      await admin.from('group_registrations').insert({
        slot_id: slot.id,
        player_name: meta.player_name,
        parent_name: meta.parent_name || null,
        email: meta.email || null,
        phone: meta.phone || null,
        stripe_session_id: session.id,
        status: 'registered',
      })

      const dateLabel = new Date(slotAttrs.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
      const hourNum = parseInt(slotAttrs.hour)
      confirmedSessions.push({
        group: slotAttrs.client,
        date: dateLabel,
        time: slotAttrs.hour === '6:00 PM' ? '6:00 PM – 7:00 PM' : '7:00 PM – 8:00 PM',
      })
    }
  }

  // Send confirmation email
  const totalPaid = `$${((session.amount_total ?? 0) / 100).toFixed(2)}`
  if (meta.email) {
    if (confirmedSessions.length > 0) {
      const isMonthly = meta.session_type === 'group_month'
      await sendGroupConfirmation({
        to: meta.email,
        parentName: meta.parent_name,
        playerName: meta.player_name,
        sessions: confirmedSessions,
        planLabel: isMonthly ? 'Full Series (All 4 sessions)' : 'Drop-In',
        totalPaid,
      })
    } else if (['individual', 'semi', 'duo'].includes(meta.session_type)) {
      await sendIndividualConfirmation({
        to: meta.email,
        parentName: meta.parent_name,
        playerName: meta.player_name,
        sessionType: meta.session_type,
        preferredDate: meta.preferred_date || '',
        totalPaid,
      })
    }
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
