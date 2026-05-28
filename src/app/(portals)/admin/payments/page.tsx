'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'

type Tab = 'overview' | 'transactions' | 'coaches'

type Booking = {
  id: string; date: string; hour: string; coach: string; type: string
  status: string; price: string | null; player_name: string | null
  parent_name: string | null; email: string | null; client: string; source: string | null
}

const PAID_STATUSES  = ['scheduled','confirmed','paid','completed']
const SESSION_COLORS: Record<string, string> = {
  individual: '#cee800', semi: '#00e5ff', group: '#00e676', camp: '#b388ff', duo: '#ff6b35',
}

// Coach base rates per session type
const COACH_RATES: Record<string, Record<string, number>> = {
  'Coach Aidan': { individual: 50,  semi: 45, group: 0,   camp: 50  },
  'Coach A':     { individual: 75,  semi: 55, group: 0,   camp: 75  },
  'Coach Josh':  { individual: 105, semi: 85, group: 0,   camp: 105 },
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

  const stats = useMemo(() => ({
    allTime:   revenue(bookings),
    thisMonth: revenue(bookings.filter(b => b.date >= monthStart)),
    thisWeek:  revenue(bookings.filter(b => b.date >= weekStart)),
    today:     revenue(bookings.filter(b => b.date === today)),
    pending:   bookings.filter(b => b.status === 'pending_payment').reduce((s,b) => s + parseFloat(b.price||'0'), 0),
    totalSessions: paid.length,
    avgSession: paid.length ? revenue(bookings) / paid.length : 0,
  }), [bookings, paid, today, weekStart, monthStart])

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

  // ── Coach earnings ───────────────────────────────────────────
  const coachEarnings = useMemo(() => {
    const map: Record<string, { sessions: number; earned: number; byType: Record<string,number> }> = {}
    paid.forEach(b => {
      const name = b.coach || 'Unknown'
      if (!map[name]) map[name] = { sessions: 0, earned: 0, byType: {} }
      map[name].sessions++
      map[name].byType[b.type] = (map[name].byType[b.type] || 0) + 1
      // Coach rate lookup
      const rateKey = Object.keys(COACH_RATES).find(k => name.toLowerCase().includes(k.split(' ')[1]?.toLowerCase() || ''))
      const rate = rateKey ? (COACH_RATES[rateKey][b.type] || 0) : 0
      map[name].earned += rate
    })
    return Object.entries(map).sort((a,b) => b[1].earned - a[1].earned)
  }, [paid])

  // ── Revenue by type ──────────────────────────────────────────
  const byType = useMemo(() => {
    const map: Record<string, number> = {}
    paid.forEach(b => {
      map[b.type] = (map[b.type] || 0) + parseFloat(b.price || '0')
    })
    return Object.entries(map).sort((a,b) => b[1]-a[1])
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
            <button className={tabCls('transactions')} onClick={() => setTab('transactions')}>Transactions</button>
            <button className={tabCls('coaches')}      onClick={() => setTab('coaches')}>Coach Earnings</button>
          </div>
        </div>

        {loading && <div className="text-zinc-500 text-sm">Loading...</div>}

        {/* ── OVERVIEW ── */}
        {!loading && tab === 'overview' && (
          <div className="space-y-6">
            {/* Revenue stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'All Time',    value: stats.allTime,   sub: `${paid.length} sessions` },
                { label: 'This Month',  value: stats.thisMonth, sub: 'current month' },
                { label: 'This Week',   value: stats.thisWeek,  sub: 'current week' },
                { label: 'Today',       value: stats.today,     sub: fmt(new Date()) },
              ].map(({ label, value, sub }) => (
                <div key={label} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
                  <p className="text-zinc-400 text-xs mb-1">{label}</p>
                  <p className="text-3xl font-black text-[#cee800]">${value.toFixed(0)}</p>
                  <p className="text-zinc-600 text-xs mt-1">{sub}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
                <p className="text-zinc-400 text-xs mb-1">Pending Payment</p>
                <p className="text-3xl font-black text-orange-400">${stats.pending.toFixed(0)}</p>
                <p className="text-zinc-600 text-xs mt-1">{bookings.filter(b=>b.status==='pending_payment').length} bookings awaiting payment</p>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
                <p className="text-zinc-400 text-xs mb-1">Avg per Session</p>
                <p className="text-3xl font-black">${stats.avgSession.toFixed(0)}</p>
                <p className="text-zinc-600 text-xs mt-1">across all paid sessions</p>
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
                  const pct = stats.allTime ? (amount / stats.allTime) * 100 : 0
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
                            PAID_STATUSES.includes(b.status) ? 'bg-[#cee800]/20 text-[#cee800]' :
                            b.status === 'pending_payment'   ? 'bg-orange-500/20 text-orange-400' :
                            b.status === 'cancelled'         ? 'bg-red-900/30 text-red-400' :
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
            <p className="text-zinc-500 text-sm">Based on coach rates × confirmed sessions. Use this to calculate payouts.</p>
            {coachEarnings.length === 0 ? (
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center text-zinc-500">No sessions recorded yet.</div>
            ) : coachEarnings.map(([name, data]) => (
              <div key={name} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#cee800] flex items-center justify-center text-black font-black text-sm">
                      {name.split(' ').map((n:string) => n[0]).join('').slice(0,2)}
                    </div>
                    <div>
                      <p className="font-black">{name}</p>
                      <p className="text-zinc-400 text-xs">{data.sessions} sessions</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-zinc-500">Estimated Earnings</p>
                    <p className="text-2xl font-black text-[#cee800]">${data.earned.toFixed(0)}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {Object.entries(data.byType).map(([type, count]) => (
                    <div key={type} className="bg-zinc-800 rounded-xl p-3 text-center">
                      <p className="text-zinc-500 text-xs capitalize">{type}</p>
                      <p className="font-black text-lg">{count}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
