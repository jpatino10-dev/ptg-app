import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function CoachDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-black text-lime-400 tracking-widest">COACH PORTAL</h1>
          <span className="text-zinc-400 text-sm">{profile?.full_name || user.email}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { title: 'My Schedule', desc: 'Upcoming sessions and availability' },
            { title: 'My Players', desc: 'Player roster and notes' },
            { title: 'Payments', desc: 'Your payment history from PTG' },
          ].map(({ title, desc }) => (
            <div key={title} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 cursor-pointer hover:border-lime-400 transition">
              <h3 className="font-black text-lg">{title}</h3>
              <p className="text-zinc-400 text-sm mt-1">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
