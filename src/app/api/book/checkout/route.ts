import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

const PRICES: Record<string, { amount: number; label: string }> = {
  individual:   { amount: 10500, label: 'Individual Session (1hr)' },
  semi:         { amount: 7500,  label: 'Semi-Private Session (1hr)' },
  duo:          { amount: 8500,  label: 'Duo Session (1hr)' },
  group_dropin: { amount: 5000,  label: 'Group Training – Drop-In' },
  group_month:  { amount: 15000, label: 'Group Training – Monthly Pass' },
}

export async function POST(req: NextRequest) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
  const body = await req.json()
  const { session_type, player_name, parent_name, email, phone, age_group, notes, preferred_date } = body

  const priceInfo = PRICES[session_type]
  if (!priceInfo) return NextResponse.json({ error: 'Invalid session type' }, { status: 400 })

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

  // Convenience fee (3.5%)
  const fee = Math.round(priceInfo.amount * 0.035)
  const total = priceInfo.amount + fee

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'payment',
    line_items: [
      {
        price_data: {
          currency: 'usd',
          unit_amount: priceInfo.amount,
          product_data: { name: priceInfo.label },
        },
        quantity: 1,
      },
      {
        price_data: {
          currency: 'usd',
          unit_amount: fee,
          product_data: { name: 'Processing Fee (3.5%)' },
        },
        quantity: 1,
      },
    ],
    customer_email: email,
    metadata: {
      session_type,
      player_name,
      parent_name,
      email,
      phone: phone || '',
      age_group: age_group || '',
      notes: notes || '',
      preferred_date: preferred_date || '',
    },
    success_url: `${siteUrl}/book/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl}/book?cancelled=true`,
  })

  return NextResponse.json({ url: session.url })
}
