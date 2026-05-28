'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

const SESSION_TYPES = [
  {
    id: 'individual',
    label: 'Individual',
    price: 105,
    desc: '1-on-1 with your coach. Full focus on your game.',
    color: '#cee800',
  },
  {
    id: 'semi',
    label: 'Semi-Private',
    price: 75,
    desc: '2 players, shared coaching time. Great for teammates.',
    color: '#00e5ff',
  },
  {
    id: 'duo',
    label: 'Duo',
    price: 85,
    desc: 'You + one partner. Split the cost, double the energy.',
    color: '#ff6b35',
  },
  {
    id: 'group_dropin',
    label: 'Group Drop-In',
    price: 50,
    desc: 'Single group training session. No commitment.',
    color: '#00e676',
  },
  {
    id: 'group_month',
    label: 'Group Monthly',
    price: 150,
    desc: 'Full month of group sessions. Best value.',
    color: '#b388ff',
  },
]

type Step = 'type' | 'info' | 'review'

function BookingForm() {
  const searchParams = useSearchParams()
  const cancelled = searchParams.get('cancelled')

  const [step, setStep]               = useState<Step>('type')
  const [sessionType, setSessionType] = useState<string | null>(null)
  const [submitting, setSubmitting]   = useState(false)
  const [error, setError]             = useState('')
  const [form, setForm] = useState({
    player_name: '', parent_name: '', email: '', phone: '',
    age_group: '', preferred_date: '', notes: '',
  })

  const selected = SESSION_TYPES.find(t => t.id === sessionType)
  const fee = selected ? Math.round(selected.price * 0.035 * 100) / 100 : 0
  const total = selected ? selected.price + fee : 0

  function field(key: keyof typeof form, label: string, type = 'text', placeholder = '', required = false) {
    return (
      <div key={key}>
        <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">
          {label}{required && ' *'}
        </label>
        <input
          type={type}
          required={required}
          value={form[key]}
          placeholder={placeholder}
          onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
          className="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-[#cee800] text-sm"
        />
      </div>
    )
  }

  async function checkout() {
    setSubmitting(true)
    setError('')
    const res = await fetch('/api/book/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_type: sessionType, ...form }),
    })
    const data = await res.json()
    if (data.url) {
      window.location.href = data.url
    } else {
      setError(data.error || 'Something went wrong. Please try again.')
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-zinc-900 px-4 py-4 flex items-center justify-between max-w-2xl mx-auto">
        <div className="flex items-center gap-3">
          <Image src="/logo.png" alt="PTG" width={36} height={36} />
          <div>
            <p className="font-black text-[#cee800] tracking-widest text-sm">PRO TRAINING GROUP</p>
            <p className="text-zinc-500 text-xs">Book a Session</p>
          </div>
        </div>
        <a href="https://trainatptg.com" className="text-zinc-500 text-sm hover:text-white transition">
          trainatptg.com
        </a>
      </div>

      <div className="max-w-2xl mx-auto p-4 md:p-6">

        {cancelled && (
          <div className="bg-red-900/20 border border-red-800 rounded-xl px-4 py-3 mb-6 text-red-400 text-sm">
            Booking cancelled — no charge was made. You can try again below.
          </div>
        )}

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-8">
          {(['type', 'info', 'review'] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition ${
                step === s ? 'bg-[#cee800] text-black' :
                ['type','info','review'].indexOf(step) > i ? 'bg-zinc-700 text-zinc-300' : 'bg-zinc-800 text-zinc-600'
              }`}>{i + 1}</div>
              <span className={`text-xs font-semibold capitalize hidden sm:block ${step === s ? 'text-white' : 'text-zinc-600'}`}>
                {s === 'type' ? 'Session' : s === 'info' ? 'Your Info' : 'Review'}
              </span>
              {i < 2 && <div className="w-8 h-px bg-zinc-800 mx-1" />}
            </div>
          ))}
        </div>

        {/* Step 1 — Session type */}
        {step === 'type' && (
          <div>
            <h1 className="text-2xl font-black mb-1">Choose a Session</h1>
            <p className="text-zinc-400 text-sm mb-6">All sessions are held at our training facility.</p>

            <div className="space-y-3 mb-8">
              {SESSION_TYPES.map(t => (
                <button key={t.id} onClick={() => setSessionType(t.id)}
                  className={`w-full text-left rounded-2xl p-5 border transition ${
                    sessionType === t.id
                      ? 'border-[#cee800] bg-zinc-900'
                      : 'border-zinc-800 bg-zinc-900 hover:border-zinc-600'
                  }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
                      <div>
                        <p className="font-black">{t.label}</p>
                        <p className="text-zinc-400 text-sm">{t.desc}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-4">
                      <p className="font-black text-lg">${t.price}</p>
                      <p className="text-zinc-500 text-xs">+ 3.5% fee</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <button onClick={() => setStep('info')} disabled={!sessionType}
              className="w-full bg-[#cee800] text-black font-black py-4 rounded-2xl text-lg hover:bg-[#d4f030] transition disabled:opacity-30 disabled:cursor-not-allowed">
              Continue →
            </button>
          </div>
        )}

        {/* Step 2 — Player/parent info */}
        {step === 'info' && (
          <div>
            <button onClick={() => setStep('type')} className="text-zinc-500 text-sm hover:text-white mb-4 transition">
              ← Back
            </button>
            <h1 className="text-2xl font-black mb-1">Your Information</h1>
            <p className="text-zinc-400 text-sm mb-6">We'll use this to set up your booking and send confirmation.</p>

            <div className="space-y-4 mb-8">
              {field('player_name', "Player's Full Name", 'text', 'First and last name', true)}
              {field('parent_name', 'Parent / Guardian Name', 'text', 'If booking for a child', false)}
              {field('email', 'Email Address', 'email', 'you@example.com', true)}
              {field('phone', 'Phone Number', 'tel', '(555) 000-0000', false)}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  {field('age_group', 'Age Group', 'text', 'e.g. U12, U15, Adult', false)}
                </div>
                <div>
                  {field('preferred_date', 'Preferred Date', 'date', '', false)}
                </div>
              </div>
              <div>
                <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Notes (optional)</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={3}
                  placeholder="Goals, injuries, coach preference, scheduling notes..."
                  className="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-[#cee800] text-sm resize-none"
                />
              </div>
            </div>

            <button
              onClick={() => {
                if (!form.player_name || !form.email) {
                  setError('Player name and email are required.')
                  return
                }
                setError('')
                setStep('review')
              }}
              className="w-full bg-[#cee800] text-black font-black py-4 rounded-2xl text-lg hover:bg-[#d4f030] transition">
              Review Booking →
            </button>
            {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
          </div>
        )}

        {/* Step 3 — Review + pay */}
        {step === 'review' && selected && (
          <div>
            <button onClick={() => setStep('info')} className="text-zinc-500 text-sm hover:text-white mb-4 transition">
              ← Back
            </button>
            <h1 className="text-2xl font-black mb-6">Review & Pay</h1>

            {/* Order summary */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 mb-6">
              <div className="flex items-center gap-3 mb-4 pb-4 border-b border-zinc-800">
                <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: selected.color }} />
                <div>
                  <p className="font-black">{selected.label}</p>
                  <p className="text-zinc-400 text-sm">{selected.desc}</p>
                </div>
              </div>

              <div className="space-y-2 text-sm mb-4">
                {[
                  ['Player', form.player_name],
                  form.parent_name && ['Parent', form.parent_name],
                  ['Email', form.email],
                  form.phone && ['Phone', form.phone],
                  form.age_group && ['Age Group', form.age_group],
                  form.preferred_date && ['Preferred Date', form.preferred_date],
                ].filter(Boolean).map(([k, v]) => (
                  <div key={k as string} className="flex justify-between">
                    <span className="text-zinc-500">{k}</span>
                    <span className="font-semibold">{v}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-zinc-800 pt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-zinc-400">{selected.label}</span>
                  <span>${selected.price.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Processing fee (3.5%)</span>
                  <span>${fee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-black text-lg pt-2 border-t border-zinc-800 mt-2">
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
              Secure payment via Stripe. You'll be emailed a confirmation and account invite after payment.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default function BookPage() {
  return (
    <Suspense>
      <BookingForm />
    </Suspense>
  )
}
