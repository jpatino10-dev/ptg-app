'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import NewSessionModal from '@/components/NewSessionModal'
import {
  DndContext, DragOverlay, PointerSensor,
  useSensor, useSensors, useDroppable, useDraggable,
  type DragEndEvent, type DragStartEvent,
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
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const HOURS  = [
  '6:00 AM','6:30 AM','7:00 AM','7:30 AM','8:00 AM','8:30 AM',
  '9:00 AM','9:30 AM','10:00 AM','10:30 AM','11:00 AM','11:30 AM',
  '12:00 PM','12:30 PM','1:00 PM','1:30 PM','2:00 PM','2:30 PM',
  '3:00 PM','3:30 PM','4:00 PM','4:30 PM','5:00 PM','5:30 PM',
  '6:00 PM','6:30 PM','7:00 PM','7:30 PM','8:00 PM','8:30 PM',
]

type View = 'day' | 'week' | 'month'

type Booking = {
  id: string; date: string; hour: string; coach: string; type: string
  player_name: string | null; parent_name: string | null; client: string
  status: string; price: string | null; is_group_slot: boolean
  group_slot_id: string | null; capacity: number | null; duration_minutes: number | null
}

function fmt(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
function startOfWeek(d: Date) {
  const date = new Date(d); date.setDate(date.getDate() - date.getDay()); date.setHours(0,0,0,0); return date
}
function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

// ── Draggable session card ──────────────────────────────────────
function SessionCard({ booking, compact, onClick }: { booking: Booking; compact?: boolean; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: booking.id })
  const color = SESSION_COLORS[booking.type] || '#666'
  return (
    <div
      ref={setNodeRef} {...attributes} {...listeners}
      onClick={e => { e.stopPropagation(); onClick() }}
      style={{ transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.3 : 1 }}
      className="w-full text-left rounded-md text-xs font-semibold text-black cursor-grab active:cursor-grabbing touch-none overflow-hidden"
    >
      <div className="px-1.5 py-1" style={{ backgroundColor: color }}>
        {!compact && <div className="text-black/60">{booking.hour}</div>}
        <div className="truncate">{booking.is_group_slot ? 'Group' : (booking.player_name || booking.client)}</div>
      </div>
    </div>
  )
}

// ── Droppable cell ──────────────────────────────────────────────
function DroppableCell({ id, children, onClick, className }: {
  id: string; children: React.ReactNode; onClick?: () => void; className?: string
}) {
  const { setNodeRef, isOver } = useDroppable({ id })
  return (
    <div
      ref={setNodeRef}
      onClick={onClick}
      className={`${className} ${isOver ? 'ring-2 ring-[#cee800] bg-[#cee800]/5' : ''} transition-all`}
    >
      {children}
    </div>
  )
}

// ── Reschedule modal ────────────────────────────────────────────
function RescheduleModal({ booking, newDate, onConfirm, onCancel }: {
  booking: Booking; newDate: string
  onConfirm: (date: string, hour: string) => void; onCancel: () => void
}) {
  const [hour, setHour] = useState(booking.hour)
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={onCancel}>
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <h2 className="font-black text-[#cee800] mb-1">RESCHEDULE</h2>
        <p className="text-zinc-400 text-sm mb-4">
          Moving <span className="text-white font-semibold">{booking.player_name || booking.client}</span> to{' '}
          <span className="text-white font-semibold">{newDate}</span>
        </p>
        <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Time</label>
        <select value={hour} onChange={e => setHour(e.target.value)}
          className="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#cee800] mb-4">
          {HOURS.map(h => <option key={h}>{h}</option>)}
        </select>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 border border-zinc-700 rounded-xl text-sm hover:border-zinc-500 transition">Cancel</button>
          <button onClick={() => onConfirm(newDate, hour)}
            className="flex-1 py-2.5 bg-[#cee800] text-black font-black rounded-xl text-sm hover:bg-[#d4f030] transition">
            Confirm
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Day view ────────────────────────────────────────────────────
function DayView({ date, bookings, onSlotClick, onCardClick }: {
  date: Date; bookings: Booking[]; onSlotClick: (h: string) => void; onCardClick: (b: Booking) => void
}) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
      <div className="p-4 border-b border-zinc-800">
        <h2 className="font-black text-lg">{DAYS[date.getDay()]}, {MONTHS[date.getMonth()]} {date.getDate()}, {date.getFullYear()}</h2>
      </div>
      <div className="divide-y divide-zinc-800">
        {HOURS.map(h => {
          const slotBookings = bookings.filter(b => b.hour === h)
          return (
            <DroppableCell
              key={h} id={`${fmt(date)}__${h}`}
              onClick={() => onSlotClick(h)}
              className="flex gap-4 px-4 py-2 hover:bg-zinc-800/40 cursor-pointer min-h-[3rem]"
            >
              <span className="text-zinc-500 text-xs w-16 pt-0.5 shrink-0">{h}</span>
              <div className="flex-1 flex flex-wrap gap-1">
                {slotBookings.map(b => (
                  <SessionCard key={b.id} booking={b} compact onClick={() => onCardClick(b)} />
                ))}
              </div>
            </DroppableCell>
          )
        })}
      </div>
    </div>
  )
}

// ── Week view ───────────────────────────────────────────────────
function WeekView({ weekDays, bookings, todayStr, onDayClick, onCardClick }: {
  weekDays: Date[]; bookings: Booking[]; todayStr: string
  onDayClick: (d: Date) => void; onCardClick: (b: Booking) => void
}) {
  return (
    <div className="grid grid-cols-7 gap-2">
      {weekDays.map(day => {
        const dateStr = fmt(day)
        const isToday = dateStr === todayStr
        const dayBookings = bookings.filter(b => b.date === dateStr)
        return (
          <DroppableCell
            key={dateStr} id={dateStr}
            onClick={() => onDayClick(day)}
            className={`min-h-48 border rounded-xl p-2 cursor-pointer ${isToday ? 'border-[#cee800] bg-zinc-900' : 'border-zinc-800 bg-zinc-900 hover:border-zinc-600'}`}
          >
            <div className={`text-xs font-black mb-2 ${isToday ? 'text-[#cee800]' : 'text-zinc-400'}`}>
              <div>{DAYS[day.getDay()]}</div>
              <div className={`text-lg leading-none ${isToday ? 'text-[#cee800]' : 'text-white'}`}>{day.getDate()}</div>
            </div>
            <div className="space-y-1">
              {dayBookings.map(b => <SessionCard key={b.id} booking={b} onClick={() => onCardClick(b)} />)}
            </div>
          </DroppableCell>
        )
      })}
    </div>
  )
}

// ── Month view ──────────────────────────────────────────────────
function MonthView({ anchor, bookings, todayStr, onDayClick, onCardClick }: {
  anchor: Date; bookings: Booking[]; todayStr: string
  onDayClick: (d: Date) => void; onCardClick: (b: Booking) => void
}) {
  const first = startOfMonth(anchor)
  const startPad = first.getDay()
  const daysInMonth = new Date(anchor.getFullYear(), anchor.getMonth()+1, 0).getDate()
  const cells: (Date | null)[] = [
    ...Array(startPad).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(anchor.getFullYear(), anchor.getMonth(), i+1)),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  return (
    <div>
      <div className="grid grid-cols-7 mb-1">
        {DAYS.map(d => <div key={d} className="text-center text-xs text-zinc-500 font-semibold py-2">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (!day) return <div key={i} className="min-h-24 rounded-xl bg-zinc-950/50" />
          const dateStr = fmt(day)
          const isToday = dateStr === todayStr
          const dayBookings = bookings.filter(b => b.date === dateStr)
          return (
            <DroppableCell
              key={dateStr} id={dateStr}
              onClick={() => onDayClick(day)}
              className={`min-h-24 border rounded-xl p-1.5 cursor-pointer ${isToday ? 'border-[#cee800] bg-zinc-900' : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700'}`}
            >
              <div className={`text-xs font-black mb-1 ${isToday ? 'text-[#cee800]' : 'text-zinc-400'}`}>{day.getDate()}</div>
              <div className="space-y-0.5">
                {dayBookings.slice(0, 3).map(b => <SessionCard key={b.id} booking={b} compact onClick={() => onCardClick(b)} />)}
                {dayBookings.length > 3 && (
                  <div className="text-zinc-500 text-xs px-1">+{dayBookings.length - 3} more</div>
                )}
              </div>
            </DroppableCell>
          )
        })}
      </div>
    </div>
  )
}

// ── Session detail drawer ───────────────────────────────────────
function SessionDetail({ booking, onClose, onDelete }: { booking: Booking; onClose: () => void; onDelete: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-bold px-2 py-1 rounded-full text-black" style={{ backgroundColor: SESSION_COLORS[booking.type] || '#666' }}>
            {booking.type?.toUpperCase()}
          </span>
          <button onClick={onClose} className="text-zinc-500 hover:text-white">✕</button>
        </div>
        <div className="space-y-2 text-sm mb-6">
          {([
            ['Date',   booking.date],
            ['Time',   booking.hour],
            ['Coach',  booking.coach],
            ['Player', booking.player_name || booking.client],
            ['Parent', booking.parent_name],
            ['Duration', booking.duration_minutes ? (booking.duration_minutes >= 60 ? `${booking.duration_minutes/60} hr${booking.duration_minutes > 60 ? 's' : ''}` : `${booking.duration_minutes} min`) : null],
            ['Status', booking.status],
            ['Price',  booking.price ? '$'+booking.price : null],
          ] as [string,string|null][]).filter(([,v]) => v).map(([k,v]) => (
            <div key={k} className="flex justify-between">
              <span className="text-zinc-400">{k}</span>
              <span className="font-semibold">{v}</span>
            </div>
          ))}
        </div>
        <button onClick={onDelete} className="w-full py-2.5 border border-red-900 text-red-400 rounded-xl text-sm hover:bg-red-900/20 transition">
          Delete Session
        </button>
      </div>
    </div>
  )
}

// ── Main calendar ───────────────────────────────────────────────
export default function CalendarPage() {
  const [view, setView]                   = useState<View>('week')
  const [anchor, setAnchor]               = useState(new Date())
  const [bookings, setBookings]           = useState<Booking[]>([])
  const [loading, setLoading]             = useState(true)
  const [saving, setSaving]               = useState(false)
  const [selected, setSelected]           = useState<Booking | null>(null)
  const [showNewSession, setShowNewSession] = useState(false)
  const [newSessionDate, setNewSessionDate] = useState<string | undefined>()
  const [newSessionHour, setNewSessionHour] = useState<string | undefined>()
  const [draggedBooking, setDraggedBooking] = useState<Booking | null>(null)
  const [pendingReschedule, setPendingReschedule] = useState<{ booking: Booking; date: string } | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const todayStr = fmt(new Date())

  // Compute date range to fetch based on view
  const { from, to, weekDays } = (() => {
    if (view === 'day') {
      const d = fmt(anchor)
      return { from: d, to: d, weekDays: [] }
    }
    if (view === 'week') {
      const ws = startOfWeek(anchor)
      const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(ws); d.setDate(d.getDate()+i); return d })
      return { from: fmt(days[0]), to: fmt(days[6]), weekDays: days }
    }
    // month
    const first = startOfMonth(anchor)
    const last  = new Date(anchor.getFullYear(), anchor.getMonth()+1, 0)
    return { from: fmt(first), to: fmt(last), weekDays: [] }
  })()

  const loadBookings = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/sessions?from=${from}&to=${to}`)
      if (res.ok) setBookings(await res.json())
    } finally {
      setLoading(false)
    }
  }, [from, to])

  useEffect(() => { loadBookings() }, [loadBookings])

  function navigate(dir: 1 | -1) {
    setAnchor(d => {
      const n = new Date(d)
      if (view === 'day')   n.setDate(n.getDate() + dir)
      if (view === 'week')  n.setDate(n.getDate() + dir * 7)
      if (view === 'month') n.setMonth(n.getMonth() + dir)
      return n
    })
  }

  function goToday() { setAnchor(new Date()) }

  function headerLabel() {
    if (view === 'day')   return `${DAYS[anchor.getDay()]}, ${MONTHS_SHORT[anchor.getMonth()]} ${anchor.getDate()}, ${anchor.getFullYear()}`
    if (view === 'week')  return weekDays.length ? `${MONTHS_SHORT[weekDays[0].getMonth()]} ${weekDays[0].getDate()} – ${MONTHS_SHORT[weekDays[6].getMonth()]} ${weekDays[6].getDate()}, ${weekDays[6].getFullYear()}` : ''
    return `${MONTHS[anchor.getMonth()]} ${anchor.getFullYear()}`
  }

  function onDragStart(e: DragStartEvent) {
    setDraggedBooking(bookings.find(b => b.id === e.active.id) || null)
  }

  function onDragEnd(e: DragEndEvent) {
    setDraggedBooking(null)
    const { active, over } = e
    if (!over) return
    const booking = bookings.find(b => b.id === active.id)
    if (!booking) return
    // over.id is either "YYYY-MM-DD" (week/month) or "YYYY-MM-DD__HH:MM AM" (day)
    const parts = (over.id as string).split('__')
    const newDate = parts[0]
    const newHour = parts[1]
    if (newDate === booking.date && (!newHour || newHour === booking.hour)) return
    if (newHour) {
      // Day view drop — has explicit time, confirm directly
      setPendingReschedule({ booking, date: newDate })
    } else {
      setPendingReschedule({ booking, date: newDate })
    }
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

  function openNewSession(date?: string, hour?: string) {
    setNewSessionDate(date)
    setNewSessionHour(hour)
    setShowNewSession(true)
  }

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-6">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <Link href="/admin" className="text-zinc-500 hover:text-white text-sm">← Admin</Link>
          <h1 className="text-2xl font-black text-[#cee800] tracking-widest">CALENDAR</h1>

          {/* View switcher */}
          <div className="flex bg-zinc-900 border border-zinc-800 rounded-lg p-0.5 ml-2">
            {(['day','week','month'] as View[]).map(v => (
              <button key={v} onClick={() => setView(v)}
                className={`px-3 py-1 rounded-md text-sm font-semibold capitalize transition ${view === v ? 'bg-[#cee800] text-black' : 'text-zinc-400 hover:text-white'}`}>
                {v}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button onClick={() => openNewSession()}
              className="px-4 py-1.5 bg-[#cee800] text-black font-black text-sm rounded-lg hover:bg-[#d4f030] transition">
              + New Session
            </button>
            <button onClick={() => navigate(-1)} className="px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg hover:border-[#cee800] text-sm transition">←</button>
            <span className="text-sm font-semibold min-w-48 text-center">{headerLabel()}</span>
            <button onClick={() => navigate(1)}  className="px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg hover:border-[#cee800] text-sm transition">→</button>
            <button onClick={goToday} className="px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg hover:border-[#cee800] text-sm transition">Today</button>
          </div>
        </div>

        {/* Calendar body */}
        <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
          {view === 'day' && (
            <DayView
              date={anchor}
              bookings={bookings}
              onSlotClick={h => openNewSession(fmt(anchor), h)}
              onCardClick={setSelected}
            />
          )}
          {view === 'week' && (
            <WeekView
              weekDays={weekDays}
              bookings={bookings}
              todayStr={todayStr}
              onDayClick={d => openNewSession(fmt(d))}
              onCardClick={setSelected}
            />
          )}
          {view === 'month' && (
            <MonthView
              anchor={anchor}
              bookings={bookings}
              todayStr={todayStr}
              onDayClick={d => openNewSession(fmt(d))}
              onCardClick={setSelected}
            />
          )}

          <DragOverlay>
            {draggedBooking && (
              <div className="rounded-lg px-2 py-2 text-xs font-semibold text-black shadow-2xl rotate-2 w-28"
                style={{ backgroundColor: SESSION_COLORS[draggedBooking.type] || '#666' }}>
                <div>{draggedBooking.hour}</div>
                <div className="opacity-80 truncate">{draggedBooking.player_name || draggedBooking.client}</div>
              </div>
            )}
          </DragOverlay>
        </DndContext>

        {/* Legend */}
        <div className="flex gap-4 mt-4 flex-wrap items-center">
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

      {selected && (
        <SessionDetail
          booking={selected}
          onClose={() => setSelected(null)}
          onDelete={() => deleteSession(selected.id)}
        />
      )}

      {pendingReschedule && (
        <RescheduleModal
          booking={pendingReschedule.booking}
          newDate={pendingReschedule.date}
          onConfirm={confirmReschedule}
          onCancel={() => setPendingReschedule(null)}
        />
      )}

      {showNewSession && (
        <NewSessionModal
          defaultDate={newSessionDate}
          defaultHour={newSessionHour}
          onClose={() => setShowNewSession(false)}
          onCreated={() => { setShowNewSession(false); loadBookings() }}
        />
      )}
    </div>
  )
}
