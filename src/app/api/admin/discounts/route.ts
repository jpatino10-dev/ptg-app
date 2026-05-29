import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
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
  return profile?.role === 'admin'
}

// GET — list all promotion codes with their coupon details
export async function GET() {
  if (!await verifyAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

  const promoCodes = await stripe.promotionCodes.list({
    limit: 100,
    expand: ['data.promotion.coupon'],
  })

  const formatted = promoCodes.data.map(pc => {
    const coupon = pc.promotion?.coupon as Stripe.Coupon | null
    return {
      id: pc.id,
      code: pc.code,
      active: pc.active,
      discount: coupon?.percent_off
        ? `${coupon.percent_off}% off`
        : coupon?.amount_off
          ? `$${(coupon.amount_off / 100).toFixed(0)} off`
          : '—',
      percent_off: coupon?.percent_off ?? null,
      amount_off: coupon?.amount_off ?? null,
      times_redeemed: pc.times_redeemed,
      max_redemptions: pc.max_redemptions,
      expires_at: pc.expires_at,
      created: pc.created,
    }
  })

  return NextResponse.json(formatted)
}

// POST — create a coupon + promotion code
export async function POST(req: NextRequest) {
  if (!await verifyAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
  const { code, discount_type, discount_amount, max_redemptions, expires_at } = await req.json()

  if (!code || !discount_type || !discount_amount) {
    return NextResponse.json({ error: 'Code, type, and amount are required' }, { status: 400 })
  }

  // Create the coupon
  const couponParams: Stripe.CouponCreateParams = {
    duration: 'once',
    name: code,
    ...(discount_type === 'percent'
      ? { percent_off: Number(discount_amount) }
      : { amount_off: Math.round(Number(discount_amount) * 100), currency: 'usd' }),
  }

  const coupon = await stripe.coupons.create(couponParams)

  // Create the promotion code (v22 API: coupon nested under promotion)
  const promoParams: Stripe.PromotionCodeCreateParams = {
    promotion: { type: 'coupon', coupon: coupon.id },
    code: code.toUpperCase().replace(/\s+/g, ''),
    ...(max_redemptions ? { max_redemptions: Number(max_redemptions) } : {}),
    ...(expires_at ? { expires_at: Math.floor(new Date(expires_at).getTime() / 1000) } : {}),
  }

  try {
    const promoCode = await stripe.promotionCodes.create(promoParams)
    return NextResponse.json({ ok: true, id: promoCode.id, code: promoCode.code })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create code'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
