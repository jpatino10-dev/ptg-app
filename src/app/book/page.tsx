'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

// ─── Data ────────────────────────────────────────────────────────────────────

const FORMATS = [
  {
    id: 'individual',
    label: 'Individual',
    tagline: '1-on-1 with your coach',
    desc: 'Maximum attention on your game. Every drill, every rep is designed for you.',
    color: '#cee800',
    icon: '⚡',
  },
  {
    id: 'semi',
    label: 'Semi-Private',
    tagline: '2 players, 1 coach',
    desc: 'Train with a teammate or friend. Push each other while sharing expert coaching.',
    color: '#00e5ff',
    icon: '👥',
  },
  {
    id: 'group',
    label: 'Group Training',
    tagline: 'Small group, big results',
    desc: 'Join our Friday group sessions in June. Drop in for a single session or register for the full series.',
    priceDropin: 50,
    priceMonthly: 150,
    color: '#00e676',
    icon: '🏆',
  },
]

const GROUP_SESSIONS = [
  { id: 'boys_jun5',   date: 'Friday, June 5',   time: '6:00 PM – 7:00 PM', group: 'Elite Boys'  },
  { id: 'boys_jun12',  date: 'Friday, June 12',  time: '6:00 PM – 7:00 PM', group: 'Elite Boys'  },
  { id: 'boys_jun19',  date: 'Friday, June 19',  time: '6:00 PM – 7:00 PM', group: 'Elite Boys'  },
  { id: 'boys_jun26',  date: 'Friday, June 26',  time: '6:00 PM – 7:00 PM', group: 'Elite Boys'  },
  { id: 'girls_jun5',  date: 'Friday, June 5',   time: '7:00 PM – 8:00 PM', group: 'Elite Girls' },
  { id: 'girls_jun12', date: 'Friday, June 12',  time: '7:00 PM – 8:00 PM', group: 'Elite Girls' },
  { id: 'girls_jun19', date: 'Friday, June 19',  time: '7:00 PM – 8:00 PM', group: 'Elite Girls' },
  { id: 'girls_jun26', date: 'Friday, June 26',  time: '7:00 PM – 8:00 PM', group: 'Elite Girls' },
]

const GROUP_LABELS = ['Elite Boys', 'Elite Girls']

const FOCUS_AREAS = [
  { id: 'ball_mastery', label: 'Ball Mastery',        icon: '⚽', desc: 'First touch, close control, confidence on the ball' },
  { id: 'one_v_one',   label: '1v1 / Dribbling',      icon: '🔥', desc: 'Beat defenders, attack space, create chances' },
  { id: 'passing',     label: 'Passing & Receiving',  icon: '🎯', desc: 'Short, long, switching play and receiving under pressure' },
  { id: 'finishing',   label: 'Finishing & Shooting', icon: '🥅', desc: 'Finishing, volleys, positioning in front of goal' },
  { id: 'positional',  label: 'Positional Play',      icon: '🧠', desc: 'Decision making, movement, functional training' },
  { id: 'defending',   label: 'Defending',             icon: '🛡️', desc: 'Pressing, positioning, winning the ball back' },
  { id: 'fitness',     label: 'Speed & Fitness',      icon: '💨', desc: 'Acceleration, agility, game fitness' },
  { id: 'overall',     label: 'Overall Development',  icon: '📈', desc: 'Balanced program across all areas' },
]

const AGE_GROUPS = ['U8','U9','U10','U11','U12','U13','U14','U15','U16','U17','U18','Adult']
const LEVELS = [
  { value: 'recreational', label: 'Recreational' },
  { value: 'competitive',  label: 'Competitive' },
  { value: 'ecnl_mls',    label: 'ECNL / MLS Next' },
  { value: 'ga',           label: 'GA' },
]
const GENDERS = ['Male', 'Female', 'Other / Prefer not to say']
const STRONG_FEET = [
  { id: 'right', label: 'Right', icon: '👟' },
  { id: 'left',  label: 'Left',  icon: '👟' },
  { id: 'both',  label: 'Both',  icon: '⚡' },
]
const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']
const TIME_PREFS = [
  { id: 'morning',   label: 'Morning',   sub: '8am – 12pm', icon: '🌅' },
  { id: 'afternoon', label: 'Afternoon', sub: '12pm – 5pm', icon: '☀️' },
  { id: 'evening',   label: 'Evening',   sub: '5pm – 8pm',  icon: '🌆' },
]

const STEPS_INDIVIDUAL = ['Format', 'Focus', 'Player', 'Contact', 'Schedule', 'Review']
const STEPS_GROUP       = ['Format', 'Sessions', 'Player', 'Contact', 'Review']

type SlotAvailability = { id: string; registered: number; capacity: number; available: number }

// ─── Component ───────────────────────────────────────────────────────────────

function BookingFlow() {
  const searchParams = useSearchParams()
  const cancelled = searchParams.get('cancelled')

  const [step, setStep]         = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]       = useState('')
  const [availability, setAvailability] = useState<SlotAvailability[]>([])

  const [format, setFormat]         = useState<string | null>(null)
  const [groupPlan, setGroupPlan]   = useState<'dropin' | 'monthly' | null>(null)
  const [groupSessions, setGroupSessions] = useState<string[]>([])
  const [focusAreas, setFocusAreas] = useState<string[]>([])
  const [player, setPlayer] = useState({
    name: '', age_group: '', level: '', club: '', gender: '', strong_foot: '',
  })
  const [contact, setContact] = useState({
    parent_name: '', email: '', phone: '',
  })
  const [schedule, setSchedule] = useState({
    preferred_days: [] as string[], time_pref: '', notes: '',
  })

  useEffect(() => {
    fetch('/api/group-slots').then(r => r.json()).then(setAvailability).catch(() => {})
  }, [])

  function slotAvail(id: string) {
    return availability.find(a => a.id === id)
  }

  const selectedFormat = FORMATS.find(f => f.id === format)
  const isGroup        = format === 'group'
  const STEPS          = isGroup ? STEPS_GROUP : STEPS_INDIVIDUAL
  const reviewStep     = isGroup ? 4 : 5
  const isReviewStep   = step === reviewStep
  const sessionTypeId  = isGroup ? (groupPlan === 'monthly' ? 'group_month' : 'group_dropin') : format || ''

  const PRICES: Record<string, number> = {
    individual: 105, semi: 75, group_dropin: 50, group_month: 150,
  }
  const basePrice = PRICES[sessionTypeId] || 0
  const fee       = Math.round(basePrice * 0.035 * 100) / 100
  const total     = basePrice + fee

  function toggleFocus(id: string) {
    setFocusAreas(f => f.includes(id) ? f.filter(x => x !== id) : [...f, id])
  }

  function toggleGroupSession(id: string) {
    setGroupSessions(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id])
  }

  function toggleDay(day: string) {
    setSchedule(s => ({
      ...s,
      preferred_days: s.preferred_days.includes(day)
        ? s.preferred_days.filter(d => d !== day)
        : [...s.preferred_days, day],
    }))
  }

  function canProceed() {
    if (step === 0) return format !== null
    if (isGroup) {
      if (step === 1) return groupSessions.length > 0 && groupPlan !== null
      if (step === 2) return player.name.trim() !== '' && player.age_group !== '' && player.strong_foot !== ''
      if (step === 3) return contact.parent_name.trim() !== '' && contact.email.trim() !== ''
      return true
    }
    if (step === 1) return focusAreas.length > 0
    if (step === 2) return player.name.trim() !== '' && player.age_group !== '' && player.strong_foot !== ''
    if (step === 3) return contact.parent_name.trim() !== '' && contact.email.trim() !== ''
    if (step === 4) return schedule.preferred_days.length > 0 && schedule.time_pref !== ''
    return true
  }

  async function checkout() {
    setSubmitting(true)
    setError('')

    const groupSessionLabels = groupSessions.map(id => {
      const s = GROUP_SESSIONS.find(s => s.id === id)
      return s ? `${s.group} – ${s.date}` : id
    }).join(', ')

    const focusLabel = focusAreas.map(id => FOCUS_AREAS.find(f => f.id === id)?.label).filter(Boolean).join(', ')

    const notes = [
      isGroup
        ? (groupSessionLabels ? `Sessions: ${groupSessionLabels}` : '')
        : (focusLabel ? `Focus: ${focusLabel}` : ''),
      player.level       ? `Level: ${player.level}` : '',
      player.club        ? `Club: ${player.club}` : '',
      player.gender      ? `Gender: ${player.gender}` : '',
      player.strong_foot ? `Strong foot: ${player.strong_foot}` : '',
      !isGroup && schedule.preferred_days.length ? `Preferred days: ${schedule.preferred_days.join(', ')}` : '',
      !isGroup && schedule.time_pref ? `Preferred time: ${schedule.time_pref}` : '',
      schedule.notes,
    ].filter(Boolean).join(' | ')

    const res = await fetch('/api/book/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_type: sessionTypeId,
        player_name: player.name,
        parent_name: contact.parent_name,
        email: contact.email,
        phone: contact.phone,
        age_group: player.age_group,
        preferred_date: isGroup ? groupSessionLabels : schedule.preferred_days.join(', '),
        notes,
        ...(isGroup ? { selected_slot_ids: groupSessions } : {}),
      }),
    })
    const data = await res.json()
    if (data.url) {
      window.location.href = data.url
    } else {
      setError(data.error || 'Something went wrong. Please try again.')
      setSubmitting(false)
    }
  }

  const progress = (step / (STEPS.length - 1)) * 100

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-zinc-900 px-4 py-4">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="PTG" width={32} height={32} />
            <p className="font-black text-[#cee800] tracking-widest text-sm">PRO TRAINING GROUP</p>
          </div>
          <a href="https://trainatptg.com" className="text-zinc-500 text-xs hover:text-white transition">
            trainatptg.com
          </a>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-zinc-900">
        <div className="h-full bg-[#cee800] transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>

      <div className="max-w-xl mx-auto p-4 md:p-6">
        {cancelled && (
          <div className="bg-red-900/20 border border-red-800 rounded-xl px-4 py-3 mb-6 text-red-400 text-sm">
            Booking cancelled — no charge was made.
          </div>
        )}

        <p className="text-zinc-500 text-xs font-semibold uppercase tracking-widest mb-2">
          Step {step + 1} of {STEPS.length} — {STEPS[step]}
        </p>

        {/* ── Step 0: Format ── */}
        {step === 0 && (
          <div>
            <h1 className="text-3xl font-black mb-1">What are you looking for?</h1>
            <p className="text-zinc-400 mb-6">Choose the training format that fits your goals.</p>

            <div className="space-y-3 mb-6">
              {FORMATS.map(f => (
                <button key={f.id}
                  onClick={() => { setFormat(f.id); setGroupSessions([]); setGroupPlan(null) }}
                  className={`w-full text-left rounded-2xl p-5 border transition ${
                    format === f.id ? 'border-[#cee800] bg-zinc-900' : 'border-zinc-800 bg-zinc-900 hover:border-zinc-600'
                  }`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <span className="text-3xl">{f.icon}</span>
                      <div>
                        <p className="font-black text-lg">{f.label}</p>
                        <p className="text-[#cee800] text-sm font-semibold mb-1">{f.tagline}</p>
                        <p className="text-zinc-400 text-sm">{f.desc}</p>
                      </div>
                    </div>
                    {'priceDropin' in f && (
                      <div className="text-right shrink-0">
                        <p className="font-black">${f.priceDropin} drop-in</p>
                        <p className="text-zinc-400 text-sm">${f.priceMonthly}/mo</p>
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Step 1 (Group): Choose Sessions ── */}
        {step === 1 && isGroup && (
          <div>
            <h1 className="text-3xl font-black mb-1">Choose your sessions</h1>
            <p className="text-zinc-400 mb-5">Select the Friday sessions you want to join. Pick one or all four.</p>

            {/* Plan toggle */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              {[
                { id: 'dropin',  label: 'Drop-In',     price: '$50',  sub: 'Single session' },
                { id: 'monthly', label: 'Full Series', price: '$150', sub: 'All 4 sessions' },
              ].map(opt => (
                <button key={opt.id}
                  onClick={() => setGroupPlan(opt.id as 'dropin' | 'monthly')}
                  className={`rounded-2xl p-4 border text-center transition ${
                    groupPlan === opt.id ? 'border-[#cee800] bg-zinc-900' : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700'
                  }`}>
                  <p className="font-black text-base">{opt.label}</p>
                  <p className="text-[#cee800] font-black text-xl mt-0.5">{opt.price}</p>
                  <p className="text-zinc-500 text-xs mt-1">{opt.sub}</p>
                </button>
              ))}
            </div>

            {/* Session cards grouped by program */}
            <div className="space-y-5 mb-6">
              {GROUP_LABELS.map(label => (
                <div key={label}>
                  <p className="text-xs font-black uppercase tracking-widest text-zinc-400 mb-2">{label}</p>
                  <div className="space-y-2">
                    {GROUP_SESSIONS.filter(s => s.group === label).map(s => {
                      const avail = slotAvail(s.id)
                      const isFull = avail ? avail.available <= 0 : false
                      const spotsLeft = avail ? avail.available : null
                      const isSelected = groupSessions.includes(s.id)
                      return (
                      <button key={s.id}
                        onClick={() => !isFull && toggleGroupSession(s.id)}
                        disabled={isFull && !isSelected}
                        className={`w-full text-left rounded-2xl p-4 border transition flex items-center gap-4 ${
                          isFull && !isSelected
                            ? 'border-zinc-800 bg-zinc-900/50 opacity-60 cursor-not-allowed'
                            : isSelected
                            ? 'border-[#cee800] bg-zinc-900'
                            : 'border-zinc-800 bg-zinc-900 hover:border-zinc-600'
                        }`}>
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-base">{s.date}</p>
                          <p className="text-[#cee800] text-sm font-semibold">{s.time}</p>
                          {isFull ? (
                            <p className="text-red-400 text-xs font-bold mt-0.5">FULL</p>
                          ) : spotsLeft !== null && spotsLeft <= 4 ? (
                            <p className="text-yellow-400 text-xs font-semibold mt-0.5">{spotsLeft} spot{spotsLeft !== 1 ? 's' : ''} left</p>
                          ) : spotsLeft !== null ? (
                            <p className="text-zinc-500 text-xs mt-0.5">{spotsLeft} spots available</p>
                          ) : null}
                        </div>
                        <div className={`w-6 h-6 rounded-full border-2 shrink-0 flex items-center justify-center transition ${
                          isSelected ? 'border-[#cee800] bg-[#cee800]' : 'border-zinc-600'
                        }`}>
                          {isSelected && <span className="text-black text-xs font-black">✓</span>}
                        </div>
                      </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Step 1 (Individual/Semi): Focus Areas ── */}
        {step === 1 && !isGroup && (
          <div>
            <h1 className="text-3xl font-black mb-1">What do you want to work on?</h1>
            <p className="text-zinc-400 mb-6">Select all that apply — this helps us match the right coach and plan.</p>

            <div className="grid grid-cols-1 gap-2 mb-6">
              {FOCUS_AREAS.map(f => (
                <button key={f.id} onClick={() => toggleFocus(f.id)}
                  className={`text-left rounded-2xl p-4 border transition flex items-center gap-4 ${
                    focusAreas.includes(f.id) ? 'border-[#cee800] bg-zinc-900' : 'border-zinc-800 bg-zinc-900 hover:border-zinc-600'
                  }`}>
                  <span className="text-2xl shrink-0">{f.icon}</span>
                  <div>
                    <p className="font-black">{f.label}</p>
                    <p className="text-zinc-400 text-sm">{f.desc}</p>
                  </div>
                  <div className={`ml-auto w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition ${
                    focusAreas.includes(f.id) ? 'border-[#cee800] bg-[#cee800]' : 'border-zinc-600'
                  }`}>
                    {focusAreas.includes(f.id) && <span className="text-black text-xs font-black">✓</span>}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Step 2: Player Info ── */}
        {step === 2 && (
          <div>
            <h1 className="text-3xl font-black mb-1">Tell us about your player</h1>
            <p className="text-zinc-400 mb-6">This helps us personalize the training experience from day one.</p>

            <div className="space-y-4 mb-6">
              <div>
                <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Player's Full Name *</label>
                <input value={player.name} onChange={e => setPlayer(p => ({ ...p, name: e.target.value }))}
                  placeholder="First and last name" required
                  className="mt-1 w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-[#cee800]" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Age Group *</label>
                  <select value={player.age_group} onChange={e => setPlayer(p => ({ ...p, age_group: e.target.value }))}
                    className="mt-1 w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#cee800]">
                    <option value="">Select</option>
                    {AGE_GROUPS.map(a => <option key={a}>{a}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Gender</label>
                  <select value={player.gender} onChange={e => setPlayer(p => ({ ...p, gender: e.target.value }))}
                    className="mt-1 w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#cee800]">
                    <option value="">Select</option>
                    {GENDERS.map(g => <option key={g}>{g}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Current Level</label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {LEVELS.map(l => (
                    <button key={l.value} type="button" onClick={() => setPlayer(p => ({ ...p, level: l.value }))}
                      className={`py-2.5 px-3 rounded-xl text-sm font-semibold border transition text-left ${
                        player.level === l.value ? 'border-[#cee800] bg-zinc-800 text-white' : 'border-zinc-700 text-zinc-400 hover:border-zinc-500'
                      }`}>
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Strong Foot *</label>
                <div className="grid grid-cols-3 gap-2 mt-1">
                  {STRONG_FEET.map(f => (
                    <button key={f.id} type="button" onClick={() => setPlayer(p => ({ ...p, strong_foot: f.id }))}
                      className={`py-3 rounded-xl border text-sm font-black transition ${
                        player.strong_foot === f.id ? 'border-[#cee800] bg-zinc-800 text-white' : 'border-zinc-700 text-zinc-400 hover:border-zinc-500'
                      }`}>
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Club / Team (optional)</label>
                <input value={player.club} onChange={e => setPlayer(p => ({ ...p, club: e.target.value }))}
                  placeholder="e.g. FC Dallas, Real Colorado, None"
                  className="mt-1 w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-[#cee800]" />
              </div>
            </div>
          </div>
        )}

        {/* ── Step 3: Contact ── */}
        {step === 3 && (
          <div>
            <h1 className="text-3xl font-black mb-1">Who should we contact?</h1>
            <p className="text-zinc-400 mb-6">We'll send your confirmation and account invite here.</p>

            <div className="space-y-4 mb-6">
              <div>
                <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Parent / Guardian Name *</label>
                <input value={contact.parent_name} onChange={e => setContact(c => ({ ...c, parent_name: e.target.value }))}
                  placeholder="Full name" required
                  className="mt-1 w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-[#cee800]" />
              </div>
              <div>
                <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Email Address *</label>
                <input type="email" value={contact.email} onChange={e => setContact(c => ({ ...c, email: e.target.value }))}
                  placeholder="you@example.com" required
                  className="mt-1 w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-[#cee800]" />
              </div>
              <div>
                <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Phone Number</label>
                <input type="tel" value={contact.phone} onChange={e => setContact(c => ({ ...c, phone: e.target.value }))}
                  placeholder="(555) 000-0000"
                  className="mt-1 w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-[#cee800]" />
              </div>
              {!isGroup && (
                <div>
                  <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Anything else we should know?</label>
                  <textarea value={schedule.notes} onChange={e => setSchedule(s => ({ ...s, notes: e.target.value }))} rows={3}
                    placeholder="Injuries, scheduling constraints, specific goals, coach requests..."
                    className="mt-1 w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-[#cee800] resize-none text-sm" />
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Step 4 (Individual/Semi): Schedule ── */}
        {step === 4 && !isGroup && (
          <div>
            <h1 className="text-3xl font-black mb-1">When works for you?</h1>
            <p className="text-zinc-400 mb-6">We'll confirm exact timing after reviewing availability with your coach.</p>

            <div className="space-y-5 mb-6">
              <div>
                <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider mb-2 block">
                  Preferred Days * <span className="text-zinc-600 normal-case font-normal">(select all that work)</span>
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {DAYS.map(day => (
                    <button key={day} type="button" onClick={() => toggleDay(day)}
                      className={`py-2.5 rounded-xl border text-sm font-black transition ${
                        schedule.preferred_days.includes(day)
                          ? 'border-[#cee800] bg-zinc-800 text-white'
                          : 'border-zinc-700 text-zinc-400 hover:border-zinc-500'
                      }`}>
                      {day.slice(0, 3)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider mb-2 block">
                  Preferred Time of Day *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {TIME_PREFS.map(t => (
                    <button key={t.id} type="button" onClick={() => setSchedule(s => ({ ...s, time_pref: t.id }))}
                      className={`rounded-xl p-3 border text-center transition ${
                        schedule.time_pref === t.id ? 'border-[#cee800] bg-zinc-800' : 'border-zinc-700 hover:border-zinc-500'
                      }`}>
                      <p className="text-xl mb-1">{t.icon}</p>
                      <p className="font-black text-sm">{t.label}</p>
                      <p className="text-zinc-500 text-xs">{t.sub}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Anything else we should know?</label>
                <textarea value={schedule.notes} onChange={e => setSchedule(s => ({ ...s, notes: e.target.value }))} rows={3}
                  placeholder="Injuries, scheduling constraints, specific goals, coach requests..."
                  className="mt-1 w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-[#cee800] resize-none text-sm" />
              </div>
            </div>
          </div>
        )}

        {/* ── Review: Group ── */}
        {step === 4 && isGroup && selectedFormat && (
          <div>
            <h1 className="text-3xl font-black mb-1">Looks good?</h1>
            <p className="text-zinc-400 mb-6">Review your registration before heading to payment.</p>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 mb-6 space-y-4">
              {/* Plan */}
              <div className="flex items-center gap-3 pb-4 border-b border-zinc-800">
                <span className="text-2xl">🏆</span>
                <div>
                  <p className="font-black text-lg">
                    Group Training — {groupPlan === 'monthly' ? 'Full Series' : 'Drop-In'}
                  </p>
                  <p className="text-zinc-400 text-sm">{selectedFormat.tagline}</p>
                </div>
              </div>

              {/* Selected sessions */}
              <div>
                <p className="text-zinc-500 text-xs uppercase tracking-wider mb-3">Selected Sessions</p>
                <div className="space-y-2">
                  {groupSessions.map(id => {
                    const s = GROUP_SESSIONS.find(s => s.id === id)
                    return s ? (
                      <div key={id} className="flex items-center gap-3 bg-zinc-800 rounded-xl px-3 py-2.5">
                        <span>⚽</span>
                        <div>
                          <p className="font-semibold text-sm">{s.group} · {s.date}</p>
                          <p className="text-zinc-400 text-xs">{s.time}</p>
                        </div>
                      </div>
                    ) : null
                  })}
                </div>
              </div>

              {/* Player + Contact */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-zinc-800">
                {[
                  ['Player', player.name],
                  ['Age Group', player.age_group],
                  player.strong_foot ? ['Strong Foot', player.strong_foot.charAt(0).toUpperCase() + player.strong_foot.slice(1)] : null,
                  player.level ? ['Level', LEVELS.find(l => l.value === player.level)?.label ?? player.level] : null,
                  player.club ? ['Club', player.club] : null,
                  ['Parent', contact.parent_name],
                  ['Email', contact.email],
                  contact.phone ? ['Phone', contact.phone] : null,
                ].filter((x): x is [string, string] => Array.isArray(x) && !!x[1]).map(([k, v]) => (
                  <div key={k}>
                    <p className="text-zinc-500 text-xs">{k}</p>
                    <p className="font-semibold text-sm">{v}</p>
                  </div>
                ))}
              </div>

              {/* Price */}
              <div className="border-t border-zinc-800 pt-4 space-y-2 text-sm">
                <div className="flex justify-between text-zinc-400">
                  <span>Group Training — {groupPlan === 'monthly' ? 'Full Series' : 'Drop-In'}</span>
                  <span>${basePrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Processing fee (3.5%)</span>
                  <span>${fee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-black text-xl pt-2 border-t border-zinc-800">
                  <span>Total</span>
                  <span className="text-[#cee800]">${total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

            <button onClick={checkout} disabled={submitting}
              className="w-full bg-[#cee800] text-black font-black py-4 rounded-2xl text-lg hover:bg-[#d4f030] transition disabled:opacity-50">
              {submitting ? 'REDIRECTING TO PAYMENT...' : `PAY $${total.toFixed(2)} →`}
            </button>
            <p className="text-zinc-600 text-xs text-center mt-3">
              Secure payment via Stripe · You'll receive a confirmation + account invite by email
            </p>
          </div>
        )}

        {/* ── Review: Individual / Semi ── */}
        {step === 5 && !isGroup && selectedFormat && (
          <div>
            <h1 className="text-3xl font-black mb-1">Looks good?</h1>
            <p className="text-zinc-400 mb-6">Review your booking before heading to payment.</p>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 mb-6 space-y-4">
              <div className="flex items-center gap-3 pb-4 border-b border-zinc-800">
                <span className="text-2xl">{selectedFormat.icon}</span>
                <div>
                  <p className="font-black text-lg">{selectedFormat.label}</p>
                  <p className="text-zinc-400 text-sm">{selectedFormat.tagline}</p>
                </div>
              </div>

              <div>
                <p className="text-zinc-500 text-xs uppercase tracking-wider mb-2">Focus Areas</p>
                <div className="flex flex-wrap gap-2">
                  {focusAreas.map(id => {
                    const f = FOCUS_AREAS.find(f => f.id === id)
                    return f ? (
                      <span key={id} className="text-xs px-3 py-1 bg-zinc-800 rounded-full font-semibold">
                        {f.icon} {f.label}
                      </span>
                    ) : null
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-zinc-800">
                {[
                  ['Player', player.name],
                  ['Age Group', player.age_group],
                  player.strong_foot ? ['Strong Foot', player.strong_foot.charAt(0).toUpperCase() + player.strong_foot.slice(1)] : null,
                  player.level ? ['Level', LEVELS.find(l => l.value === player.level)?.label ?? player.level] : null,
                  player.club ? ['Club', player.club] : null,
                  ['Parent', contact.parent_name],
                  ['Email', contact.email],
                  contact.phone ? ['Phone', contact.phone] : null,
                  schedule.preferred_days.length > 0 ? ['Preferred Days', schedule.preferred_days.map(d => d.slice(0,3)).join(', ')] : null,
                  schedule.time_pref ? ['Time of Day', TIME_PREFS.find(t => t.id === schedule.time_pref)?.label ?? schedule.time_pref] : null,
                ].filter((x): x is [string, string] => Array.isArray(x) && !!x[1]).map(([k, v]) => (
                  <div key={k}>
                    <p className="text-zinc-500 text-xs">{k}</p>
                    <p className="font-semibold text-sm">{v}</p>
                  </div>
                ))}
              </div>

              <div className="border-t border-zinc-800 pt-4 space-y-2 text-sm">
                <div className="flex justify-between text-zinc-400">
                  <span>{selectedFormat.label}</span>
                  <span>${basePrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Processing fee (3.5%)</span>
                  <span>${fee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-black text-xl pt-2 border-t border-zinc-800">
                  <span>Total</span>
                  <span className="text-[#cee800]">${total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

            <button onClick={checkout} disabled={submitting}
              className="w-full bg-[#cee800] text-black font-black py-4 rounded-2xl text-lg hover:bg-[#d4f030] transition disabled:opacity-50">
              {submitting ? 'REDIRECTING TO PAYMENT...' : `PAY $${total.toFixed(2)} →`}
            </button>
            <p className="text-zinc-600 text-xs text-center mt-3">
              Secure payment via Stripe · You'll receive a confirmation + account invite by email
            </p>
          </div>
        )}

        {/* Navigation */}
        {!isReviewStep && (
          <div className="flex gap-3">
            {step > 0 && (
              <button onClick={() => setStep(s => s - 1)}
                className="px-6 py-4 rounded-2xl border border-zinc-700 text-zinc-400 font-black hover:text-white hover:border-zinc-500 transition">
                ←
              </button>
            )}
            <button onClick={() => setStep(s => s + 1)} disabled={!canProceed()}
              className="flex-1 bg-[#cee800] text-black font-black py-4 rounded-2xl text-lg hover:bg-[#d4f030] transition disabled:opacity-30 disabled:cursor-not-allowed">
              {((isGroup && step === 3) || (!isGroup && step === 4)) ? 'Review Booking →' : 'Continue →'}
            </button>
          </div>
        )}

        {isReviewStep && (
          <button onClick={() => setStep(s => s - 1)}
            className="w-full mt-3 text-zinc-500 text-sm hover:text-white transition">
            ← Go back and edit
          </button>
        )}
      </div>
    </div>
  )
}

export default function BookPage() {
  return (
    <Suspense>
      <BookingFlow />
    </Suspense>
  )
}
