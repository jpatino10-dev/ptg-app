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
  if (!user) return false
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  return profile?.role === 'admin'
}

// PATCH — toggle active status
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await verifyAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { active } = await req.json()

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

  try {
    const updated = await stripe.promotionCodes.update(id, { active })
    return NextResponse.json({ ok: true, active: updated.active })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update code'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
