import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [{ data: profileData }, { data: coachData }] = await Promise.all([
    supabase.from('profiles').select('full_name').in('role', ['coach', 'director', 'admin']).order('full_name'),
    supabase.from('coaches').select('name').order('name'),
  ])

  const fromProfiles = (profileData || []).map(p => p.full_name).filter(Boolean) as string[]
  const fromTable   = (coachData   || []).map(c => c.name).filter(Boolean) as string[]

  // Merge and deduplicate (profile accounts win for display, but names match)
  const merged = [...new Set([...fromProfiles, ...fromTable])].sort()
  return NextResponse.json(merged)
}
