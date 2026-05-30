import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const SLOT_MAP = [
  { id: 'boys_jun5',   date: '2026-06-05', hour: '6:00 PM', client: 'Elite Boys'  },
  { id: 'boys_jun12',  date: '2026-06-12', hour: '6:00 PM', client: 'Elite Boys'  },
  { id: 'boys_jun19',  date: '2026-06-19', hour: '6:00 PM', client: 'Elite Boys'  },
  { id: 'boys_jun26',  date: '2026-06-26', hour: '6:00 PM', client: 'Elite Boys'  },
  { id: 'girls_jun5',  date: '2026-06-05', hour: '7:00 PM', client: 'Elite Girls' },
  { id: 'girls_jun12', date: '2026-06-12', hour: '7:00 PM', client: 'Elite Girls' },
  { id: 'girls_jun19', date: '2026-06-19', hour: '7:00 PM', client: 'Elite Girls' },
  { id: 'girls_jun26', date: '2026-06-26', hour: '7:00 PM', client: 'Elite Girls' },
]

export async function GET() {
  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: slots } = await admin
    .from('bookings')
    .select('id, date, hour, client, capacity')
    .eq('is_group_slot', true)

  const slotIds = (slots || []).map(s => s.id)

  const { data: registrations } = slotIds.length > 0
    ? await admin
        .from('group_registrations')
        .select('slot_id')
        .in('slot_id', slotIds)
        .neq('status', 'cancelled')
    : { data: [] }

  const regCounts = (registrations || []).reduce((acc, r) => {
    acc[r.slot_id] = (acc[r.slot_id] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const result = SLOT_MAP.map(slot => {
    const dbSlot = (slots || []).find(
      s => s.date === slot.date && s.hour === slot.hour && s.client === slot.client
    )
    const registered = dbSlot ? (regCounts[dbSlot.id] || 0) : 0
    const capacity = dbSlot?.capacity || 12
    return { id: slot.id, registered, capacity, available: capacity - registered }
  })

  return NextResponse.json(result)
}
