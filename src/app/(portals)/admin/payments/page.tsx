'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'

type Tab = 'overview' | 'transactions' | 'coaches' | 'revenue'

type Booking = {
  id: string; date: string; hour: string; coach: string; type: string
  status: string; price: string | null; player_name: string | null
  parent_name: string | null; email: string | null; client: string; source: string | null
  coach_pay: number | null; coach_pay_settled: boolean
  director_pay: number | null; director_pay_settled: boolean
}

const PAID_STATUSES    = ['scheduled','confirmed','paid','completed']
const BOOKED_STATUSES  = ['scheduled','confirmed','paid']
const ACTUAL_STATUSES  = ['completed']
const SESSION_COLORS: Record<string, string> = {
  individual: '#cee800', semi: '#00e5ff', group: '#00e676', camp: '#b388ff', duo: '#ff6b35',
}


function fmt(d: Date) {
  return d.toISOString().split('T')[0]
}

function startOf(unit: 'day' | 'week' | 'month') {
  const d = new Date()
  if (unit === 'day')   { d.setHours(0,0,0,0) }
  if (unit === 'week')  { d.setDate(d.getDate() - d.getDay()); d.setHours(0,0,0,0) }
  if (unit === 'month') { d.setDate(1); d.setHours(0,0,0,0) }
  return fmt(d)
}

function revenue(bookings: Booking[]) {
  return bookings
    .filter(b => PAID_STATUSES.includes(b.status))
    .reduce((s, b) => s + parseFloat(b.price || '0'), 0)
}

export default function PaymentsPage() {
  const [tab, setTab]             = useState<Tab>('overview')
  const [bookings, setBookings]   = useState<Booking[]>([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [statusFilter, setStatus] = useState('all')
  const [typeFilter, setType]     = useState('all')
  const [coachFilter, setCoach]   = useState('all')
  const [dateFrom, setDateFrom]   = useState('')
  const [dateTo, setDateTo]       = useState('')

  useEffect(() => {
    fetch('/api/payments').then(r => r.json()).then(d => { setBookings(d); setLoading(false) })
  }, [])

  // ── Revenue stats ────────────────────────────────────────────
  const today     = startOf('day')
  const weekStart = startOf('week')
  const monthStart= startOf('month')

  const paid = useMemo(() => bookings.filter(b => PAID_STATUSES.includes(b.status)), [bookings])

  const stats = useMemo(() => {
    const actual  = bookings.filter(b => ACTUAL_STATUSES.includes(b.status))
    const booked  = bookings.filter(b => BOOKED_STATUSES.includes(b.status))
    const actualRev = actual.reduce((s, b) => s + parseFloat(b.price || '0'), 0)
    const bookedRev = booked.reduce((s, b) => s + parseFloat(b.price || '0'), 0)
    return {
      actualRevenue:  actualRev,
      bookedRevenue:  bookedRev,
      actualSessions: actual.length,
      bookedSessions: booked.length,
      thisMonth: revenue(bookings.filter(b => b.date >= monthStart)),
      thisWeek:  revenue(bookings.filter(b => b.date >= weekStart)),
      today:     revenue(bookings.filter(b => b.date === today)),
      pending:   bookings.filter(b => b.status === 'pending_payment').reduce((s,b) => s + parseFloat(b.price||'0'), 0),
      totalSessions: paid.length,
      avgSession: paid.length ? revenue(bookings) / paid.length : 0,
    }
  }, [bookings, paid, today, weekStart, monthStart])

  // ── Unique coaches ───────────────────────────────────────────
  const coaches = useMemo(() => [...new Set(bookings.map(b => b.coach).filter(Boolean))].sort(), [bookings])

  // ── Filtered transactions ────────────────────────────────────
  const filtered = useMemo(() => bookings.filter(b => {
    if (statusFilter !== 'all' && b.status !== statusFilter) return false
    if (typeFilter   !== 'all' && b.type   !== typeFilter)   return false
    if (coachFilter  !== 'all' && b.coach  !== coachFilter)  return false
    if (dateFrom && b.date < dateFrom) return false
    if (dateTo   && b.date > dateTo)   return false
    if (search) {
      const q = search.toLowerCase()
      return (b.player_name||b.client||'').toLowerCase().includes(q) ||
             (b.parent_name||'').toLowerCase().includes(q) ||
             (b.email||'').toLowerCase().includes(q) ||
             (b.coach||'').toLowerCase().includes(q)
    }
    return true
  }), [bookings, statusFilter, typeFilter, coachFilter, dateFrom, dateTo, search])

  // Director override always rolls into this coach's pay
  const DIRECTOR_COACH = 'Coach A'

  // ── Coach earnings ───────────────────────────────────────────
  // Each entry tracks regular coaching pay + (for Coach A) director override pay
  const coachEarnings = useMemo(() => {
    type CoachData = {
      coachSessions:    Booking[]
      directorSessions: Booking[]
      coachEarned:      number
      coachSettled:     number
      directorEarned:   number
      directorSettled:  number
    }
    const map: Record<string, CoachData> = {}
    const ensure = (name: string) => {
      if (!map[name]) map[name] = { coachSessions: [], directorSessions: [], coachEarned: 0, coachSettled: 0, directorEarned: 0, directorSettled: 0 }
    }
    bookings.forEach(b => {
      if (b.coach_pay) {
        const name = b.coach || 'Unknown'
        ensure(name)
        map[name].coachSessions.push(b)
        map[name].coachEarned += b.coach_pay
        if (b.coach_pay_settled) map[name].coachSettled += b.coach_pay
      }
      if (b.director_pay) {
        ensure(DIRECTOR_COACH)
        map[DIRECTOR_COACH].directorSessions.push(b)
        map[DIRECTOR_COACH].directorEarned += b.director_pay
        if (b.director_pay_settled) map[DIRECTOR_COACH].directorSettled += b.director_pay
      }
    })
    return Object.entries(map)
      .map(([name, d]) => ({ name, ...d, totalEarned: d.coachEarned + d.directorEarned, totalSettled: d.coachSettled + d.directorSettled }))
      .sort((a, b) => b.totalEarned - a.totalEarned)
  }, [bookings])

  async function markSettled(bookingId: string, settled: boolean) {
    await fetch(`/api/sessions/${bookingId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ coach_pay_settled: settled }),
    })
    setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, coach_pay_settled: settled } : b))
  }

  async function markAllSettled(sessions: Booking[]) {
    const unsettled = sessions.filter(s => !s.coach_pay_settled)
    await Promise.all(unsettled.map(s => markSettled(s.id, true)))
  }

  // ── Revenue tab calculations ─────────────────────────────────
  const revenueData = useMemo(() => {
    const now = new Date()
    // Week: Sun–Sat
    const wStart = new Date(now); wStart.setDate(now.getDate() - now.getDay()); wStart.setHours(0,0,0,0)
    const prevWStart = new Date(wStart); prevWStart.setDate(wStart.getDate() - 7)
    const prevWEnd   = new Date(wStart); prevWEnd.setDate(wStart.getDate() - 1)
    const weekStartStr    = fmt(wStart)
    const prevWeekStartStr = fmt(prevWStart)
    const prevWeekEndStr   = fmt(prevWEnd)
    // Month
    const mStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const prevMStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const prevMEnd   = new Date(now.getFullYear(), now.getMonth(), 0)
    const monthStartStr    = fmt(mStart)
    const prevMonthStartStr = fmt(prevMStart)
    const prevMonthEndStr   = fmt(prevMEnd)
    const todayStr = fmt(now)

    const rev = (b: Booking) => parseFloat(b.price || '0')
    const cp  = (b: Booking) => b.coach_pay ?? 0

    const thisWeek  = bookings.filter(b => b.date >= weekStartStr && b.date <= todayStr && PAID_STATUSES.includes(b.status))
    const lastWeek  = bookings.filter(b => b.date >= prevWeekStartStr && b.date <= prevWeekEndStr && PAID_STATUSES.includes(b.status))
    const thisMonth = bookings.filter(b => b.date >= monthStartStr && b.date <= todayStr && PAID_STATUSES.includes(b.status))
    const lastMonth = bookings.filter(b => b.date >= prevMonthStartStr && b.date <= prevMonthEndStr && PAID_STATUSES.includes(b.status))

    const sum = (arr: Booking[], fn: (b: Booking) => number) => arr.reduce((s, b) => s + fn(b), 0)

    const weekRev  = sum(thisWeek, rev);  const weekPay  = sum(thisWeek, cp)
    const lWeekRev = sum(lastWeek, rev);  const lWeekPay = sum(lastWeek, cp)
    const monRev   = sum(thisMonth, rev); const monPay   = sum(thisMonth, cp)
    const lMonRev  = sum(lastMonth, rev); const lMonPay  = sum(lastMonth, cp)

    // By coach — group all paid bookings
    const coachMap: Record<string, { sessions: number; revenue: number; coachPay: number }> = {}
    bookings.filter(b => PAID_STATUSES.includes(b.status)).forEach(b => {
      const name = b.coach || 'Unassigned'
      if (!coachMap[name]) coachMap[name] = { sessions: 0, revenue: 0, coachPay: 0 }
      coachMap[name].sessions++
      coachMap[name].revenue  += rev(b)
      coachMap[name].coachPay += cp(b)
    })
    const byCoach = Object.entries(coachMap).sort((a, b) => b[1].revenue - a[1].revenue)

    return {
      weekRev, weekPay, weekProfit: weekRev - weekPay, weekSessions: thisWeek.length,
      lWeekRev, lWeekPay, lWeekProfit: lWeekRev - lWeekPay, lWeekSessions: lastWeek.length,
      monRev, monPay, monProfit: monRev - monPay, monSessions: thisMonth.length,
      lMonRev, lMonPay, lMonProfit: lMonRev - lMonPay, lMonSessions: lastMonth.length,
      byCoach,
    }
  }, [bookings])

  function delta(current: number, previous: number) {
    const diff = current - previous
    const pct  = previous > 0 ? ((diff / previous) * 100).toFixed(0) : null
    const sign = diff >= 0 ? '+' : ''
    return { diff, pct, label: `${sign}$${Math.abs(diff).toFixed(0)}${pct ? ` (${sign}${pct}%)` : ''}`, up: diff >= 0 }
  }

  async function markDirectorSettled(bookingId: string, settled: boolean) {
    await fetch(`/api/sessions/${bookingId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ director_pay_settled: settled }),
    })
    setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, director_pay_settled: settled } : b))
  }

  // ── Revenue by type ──────────────────────────────────────────
  const byType = useMemo(() => {
    const map: Record<string, number> = {}
    paid.forEach(b => {
      map[b.type] = (map[b.type] || 0) + parseFloat(b.price || '0')
    })
    return Object.entries(map).sort((a, b) => b[1] - a[1])
  }, [paid])

  function exportCSV() {
    const rows = [
      ['Date','Player','Parent','Email','Coach','Type','Status','Price'].join(','),
      ...filtered.map(b => [
        b.date, b.player_name||b.client, b.parent_name||'', b.email||'',
        b.coach, b.type, b.status, b.price||'0'
      ].map(v => `"${v}"`).join(','))
    ]
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a'); a.href = url; a.download = 'ptg-payments.csv'; a.click()
  }

  const tabCls = (t: Tab) =>
    `px-4 py-2 text-sm font-semibold rounded-lg transition ${tab === t ? 'bg-[#cee800] text-black' : 'text-zinc-400 hover:text-white'}`

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-6">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="text-zinc-500 hover:text-white text-sm">← Admin</Link>
            <h1 className="text-2xl font-black text-[#cee800] tracking-widest">PAYMENTS</h1>
          </div>
          <div className="flex bg-zinc-900 border border-zinc-800 rounded-lg p-0.5">
            <button className={tabCls('overview')}     onClick={() => setTab('overview')}>Overview</button>
            <button className={tabCls('revenue')}      onClick={() => setTab('revenue')}>Revenue</button>
            <button className={tabCls('transactions')} onClick={() => setTab('transactions')}>Transactions</button>
            <button className={tabCls('coaches')}      onClick={() => setTab('coaches')}>Coach Earnings</button>
          </div>
        </div>

        {loading && <div className="text-zinc-500 text-sm">Loading...</div>}

        {/* ── OVERVIEW ── */}
        {!loading && tab === 'overview' && (
          <div className="space-y-6">
            {/* Primary: Actual vs Booked */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-zinc-900 border border-[#00e676]/30 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 rounded-full bg-[#00e676]" />
                  <p className="text-[#00e676] text-xs font-bold uppercase tracking-wider">Actual Revenue</p>
                </div>
                <p className="text-4xl font-black text-white">${stats.actualRevenue.toFixed(0)}</p>
                <p className="text-zinc-500 text-sm mt-2">{stats.actualSessions} completed session{stats.actualSessions !== 1 ? 's' : ''}</p>
                <p className="text-zinc-600 text-xs mt-1">Sessions marked complete by coach</p>
              </div>
              <div className="bg-zinc-900 border border-[#cee800]/30 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 rounded-full bg-[#cee800]" />
                  <p className="text-[#cee800] text-xs font-bold uppercase tracking-wider">Booked Revenue</p>
                </div>
                <p className="text-4xl font-black text-white">${stats.bookedRevenue.toFixed(0)}</p>
                <p className="text-zinc-500 text-sm mt-2">{stats.bookedSessions} upcoming session{stats.bookedSessions !== 1 ? 's' : ''}</p>
                <p className="text-zinc-600 text-xs mt-1">Confirmed &amp; paid, not yet completed</p>
              </div>
            </div>

            {/* Period breakdown */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'This Month',  value: stats.thisMonth, sub: 'all paid statuses' },
                { label: 'This Week',   value: stats.thisWeek,  sub: 'current week' },
                { label: 'Today',       value: stats.today,     sub: fmt(new Date()) },
                { label: 'Avg/Session', value: stats.avgSession, sub: `${paid.length} total sessions` },
              ].map(({ label, value, sub }) => (
                <div key={label} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
                  <p className="text-zinc-400 text-xs mb-1">{label}</p>
                  <p className="text-3xl font-black text-[#cee800]">${value.toFixed(0)}</p>
                  <p className="text-zinc-600 text-xs mt-1">{sub}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
                <p className="text-zinc-400 text-xs mb-1">Pending Payment</p>
                <p className="text-3xl font-black text-orange-400">${stats.pending.toFixed(0)}</p>
                <p className="text-zinc-600 text-xs mt-1">{bookings.filter(b=>b.status==='pending_payment').length} bookings awaiting payment</p>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
                <p className="text-zinc-400 text-xs mb-1">Total Sessions</p>
                <p className="text-3xl font-black">{stats.totalSessions}</p>
                <p className="text-zinc-600 text-xs mt-1">paid and confirmed</p>
              </div>
            </div>

            {/* Revenue by type */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              <h2 className="font-black text-lg mb-4">Revenue by Session Type</h2>
              <div className="space-y-3">
                {byType.map(([type, amount]) => {
                  const total = stats.actualRevenue + stats.bookedRevenue
                  const pct = total ? (amount / total) * 100 : 0
                  return (
                    <div key={type}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="capitalize font-semibold">{type}</span>
                        <span className="text-zinc-400">${amount.toFixed(0)} ({pct.toFixed(0)}%)</span>
                      </div>
                      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all"
                          style={{ width: `${pct}%`, backgroundColor: SESSION_COLORS[type] || '#666' }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── REVENUE ── */}
        {!loading && tab === 'revenue' && (() => {
          const r = revenueData
          const wDelta = delta(r.weekRev, r.lWeekRev)
          const mDelta = delta(r.monRev, r.lMonRev)
          return (
            <div className="space-y-6">

              {/* Week over Week */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                <h2 className="font-black text-sm uppercase tracking-wider text-zinc-400 mb-4">Week over Week</h2>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-zinc-800 rounded-xl p-4">
                    <p className="text-xs text-zinc-400 mb-1">This Week</p>
                    <p className="text-3xl font-black text-[#cee800]">${r.weekRev.toFixed(2)}</p>
                    <p className="text-zinc-500 text-xs mt-1">{r.weekSessions} sessions</p>
                  </div>
                  <div className="bg-zinc-800 rounded-xl p-4">
                    <p className="text-xs text-zinc-400 mb-1">Last Week</p>
                    <p className="text-3xl font-black text-white">${r.lWeekRev.toFixed(2)}</p>
                    <p className="text-zinc-500 text-xs mt-1">{r.lWeekSessions} sessions</p>
                  </div>
                </div>
                <div className={`flex items-center gap-2 text-sm font-black ${wDelta.up ? 'text-[#00e676]' : 'text-red-400'}`}>
                  <span>{wDelta.up ? '▲' : '▼'}</span>
                  <span>{wDelta.label} vs last week</span>
                </div>
                {/* Profit */}
                <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-zinc-700">
                  <div>
                    <p className="text-xs text-zinc-400 mb-1">Coach Pay This Week</p>
                    <p className="text-xl font-black text-orange-400">-${r.weekPay.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-400 mb-1">Net Profit This Week</p>
                    <p className={`text-xl font-black ${r.weekProfit >= 0 ? 'text-[#00e676]' : 'text-red-400'}`}>${r.weekProfit.toFixed(2)}</p>
                  </div>
                </div>
              </div>

              {/* Month over Month */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                <h2 className="font-black text-sm uppercase tracking-wider text-zinc-400 mb-4">Month over Month</h2>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-zinc-800 rounded-xl p-4">
                    <p className="text-xs text-zinc-400 mb-1">This Month</p>
                    <p className="text-3xl font-black text-[#cee800]">${r.monRev.toFixed(2)}</p>
                    <p className="text-zinc-500 text-xs mt-1">{r.monSessions} sessions</p>
                  </div>
                  <div className="bg-zinc-800 rounded-xl p-4">
                    <p className="text-xs text-zinc-400 mb-1">Last Month</p>
                    <p className="text-3xl font-black text-white">${r.lMonRev.toFixed(2)}</p>
                    <p className="text-zinc-500 text-xs mt-1">{r.lMonSessions} sessions</p>
                  </div>
                </div>
                <div className={`flex items-center gap-2 text-sm font-black ${mDelta.up ? 'text-[#00e676]' : 'text-red-400'}`}>
                  <span>{mDelta.up ? '▲' : '▼'}</span>
                  <span>{mDelta.label} vs last month</span>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-zinc-700">
                  <div>
                    <p className="text-xs text-zinc-400 mb-1">Coach Pay This Month</p>
                    <p className="text-xl font-black text-orange-400">-${r.monPay.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-400 mb-1">Net Profit This Month</p>
                    <p className={`text-xl font-black ${r.monProfit >= 0 ? 'text-[#00e676]' : 'text-red-400'}`}>${r.monProfit.toFixed(2)}</p>
                  </div>
                </div>
              </div>

              {/* By Coach */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                <div className="p-5 border-b border-zinc-800">
                  <h2 className="font-black text-sm uppercase tracking-wider text-zinc-400">Revenue by Coach (All Time)</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-zinc-800">
                        <th className="text-left px-5 py-3 text-zinc-400 font-semibold">Coach</th>
                        <th className="text-right px-5 py-3 text-zinc-400 font-semibold">Sessions</th>
                        <th className="text-right px-5 py-3 text-zinc-400 font-semibold">Revenue</th>
                        <th className="text-right px-5 py-3 text-zinc-400 font-semibold">Coach Pay</th>
                        <th className="text-right px-5 py-3 text-zinc-400 font-semibold">Profit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {r.byCoach.map(([name, d]) => {
                        const profit = d.revenue - d.coachPay
                        return (
                          <tr key={name} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                            <td className="px-5 py-3 font-semibold">{name}</td>
                            <td className="px-5 py-3 text-right text-zinc-400">{d.sessions}</td>
                            <td className="px-5 py-3 text-right font-black text-[#cee800]">${d.revenue.toFixed(2)}</td>
                            <td className="px-5 py-3 text-right text-orange-400">-${d.coachPay.toFixed(2)}</td>
                            <td className={`px-5 py-3 text-right font-black ${profit >= 0 ? 'text-[#00e676]' : 'text-red-400'}`}>${profit.toFixed(2)}</td>
                          </tr>
                        )
                      })}
                      {/* Totals row */}
                      {r.byCoach.length > 0 && (() => {
                        const totRev = r.byCoach.reduce((s, [, d]) => s + d.revenue, 0)
                        const totPay = r.byCoach.reduce((s, [, d]) => s + d.coachPay, 0)
                        const totProfit = totRev - totPay
                        return (
                          <tr className="border-t-2 border-zinc-700 bg-zinc-800/40">
                            <td className="px-5 py-3 font-black text-white">Total</td>
                            <td className="px-5 py-3 text-right font-black">{r.byCoach.reduce((s, [, d]) => s + d.sessions, 0)}</td>
                            <td className="px-5 py-3 text-right font-black text-[#cee800]">${totRev.toFixed(2)}</td>
                            <td className="px-5 py-3 text-right font-black text-orange-400">-${totPay.toFixed(2)}</td>
                            <td className={`px-5 py-3 text-right font-black ${totProfit >= 0 ? 'text-[#00e676]' : 'text-red-400'}`}>${totProfit.toFixed(2)}</td>
                          </tr>
                        )
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )
        })()}

        {/* ── TRANSACTIONS ── */}
        {!loading && tab === 'transactions' && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap gap-3">
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search player, parent, email, coach..."
                className="flex-1 min-w-48 bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-[#cee800]" />
              <select value={statusFilter} onChange={e => setStatus(e.target.value)}
                className="bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-[#cee800]">
                <option value="all">All Statuses</option>
                <option value="scheduled">Scheduled</option>
                <option value="confirmed">Confirmed</option>
                <option value="paid">Paid</option>
                <option value="completed">Completed</option>
                <option value="pending_payment">Pending Payment</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <select value={typeFilter} onChange={e => setType(e.target.value)}
                className="bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-[#cee800]">
                <option value="all">All Types</option>
                <option value="individual">Individual</option>
                <option value="semi">Semi-Individual</option>
                <option value="group">Group</option>
                <option value="camp">Camp</option>
              </select>
              <select value={coachFilter} onChange={e => setCoach(e.target.value)}
                className="bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-[#cee800]">
                <option value="all">All Coaches</option>
                {coaches.map(c => <option key={c}>{c}</option>)}
              </select>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                className="bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-[#cee800]" />
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                className="bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-[#cee800]" />
              <button onClick={exportCSV}
                className="px-4 py-2 border border-zinc-700 rounded-xl text-sm text-zinc-300 hover:border-[#cee800] hover:text-white transition">
                Export CSV
              </button>
            </div>

            <div className="flex justify-between text-sm text-zinc-500">
              <span>{filtered.length} transactions</span>
              <span>Total: <span className="text-white font-semibold">${revenue(filtered).toFixed(2)}</span></span>
            </div>

            {/* Table */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800">
                      <th className="text-left px-4 py-3 text-zinc-400 font-semibold">Date</th>
                      <th className="text-left px-4 py-3 text-zinc-400 font-semibold">Player</th>
                      <th className="text-left px-4 py-3 text-zinc-400 font-semibold">Coach</th>
                      <th className="text-left px-4 py-3 text-zinc-400 font-semibold">Type</th>
                      <th className="text-left px-4 py-3 text-zinc-400 font-semibold">Status</th>
                      <th className="text-right px-4 py-3 text-zinc-400 font-semibold">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr><td colSpan={6} className="text-center text-zinc-500 py-8">No transactions match your filters.</td></tr>
                    ) : filtered.map(b => (
                      <tr key={b.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                        <td className="px-4 py-3 text-zinc-400">{b.date}</td>
                        <td className="px-4 py-3">
                          <div className="font-semibold">{b.player_name || b.client}</div>
                          {b.parent_name && <div className="text-zinc-500 text-xs">{b.parent_name}</div>}
                        </td>
                        <td className="px-4 py-3 text-zinc-300">{b.coach}</td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full text-black"
                            style={{ backgroundColor: SESSION_COLORS[b.type] || '#666' }}>
                            {b.type}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                            b.status === 'completed'       ? 'bg-[#00e676]/20 text-[#00e676]' :
                            BOOKED_STATUSES.includes(b.status) ? 'bg-[#cee800]/20 text-[#cee800]' :
                            b.status === 'pending_payment' ? 'bg-orange-500/20 text-orange-400' :
                            b.status === 'cancelled'       ? 'bg-red-900/30 text-red-400' :
                            'bg-zinc-700 text-zinc-400'
                          }`}>{b.status?.replace(/_/g,' ')}</span>
                        </td>
                        <td className="px-4 py-3 text-right font-black">
                          {b.price ? `$${parseFloat(b.price).toFixed(2)}` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── COACH EARNINGS ── */}
        {!loading && tab === 'coaches' && (
          <div className="space-y-4">
            <p className="text-zinc-500 text-sm">Set coach pay and director override on each session via the calendar. Mark settled once paid out.</p>

            {coachEarnings.length === 0 ? (
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center text-zinc-500">
                No coach pay set yet. Edit a session in the calendar to assign pay.
              </div>
            ) : coachEarnings.map(({ name, coachSessions, directorSessions, coachEarned, coachSettled, directorEarned, directorSettled, totalEarned, totalSettled }) => {
              const totalPending = totalEarned - totalSettled
              const unsettledCoach    = coachSessions.filter(s => !s.coach_pay_settled)
              const unsettledDirector = directorSessions.filter(s => !s.director_pay_settled)
              const isDirector = name === DIRECTOR_COACH

              return (
                <div key={name} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                  {/* Header */}
                  <div className="p-5 flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#cee800] flex items-center justify-center text-black font-black text-sm">
                        {name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                      </div>
                      <div>
                        <p className="font-black">{name}</p>
                        <p className="text-zinc-400 text-xs">
                          {coachSessions.length > 0 && `${coachSessions.length} coaching session${coachSessions.length !== 1 ? 's' : ''}`}
                          {coachSessions.length > 0 && directorSessions.length > 0 && ' · '}
                          {directorSessions.length > 0 && `${directorSessions.length} director override${directorSessions.length !== 1 ? 's' : ''}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-xs text-zinc-500">Total Owed</p>
                        <p className="text-xl font-black text-[#cee800]">${totalEarned.toFixed(2)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-zinc-500">Settled</p>
                        <p className="text-xl font-black text-[#00e676]">${totalSettled.toFixed(2)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-zinc-500">Pending</p>
                        <p className={`text-xl font-black ${totalPending > 0 ? 'text-orange-400' : 'text-zinc-400'}`}>${totalPending.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Coaching sessions */}
                  {coachSessions.length > 0 && (
                    <>
                      {isDirector && (
                        <div className="px-5 py-2 border-t border-zinc-800 bg-zinc-800/40">
                          <p className="text-xs font-black uppercase tracking-wider text-zinc-400">Coaching Pay <span className="text-[#cee800]">${coachEarned.toFixed(2)}</span></p>
                        </div>
                      )}
                      <div className={isDirector ? '' : 'border-t border-zinc-800'}>
                        {coachSessions.sort((a, b) => b.date.localeCompare(a.date)).map(s => (
                          <div key={s.id} className={`flex items-center justify-between px-5 py-3 border-b border-zinc-800/50 last:border-0 ${s.coach_pay_settled ? 'opacity-50' : ''}`}>
                            <div className="flex items-center gap-3 min-w-0">
                              <span className={`w-2 h-2 rounded-full shrink-0 ${s.coach_pay_settled ? 'bg-[#00e676]' : 'bg-orange-400'}`} />
                              <div className="min-w-0">
                                <p className="text-sm font-semibold truncate">{s.client || s.player_name || 'Session'}</p>
                                <p className="text-zinc-500 text-xs">{s.date} · <span className="capitalize">{s.type}</span></p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 shrink-0 ml-3">
                              <span className="text-sm font-black">${(s.coach_pay ?? 0).toFixed(2)}</span>
                              <button onClick={() => markSettled(s.id, !s.coach_pay_settled)}
                                className={`text-xs font-bold px-3 py-1 rounded-full border transition ${s.coach_pay_settled ? 'border-zinc-700 text-zinc-500 hover:border-red-500 hover:text-red-400' : 'border-[#00e676]/40 text-[#00e676] hover:bg-[#00e676]/10'}`}>
                                {s.coach_pay_settled ? 'Settled' : 'Mark Settled'}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                      {unsettledCoach.length > 0 && (
                        <div className="px-5 py-3 border-t border-zinc-800 bg-zinc-800/30">
                          <button onClick={() => markAllSettled(coachSessions)}
                            className="text-sm font-black text-[#00e676] hover:underline">
                            Mark all {unsettledCoach.length} coaching sessions as paid →
                          </button>
                        </div>
                      )}
                    </>
                  )}

                  {/* Director override sessions (Coach A only) */}
                  {isDirector && directorSessions.length > 0 && (
                    <>
                      <div className="px-5 py-2 border-t border-zinc-800 bg-zinc-800/40">
                        <p className="text-xs font-black uppercase tracking-wider text-zinc-400">Director Override <span className="text-purple-400">${directorEarned.toFixed(2)}</span></p>
                      </div>
                      <div>
                        {directorSessions.sort((a, b) => b.date.localeCompare(a.date)).map(s => (
                          <div key={`dir-${s.id}`} className={`flex items-center justify-between px-5 py-3 border-b border-zinc-800/50 last:border-0 ${s.director_pay_settled ? 'opacity-50' : ''}`}>
                            <div className="flex items-center gap-3 min-w-0">
                              <span className={`w-2 h-2 rounded-full shrink-0 ${s.director_pay_settled ? 'bg-[#00e676]' : 'bg-purple-400'}`} />
                              <div className="min-w-0">
                                <p className="text-sm font-semibold truncate">{s.client || s.player_name || 'Session'}</p>
                                <p className="text-zinc-500 text-xs">{s.date} · {s.coach} · <span className="capitalize">{s.type}</span></p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 shrink-0 ml-3">
                              <span className="text-sm font-black text-purple-400">${(s.director_pay ?? 0).toFixed(2)}</span>
                              <button onClick={() => markDirectorSettled(s.id, !s.director_pay_settled)}
                                className={`text-xs font-bold px-3 py-1 rounded-full border transition ${s.director_pay_settled ? 'border-zinc-700 text-zinc-500 hover:border-red-500 hover:text-red-400' : 'border-purple-500/40 text-purple-400 hover:bg-purple-500/10'}`}>
                                {s.director_pay_settled ? 'Settled' : 'Mark Settled'}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                      {unsettledDirector.length > 0 && (
                        <div className="px-5 py-3 border-t border-zinc-800 bg-zinc-800/30">
                          <button onClick={() => Promise.all(unsettledDirector.map(s => markDirectorSettled(s.id, true)))}
                            className="text-sm font-black text-purple-400 hover:underline">
                            Mark all {unsettledDirector.length} overrides as paid →
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
