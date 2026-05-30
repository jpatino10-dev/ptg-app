import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

const SHIRT_PRICE = 2500 // $25.00

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { name, email, phone, size } = body

  if (!name || !email || !size) {
    return NextResponse.json({ error: 'Name, email, and size are required' }, { status: 400 })
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://app.trainatptg.com'
  const fee = Math.round(SHIRT_PRICE * 0.035)

  let session
  try {
    session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: SHIRT_PRICE,
            product_data: { name: `PTG Shirt — Size ${size}` },
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
      metadata: { name, email, phone: phone || '', size, type: 'shirt' },
      success_url: `${siteUrl}/order-shirt/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/order-shirt?cancelled=true`,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Stripe error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }

  return NextResponse.json({ url: session.url })
}
