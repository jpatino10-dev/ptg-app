'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import NewSessionModal from '@/components/NewSessionModal'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'

const SESSION_COLORS: Record<string, string> = {
  individual: '#cee800',
  semi:       '#00e5ff',
  group:      '#00e676',
  camp:       '#b388ff',
  duo:        '#ff6b35',
}

const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const HOURS  = [
  '6:00 AM','6:30 AM','7:00 AM','7:30 AM','8:00 AM','8:30 AM',
  '9:00 AM','9:30 AM','10:00 AM','10:30 AM','11:00 AM','11:30 AM',
  '12:00 PM','12:30 PM','1:00 PM','1:30 PM','2:00 PM','2:30 PM',
  '3:00 PM','3:30 PM','4:00 PM','4:30 PM','5:00 PM','5:30 PM',
  '6:00 PM','6:30 PM','7:00 PM','7:30 PM','8:00 PM','8:30 PM',
]

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

// ── Draggable session card ──────────────────────────────────────
function SessionCard({ booking, onClick }: { booking: Booking; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: booking.id })
  const color = SESSION_COLORS[booking.type] || '#666'
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={e => { e.stopPropagation(); onClick() }}
      style={{ transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.3 : 1 }}
      className="w-full text-left rounded-lg px-2 py-1.5 text-xs font-semibold text-black truncate cursor-grab active:cursor-grabbing touch-none"
    >
      <div className="truncate rounded px-1" style={{ backgroundColor: color }}>
        {booking.hour}
      </div>
      <div className="truncate text-zinc-300 px-1 mt-0.5">
        {booking.is_group_slot ? 'Group' : (booking.player_name || booking.client)}
      </div>
    </div>
  )
}

// ── Droppable day cell ──────────────────────────────────────────
function DayCell({
  day,
  bookings,
  isToday,
  isOver: externalIsOver,
  onDayClick,
  onCardClick,
}: {
  day: Date
  bookings: Booking[]
  isToday: boolean
  isOver?: boolean
  onDayClick: () => void
  onCardClick: (b: Booking) => void
}) {
  const dateStr = fmt(day)
  const { setNodeRef, isOver } = useDroppable({ id: dateStr })
  const over = isOver || externalIsOver

  return (
    <div
      ref={setNodeRef}
      onClick={onDayClick}
      className={`min-h-48 border rounded-xl p-2 transition-colors cursor-pointer ${
        over
          ? 'bg-[#cee800]/10 border-[#cee800]'
          : isToday
            ? 'bg-zinc-900 border-[#cee800]'
            : 'bg-zinc-900 border-zinc-800 hover:border-zinc-600'
      }`}
    >
      <div className={`text-xs font-black mb-2 ${isToday ? 'text-[#cee800]' : 'text-zinc-400'}`}>
        <div>{DAYS[day.getDay()]}</div>
        <div className={`text-lg leading-none ${isToday ? 'text-[#cee800]' : 'text-white'}`}>{day.getDate()}</div>
      </div>
      <div className="space-y-1">
        {bookings.map(b => (
          <SessionCard key={b.id} booking={b} onClick={() => onCardClick(b)} />
        ))}
      </div>
      {over && bookings.length === 0 && (
        <div className="text-[#cee800]/50 text-xs text-center mt-4">Drop here</div>
      )}
    </div>
  )
}

// ── Time picker after drop ──────────────────────────────────────
function RescheduleModal({
  booking,
  newDate,
  onConfirm,
  onCancel,
}: {
  booking: Booking
  newDate: string
  onConfirm: (date: string, hour: string) => void
  onCancel: () => void
}) {
  const [hour, setHour] = useState(booking.hour)
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={onCancel}>
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <h2 className="font-black text-[#cee800] mb-1">RESCHEDULE</h2>
        <p className="text-zinc-400 text-sm mb-4">
          Moving <span className="text-white font-semibold">{booking.player_name || booking.client}</span> to <span className="text-white font-semibold">{newDate}</span>
        </p>
        <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Time</label>
        <select
          value={hour}
          onChange={e => setHour(e.target.value)}
          className="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#cee800] mb-4"
        >
          {HOURS.map(h => <option key={h}>{h}</option>)}
        </select>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 border border-zinc-700 rounded-xl text-sm hover:border-zinc-500 transition">Cancel</button>
          <button
            onClick={() => onConfirm(newDate, hour)}
            className="flex-1 py-2.5 bg-[#cee800] text-black font-black rounded-xl text-sm hover:bg-[#d4f030] transition"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main calendar ───────────────────────────────────────────────
export default function CalendarPage() {
  const supabase = createClient()
  const [weekStart, setWeekStart]       = useState(() => startOfWeek(new Date()))
  const [bookings, setBookings]         = useState<Booking[]>([])
  const [loading, setLoading]           = useState(true)
  const [selected, setSelected]         = useState<Booking | null>(null)
  const [showNewSession, setShowNewSession] = useState(false)
  const [newSessionDate, setNewSessionDate] = useState<string | undefined>()
  const [draggedBooking, setDraggedBooking] = useState<Booking | null>(null)
  const [pendingReschedule, setPendingReschedule] = useState<{ booking: Booking; date: string } | null>(null)
  const [saving, setSaving]             = useState(false)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + i)
    return d
  })

  const loadBookings = useCallback(async () => {
    setLoading(true)
    const from = fmt(weekDays[0])
    const to   = fmt(weekDays[6])
    const { data } = await supabase
      .from('bookings')
      .select('id,date,hour,coach,type,player_name,parent_name,client,status,price,is_group_slot,group_slot_id,capacity')
      .gte('date', from)
      .lte('date', to)
      .order('hour')
    setBookings(data || [])
    setLoading(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStart])

  useEffect(() => { loadBookings() }, [loadBookings])

  function onDragStart(e: DragStartEvent) {
    const b = bookings.find(b => b.id === e.active.id)
    if (b) setDraggedBooking(b)
  }

  function onDragEnd(e: DragEndEvent) {
    setDraggedBooking(null)
    const { active, over } = e
    if (!over) return
    const booking = bookings.find(b => b.id === active.id)
    if (!booking) return
    const newDate = over.id as string
    if (newDate === booking.date) return
    setPendingReschedule({ booking, date: newDate })
  }

  async function confirmReschedule(date: string, hour: string) {
    if (!pendingReschedule) return
    setSaving(true)
    await fetch(`/api/sessions/${pendingReschedule.booking.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, hour }),
    })
    setSaving(false)
    setPendingReschedule(null)
    loadBookings()
  }

  async function deleteSession(id: string) {
    await fetch(`/api/sessions/${id}`, { method: 'DELETE' })
    setSelected(null)
    loadBookings()
  }

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
            <button
              onClick={() => { setNewSessionDate(undefined); setShowNewSession(true) }}
              className="px-4 py-1.5 bg-[#cee800] text-black font-black text-sm rounded-lg hover:bg-[#d4f030] transition"
            >
              + New Session
            </button>
            <button onClick={() => setWeekStart(d => { const n = new Date(d); n.setDate(n.getDate()-7); return n })} className="px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg hover:border-[#cee800] text-sm transition">←</button>
            <span className="text-sm font-semibold w-44 text-center">
              {MONTHS[weekDays[0].getMonth()]} {weekDays[0].getDate()} – {MONTHS[weekDays[6].getMonth()]} {weekDays[6].getDate()}, {weekDays[6].getFullYear()}
            </span>
            <button onClick={() => setWeekStart(d => { const n = new Date(d); n.setDate(n.getDate()+7); return n })} className="px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg hover:border-[#cee800] text-sm transition">→</button>
            <button onClick={() => setWeekStart(startOfWeek(new Date()))} className="px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg hover:border-[#cee800] text-sm transition">Today</button>
          </div>
        </div>

        {/* Week grid */}
        <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map(day => (
              <DayCell
                key={fmt(day)}
                day={day}
                bookings={bookings.filter(b => b.date === fmt(day))}
                isToday={fmt(day) === todayStr}
                onDayClick={() => { setNewSessionDate(fmt(day)); setShowNewSession(true) }}
                onCardClick={b => setSelected(b)}
              />
            ))}
          </div>

          <DragOverlay>
            {draggedBooking && (
              <div
                className="rounded-lg px-2 py-2 text-xs font-semibold text-black shadow-2xl rotate-2 w-28"
                style={{ backgroundColor: SESSION_COLORS[draggedBooking.type] || '#666' }}
              >
                <div>{draggedBooking.hour}</div>
                <div className="opacity-80 truncate">{draggedBooking.player_name || draggedBooking.client}</div>
              </div>
            )}
          </DragOverlay>
        </DndContext>

        {/* Legend */}
        <div className="flex gap-4 mt-4 flex-wrap">
          {Object.entries(SESSION_COLORS).map(([type, color]) => (
            <div key={type} className="flex items-center gap-1.5 text-xs text-zinc-400">
              <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: color }} />
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </div>
          ))}
          {loading && <span className="text-zinc-600 text-xs ml-auto">Loading...</span>}
          {saving  && <span className="text-[#cee800] text-xs ml-auto">Saving...</span>}
        </div>
      </div>

      {/* Session detail */}
      {selected && (
        <div className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-50 p-4" onClick={() => setSelected(null)}>
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold px-2 py-1 rounded-full text-black" style={{ backgroundColor: SESSION_COLORS[selected.type] || '#666' }}>
                {selected.type?.toUpperCase()}
              </span>
              <button onClick={() => setSelected(null)} className="text-zinc-500 hover:text-white">✕</button>
            </div>
            <div className="space-y-2 text-sm mb-6">
              {([
                ['Date',   selected.date],
                ['Time',   selected.hour],
                ['Coach',  selected.coach],
                ['Player', selected.player_name || selected.client],
                ['Parent', selected.parent_name],
                ['Status', selected.status],
                ['Price',  selected.price ? '$'+selected.price : null],
              ] as [string, string | null][]).filter(([,v]) => v).map(([k,v]) => (
                <div key={k} className="flex justify-between">
                  <span className="text-zinc-400">{k}</span>
                  <span className="font-semibold">{v}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => deleteSession(selected.id)}
              className="w-full py-2.5 border border-red-900 text-red-400 rounded-xl text-sm hover:bg-red-900/20 transition"
            >
              Delete Session
            </button>
          </div>
        </div>
      )}

      {/* Reschedule confirm */}
      {pendingReschedule && (
        <RescheduleModal
          booking={pendingReschedule.booking}
          newDate={pendingReschedule.date}
          onConfirm={confirmReschedule}
          onCancel={() => setPendingReschedule(null)}
        />
      )}

      {/* New session */}
      {showNewSession && (
        <NewSessionModal
          defaultDate={newSessionDate}
          onClose={() => setShowNewSession(false)}
          onCreated={() => { setShowNewSession(false); loadBookings() }}
        />
      )}
    </div>
  )
}
