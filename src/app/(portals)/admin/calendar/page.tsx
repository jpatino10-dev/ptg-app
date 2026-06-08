'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import NewSessionModal from '@/components/NewSessionModal'
import EditSessionModal from '@/components/EditSessionModal'
import NewGroupSessionModal from '@/components/NewGroupSessionModal'
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
const DAYS         = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
const MONTHS       = ['January','February','March','April','May','June','July','August','September','October','November','December']
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const HOURS = [
  '6:00 AM','6:30 AM','7:00 AM','7:30 AM','8:00 AM','8:30 AM',
  '9:00 AM','9:30 AM','10:00 AM','10:30 AM','11:00 AM','11:30 AM',
  '12:00 PM','12:30 PM','1:00 PM','1:30 PM','2:00 PM','2:30 PM',
  '3:00 PM','3:30 PM','4:00 PM','4:30 PM','5:00 PM','5:30 PM',
  '6:00 PM','6:30 PM','7:00 PM','7:30 PM','8:00 PM','8:30 PM',
]

// Grid constants — 60px per hour
const PX_PER_HOUR = 64
const GRID_START  = 6   // 6 AM

type View = 'day' | 'week' | 'month'

type Booking = {
  id: string; date: string; hour: string; coach: string; type: string
  player_name: string | null; parent_name: string | null; client: string
  status: string; price: string | null; is_group_slot: boolean
  group_slot_id: string | null; capacity: number | null
  duration_minutes: number | null; notes: string | null; location: string | null
  coach_pay: number | null; director_pay: number | null
}

function fmt(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
function startOfWeek(d: Date) {
  const date = new Date(d); date.setDate(date.getDate() - date.getDay()); date.setHours(0,0,0,0); return date
}
function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1) }

function parseHourToDecimal(hour: string): number {
  const [time, period] = hour.split(' ')
  const [h, m] = time.split(':').map(Number)
  let hours = h
  if (period === 'PM' && h !== 12) hours += 12
  if (period === 'AM' && h === 12) hours = 0
  return hours + m / 60
}

// ── Draggable session card (compact, for month/week-grid) ───────
function SessionCard({ booking, style, onClick }: {
  booking: Booking; style?: React.CSSProperties; onClick: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: booking.id })
  const color = SESSION_COLORS[booking.type] || '#666'
  return (
    <div
      ref={setNodeRef} {...attributes} {...listeners}
      onClick={e => { e.stopPropagation(); onClick() }}
      style={{ ...style, transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.3 : 1 }}
      className="rounded-md text-xs font-semibold text-black cursor-grab active:cursor-grabbing touch-none overflow-hidden select-none"
    >
      <div className="px-1.5 py-1 h-full" style={{ backgroundColor: color }}>
        <div className="truncate">{booking.player_name || booking.client}</div>
        <div className="text-black/60 truncate">{booking.coach}</div>
      </div>
    </div>
  )
}

// ── Time-grid session block (week/day views) ────────────────────
function TimeBlock({ booking, column, totalCols, onClick }: {
  booking: Booking; column: number; totalCols: number; onClick: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: booking.id })
  const color = SESSION_COLORS[booking.type] || '#666'
  const top    = (parseHourToDecimal(booking.hour) - GRID_START) * PX_PER_HOUR
  const height = Math.max(((booking.duration_minutes || 60) / 60) * PX_PER_HOUR, 24)
  const width  = `calc(${100 / totalCols}% - 4px)`
  const left   = `calc(${(column / totalCols) * 100}% + 2px)`

  return (
    <div
      ref={setNodeRef} {...attributes} {...listeners}
      onClick={e => { e.stopPropagation(); onClick() }}
      style={{
        top, height, width, left,
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.4 : 1,
        backgroundColor: color,
        position: 'absolute',
      }}
      className="rounded-md px-1.5 py-1 text-black text-xs font-semibold cursor-grab active:cursor-grabbing touch-none overflow-hidden z-10 shadow-md select-none"
    >
      <div className="font-black truncate">{booking.player_name || booking.client}</div>
      {height > 36 && <div className="text-black/70 truncate">{booking.hour} · {booking.coach}</div>}
    </div>
  )
}

// ── Droppable cell ──────────────────────────────────────────────
function DroppableCell({ id, children, onClick, className }: {
  id: string; children: React.ReactNode; onClick?: () => void; className?: string
}) {
  const { setNodeRef, isOver } = useDroppable({ id })
  return (
    <div ref={setNodeRef} onClick={onClick}
      className={`${className} ${isOver ? 'ring-2 ring-inset ring-[#cee800] bg-[#cee800]/5' : ''} transition-all`}>
      {children}
    </div>
  )
}

// ── Time gutter ─────────────────────────────────────────────────
function TimeGutter() {
  return (
    <div className="w-14 shrink-0 relative" style={{ height: (21 - GRID_START) * PX_PER_HOUR }}>
      {Array.from({ length: 21 - GRID_START }, (_, i) => {
        const h = GRID_START + i
        const label = h === 12 ? '12 PM' : h < 12 ? `${h} AM` : `${h-12} PM`
        return (
          <div key={h} className="absolute text-zinc-600 text-xs text-right pr-2 w-full" style={{ top: i * PX_PER_HOUR - 8 }}>
            {label}
          </div>
        )
      })}
    </div>
  )
}

// ── Week view (time grid) ───────────────────────────────────────
function WeekView({ weekDays, bookings, todayStr, onDayClick, onCardClick }: {
  weekDays: Date[]; bookings: Booking[]; todayStr: string
  onDayClick: (d: Date, hour?: string) => void; onCardClick: (b: Booking) => void
}) {
  const gridHeight = (21 - GRID_START) * PX_PER_HOUR

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
      {/* Day headers */}
      <div className="flex border-b border-zinc-800">
        <div className="w-14 shrink-0" />
        {weekDays.map(day => {
          const isToday = fmt(day) === todayStr
          return (
            <div key={fmt(day)} className="flex-1 text-center py-2 border-l border-zinc-800">
              <div className={`text-xs font-semibold ${isToday ? 'text-[#cee800]' : 'text-zinc-400'}`}>{DAYS[day.getDay()]}</div>
              <div className={`text-lg font-black leading-tight ${isToday ? 'text-[#cee800]' : 'text-white'}`}>{day.getDate()}</div>
            </div>
          )
        })}
      </div>

      {/* Time grid */}
      <div className="flex overflow-y-auto max-h-[70vh]">
        <TimeGutter />
        <div className="flex flex-1 relative">
          {weekDays.map(day => {
            const dateStr = fmt(day)
            const dayBookings = bookings.filter(b => b.date === dateStr)

            // Simple overlap: group by hour proximity
            const placed: { booking: Booking; col: number; total: number }[] = []
            dayBookings.forEach(b => {
              const bStart = parseHourToDecimal(b.hour)
              const bEnd   = bStart + (b.duration_minutes || 60) / 60
              const overlapping = placed.filter(p => {
                const pStart = parseHourToDecimal(p.booking.hour)
                const pEnd   = pStart + (p.booking.duration_minutes || 60) / 60
                return bStart < pEnd && bEnd > pStart
              })
              const usedCols = overlapping.map(p => p.col)
              const col = [0,1,2,3].find(c => !usedCols.includes(c)) ?? 0
              const total = Math.max(overlapping.length + 1, overlapping[0]?.total ?? 1)
              overlapping.forEach(p => { p.total = total })
              placed.push({ booking: b, col, total })
            })

            return (
              <DroppableCell
                key={dateStr} id={dateStr}
                onClick={() => onDayClick(day)}
                className="flex-1 border-l border-zinc-800 relative cursor-pointer"
              >
                <div style={{ height: gridHeight, position: 'relative' }}>
                  {/* Hour lines */}
                  {Array.from({ length: 21 - GRID_START }, (_, i) => (
                    <div key={i} className="absolute w-full border-t border-zinc-800/60" style={{ top: i * PX_PER_HOUR }} />
                  ))}
                  {/* Session blocks */}
                  {placed.map(({ booking, col, total }) => (
                    <TimeBlock key={booking.id} booking={booking} column={col} totalCols={total} onClick={() => onCardClick(booking)} />
                  ))}
                </div>
              </DroppableCell>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Day view ────────────────────────────────────────────────────
function DayView({ date, bookings, onSlotClick, onCardClick }: {
  date: Date; bookings: Booking[]; onSlotClick: (h: string) => void; onCardClick: (b: Booking) => void
}) {
  const gridHeight = (21 - GRID_START) * PX_PER_HOUR
  const placed: { booking: Booking; col: number; total: number }[] = []
  bookings.forEach(b => {
    const bStart = parseHourToDecimal(b.hour)
    const bEnd   = bStart + (b.duration_minutes || 60) / 60
    const overlapping = placed.filter(p => {
      const pStart = parseHourToDecimal(p.booking.hour)
      const pEnd   = pStart + (p.booking.duration_minutes || 60) / 60
      return bStart < pEnd && bEnd > pStart
    })
    const usedCols = overlapping.map(p => p.col)
    const col = [0,1,2,3].find(c => !usedCols.includes(c)) ?? 0
    const total = Math.max(overlapping.length + 1, overlapping[0]?.total ?? 1)
    overlapping.forEach(p => { p.total = total })
    placed.push({ booking: b, col, total })
  })

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
      <div className="p-4 border-b border-zinc-800">
        <h2 className="font-black text-lg">{DAYS[date.getDay()]}, {MONTHS[date.getMonth()]} {date.getDate()}, {date.getFullYear()}</h2>
      </div>
      <div className="flex overflow-y-auto max-h-[70vh]">
        <TimeGutter />
        <DroppableCell id={fmt(date)} onClick={() => onSlotClick('9:00 AM')} className="flex-1 relative border-l border-zinc-800 cursor-pointer">
          <div style={{ height: gridHeight, position: 'relative' }}>
            {Array.from({ length: 21 - GRID_START }, (_, i) => (
              <div key={i} className="absolute w-full border-t border-zinc-800/60" style={{ top: i * PX_PER_HOUR }} />
            ))}
            {placed.map(({ booking, col, total }) => (
              <TimeBlock key={booking.id} booking={booking} column={col} totalCols={total} onClick={() => onCardClick(booking)} />
            ))}
          </div>
        </DroppableCell>
      </div>
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
            <DroppableCell key={dateStr} id={dateStr} onClick={() => onDayClick(day)}
              className={`min-h-24 border rounded-xl p-1.5 cursor-pointer ${isToday ? 'border-[#cee800] bg-zinc-900' : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700'}`}>
              <div className={`text-xs font-black mb-1 ${isToday ? 'text-[#cee800]' : 'text-zinc-400'}`}>{day.getDate()}</div>
              <div className="space-y-0.5">
                {dayBookings.slice(0,3).map(b => <SessionCard key={b.id} booking={b} onClick={() => onCardClick(b)} />)}
                {dayBookings.length > 3 && <div className="text-zinc-500 text-xs px-1">+{dayBookings.length-3} more</div>}
              </div>
            </DroppableCell>
          )
        })}
      </div>
    </div>
  )
}

// ── Reschedule modal ────────────────────────────────────────────
function RescheduleModal({ booking, newDate, onConfirm, onCancel }: {
  booking: Booking; newDate: string; onConfirm: (d: string, h: string) => void; onCancel: () => void
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
            className="flex-1 py-2.5 bg-[#cee800] text-black font-black rounded-xl text-sm hover:bg-[#d4f030] transition">Confirm</button>
        </div>
      </div>
    </div>
  )
}

// ── Session detail drawer ───────────────────────────────────────
function SessionDetail({ booking, onClose, onEdit, onDelete }: {
  booking: Booking; onClose: () => void; onEdit: () => void; onDelete: () => void
}) {
  const dur = booking.duration_minutes
  const durLabel = dur ? (dur >= 60 ? `${dur/60} hr${dur > 60 ? 's' : ''}` : `${dur} min`) : null
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
            ['Title',    booking.player_name || booking.client],
            ['Date',     booking.date],
            ['Time',     booking.hour],
            ['Duration', durLabel],
            ['Coach',    booking.coach],
            ['Status',   booking.status],
            ['Location',  booking.location],
            ['Notes',    booking.notes],
          ] as [string,string|null][]).filter(([,v]) => v).map(([k,v]) => (
            <div key={k} className="flex justify-between gap-4">
              <span className="text-zinc-400 shrink-0">{k}</span>
              <span className="font-semibold text-right">{v}</span>
            </div>
          ))}
        </div>
        {booking.is_group_slot && (
          <a href={`/admin/group-sessions/${booking.id}`}
            className="block w-full mb-3 py-2.5 text-center bg-[#00e676]/10 border border-[#00e676]/40 text-[#00e676] font-black rounded-xl text-sm hover:bg-[#00e676]/20 transition">
            View Roster →
          </a>
        )}
        <div className="flex gap-3">
          <button onClick={onEdit}
            className="flex-1 py-2.5 bg-[#cee800] text-black font-black rounded-xl text-sm hover:bg-[#d4f030] transition">
            Edit
          </button>
          <button onClick={onDelete}
            className="flex-1 py-2.5 border border-red-900 text-red-400 rounded-xl text-sm hover:bg-red-900/20 transition">
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main calendar ───────────────────────────────────────────────
export default function CalendarPage() {
  const [view, setView]                     = useState<View>('week')
  const [anchor, setAnchor]                 = useState(new Date())
  const [bookings, setBookings]             = useState<Booking[]>([])
  const [loading, setLoading]               = useState(true)
  const [saving, setSaving]                 = useState(false)
  const [selected, setSelected]             = useState<Booking | null>(null)
  const [editing, setEditing]               = useState<Booking | null>(null)
  const [showNewSession, setShowNewSession]  = useState(false)
  const [newSessionDate, setNewSessionDate]  = useState<string | undefined>()
  const [newSessionHour, setNewSessionHour]  = useState<string | undefined>()
  const [draggedBooking, setDraggedBooking]  = useState<Booking | null>(null)
  const [pendingReschedule, setPendingReschedule] = useState<{ booking: Booking; date: string } | null>(null)
  const [showGroupModal, setShowGroupModal] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    fetch('/api/me').then(r => r.json()).then(d => setIsAdmin(d.role === 'admin'))
  }, [])

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))
  const todayStr = fmt(new Date())

  const { from, to, weekDays } = (() => {
    if (view === 'day') { const d = fmt(anchor); return { from: d, to: d, weekDays: [] } }
    if (view === 'week') {
      const ws = startOfWeek(anchor)
      const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(ws); d.setDate(d.getDate()+i); return d })
      return { from: fmt(days[0]), to: fmt(days[6]), weekDays: days }
    }
    const first = startOfMonth(anchor)
    const last  = new Date(anchor.getFullYear(), anchor.getMonth()+1, 0)
    return { from: fmt(first), to: fmt(last), weekDays: [] }
  })()

  const loadBookings = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/sessions?from=${from}&to=${to}`)
      if (res.ok) setBookings(await res.json())
    } finally { setLoading(false) }
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

  function headerLabel() {
    if (view === 'day')  return `${DAYS[anchor.getDay()]}, ${MONTHS_SHORT[anchor.getMonth()]} ${anchor.getDate()}, ${anchor.getFullYear()}`
    if (view === 'week') return weekDays.length ? `${MONTHS_SHORT[weekDays[0].getMonth()]} ${weekDays[0].getDate()} – ${MONTHS_SHORT[weekDays[6].getMonth()]} ${weekDays[6].getDate()}, ${weekDays[6].getFullYear()}` : ''
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
    const newDate = (over.id as string).split('__')[0]
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

  function openNewSession(date?: string, hour?: string) {
    setNewSessionDate(date); setNewSessionHour(hour); setShowNewSession(true)
  }

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-6">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <Link href="/admin" className="text-zinc-500 hover:text-white text-sm">← Admin</Link>
          <h1 className="text-2xl font-black text-[#cee800] tracking-widest">CALENDAR</h1>
          <div className="flex bg-zinc-900 border border-zinc-800 rounded-lg p-0.5 ml-2">
            {(['day','week','month'] as View[]).map(v => (
              <button key={v} onClick={() => setView(v)}
                className={`px-3 py-1 rounded-md text-sm font-semibold capitalize transition ${view === v ? 'bg-[#cee800] text-black' : 'text-zinc-400 hover:text-white'}`}>
                {v}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <button onClick={() => setShowGroupModal(true)}
              className="px-4 py-1.5 bg-zinc-800 border border-zinc-700 text-white font-semibold text-sm rounded-lg hover:border-[#00e676] hover:text-[#00e676] transition">
              + Group Sessions
            </button>
            <button onClick={() => openNewSession()}
              className="px-4 py-1.5 bg-[#cee800] text-black font-black text-sm rounded-lg hover:bg-[#d4f030] transition">
              + New Session
            </button>
            <button onClick={() => navigate(-1)} className="px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg hover:border-[#cee800] text-sm transition">←</button>
            <span className="text-sm font-semibold min-w-48 text-center">{headerLabel()}</span>
            <button onClick={() => navigate(1)}  className="px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg hover:border-[#cee800] text-sm transition">→</button>
            <button onClick={() => setAnchor(new Date())} className="px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg hover:border-[#cee800] text-sm transition">Today</button>
          </div>
        </div>

        {/* Calendar */}
        <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
          {view === 'day' && (
            <DayView date={anchor} bookings={bookings}
              onSlotClick={h => openNewSession(fmt(anchor), h)} onCardClick={setSelected} />
          )}
          {view === 'week' && (
            <WeekView weekDays={weekDays} bookings={bookings} todayStr={todayStr}
              onDayClick={(d, h) => openNewSession(fmt(d), h)} onCardClick={setSelected} />
          )}
          {view === 'month' && (
            <MonthView anchor={anchor} bookings={bookings} todayStr={todayStr}
              onDayClick={d => openNewSession(fmt(d))} onCardClick={setSelected} />
          )}

          <DragOverlay>
            {draggedBooking && (
              <div className="rounded-lg px-2 py-2 text-xs font-semibold text-black shadow-2xl rotate-2 w-32"
                style={{ backgroundColor: SESSION_COLORS[draggedBooking.type] || '#666' }}>
                <div className="font-black truncate">{draggedBooking.player_name || draggedBooking.client}</div>
                <div className="opacity-70">{draggedBooking.hour}</div>
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

      {selected && !editing && (
        <SessionDetail
          booking={selected}
          onClose={() => setSelected(null)}
          onEdit={() => { setEditing(selected); setSelected(null) }}
          onDelete={() => deleteSession(selected.id)}
        />
      )}

      {editing && (
        <EditSessionModal
          booking={editing}
          isAdmin={isAdmin}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); loadBookings() }}
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
          isAdmin={isAdmin}
          onClose={() => setShowNewSession(false)}
          onCreated={() => { setShowNewSession(false); loadBookings() }}
        />
      )}

      {showGroupModal && (
        <NewGroupSessionModal
          onClose={() => setShowGroupModal(false)}
          onCreated={() => { setShowGroupModal(false); loadBookings() }}
        />
      )}
    </div>
  )
}
