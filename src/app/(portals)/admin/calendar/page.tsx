'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

const SESSION_COLORS: Record<string, string> = {
  individual: '#cee800',
  semi:       '#00e5ff',
  group:      '#00e676',
  camp:       '#b388ff',
  duo:        '#ff6b35',
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function startOfWeek(d: Date) {
  const date = new Date(d)
  date.setDate(date.getDate() - date.getDay())
  date.setHours(0, 0, 0, 0)
  return date
}

function fmt(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

type Booking = {
  id: string
  date: string
  hour: string
  coach: string
  type: string
  player_name: string | null
  parent_name: string | null
  client: string
  status: string
  price: string | null
  is_group_slot: boolean
  group_slot_id: string | null
  capacity: number | null
}

export default function CalendarPage() {
  const supabase = createClient()
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()))
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Booking | null>(null)

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + i)
    return d
  })

  useEffect(() => {
    async function load() {
      setLoading(true)
      const from = fmt(weekDays[0])
      const to   = fmt(weekDays[6])
      const { data } = await supabase
        .from('bookings')
        .select('id, date, hour, coach, type, player_name, parent_name, client, status, price, is_group_slot, group_slot_id, capacity')
        .gte('date', from)
        .lte('date', to)
        .order('date', { ascending: true })
      setBookings(data || [])
      setLoading(false)
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStart])

  function prevWeek() {
    setWeekStart(d => { const n = new Date(d); n.setDate(n.getDate() - 7); return n })
  }
  function nextWeek() {
    setWeekStart(d => { const n = new Date(d); n.setDate(n.getDate() + 7); return n })
  }

  const bookingsForDay = (date: Date) =>
    bookings.filter(b => b.date === fmt(date))

  const todayStr = fmt(new Date())

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="text-zinc-500 hover:text-white text-sm">← Admin</Link>
            <h1 className="text-2xl font-black text-[#cee800] tracking-widest">CALENDAR</h1>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={prevWeek} className="px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg hover:border-[#cee800] text-sm transition">←</button>
            <span className="text-sm font-semibold w-40 text-center">
              {MONTHS[weekDays[0].getMonth()]} {weekDays[0].getDate()} – {MONTHS[weekDays[6].getMonth()]} {weekDays[6].getDate()}, {weekDays[6].getFullYear()}
            </span>
            <button onClick={nextWeek} className="px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg hover:border-[#cee800] text-sm transition">→</button>
            <button onClick={() => setWeekStart(startOfWeek(new Date()))} className="px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg hover:border-[#cee800] text-sm transition">Today</button>
          </div>
        </div>

        {/* Week grid */}
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map(day => {
            const isToday = fmt(day) === todayStr
            const dayBookings = bookingsForDay(day)
            return (
              <div key={fmt(day)} className={`min-h-48 bg-zinc-900 border rounded-xl p-2 ${isToday ? 'border-[#cee800]' : 'border-zinc-800'}`}>
                <div className={`text-xs font-black mb-2 ${isToday ? 'text-[#cee800]' : 'text-zinc-400'}`}>
                  <div>{DAYS[day.getDay()]}</div>
                  <div className={`text-lg leading-none ${isToday ? 'text-[#cee800]' : 'text-white'}`}>{day.getDate()}</div>
                </div>

                {loading && isToday && <div className="text-zinc-600 text-xs">Loading...</div>}

                <div className="space-y-1">
                  {dayBookings.map(b => (
                    <button
                      key={b.id}
                      onClick={() => setSelected(b)}
                      className="w-full text-left rounded-lg px-2 py-1.5 text-xs font-semibold text-black truncate transition hover:opacity-80"
                      style={{ backgroundColor: SESSION_COLORS[b.type] || '#666' }}
                    >
                      <div className="truncate">{b.hour}</div>
                      <div className="truncate opacity-80">{b.is_group_slot ? 'Group' : (b.player_name || b.client)}</div>
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {/* Legend */}
        <div className="flex gap-4 mt-4 flex-wrap">
          {Object.entries(SESSION_COLORS).map(([type, color]) => (
            <div key={type} className="flex items-center gap-1.5 text-xs text-zinc-400">
              <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: color }} />
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </div>
          ))}
        </div>
      </div>

      {/* Detail drawer */}
      {selected && (
        <div className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-50 p-4" onClick={() => setSelected(null)}>
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold px-2 py-1 rounded-full text-black" style={{ backgroundColor: SESSION_COLORS[selected.type] || '#666' }}>
                {selected.type?.toUpperCase()}
              </span>
              <button onClick={() => setSelected(null)} className="text-zinc-500 hover:text-white">✕</button>
            </div>
            <div className="space-y-2 text-sm">
              {[
                ['Date',    selected.date],
                ['Time',    selected.hour],
                ['Coach',   selected.coach],
                ['Player',  selected.player_name || selected.client],
                ['Parent',  selected.parent_name],
                ['Status',  selected.status],
                ['Price',   selected.price ? '$' + selected.price : null],
              ].filter(([, v]) => v).map(([k, v]) => (
                <div key={k as string} className="flex justify-between">
                  <span className="text-zinc-400">{k}</span>
                  <span className="font-semibold">{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
