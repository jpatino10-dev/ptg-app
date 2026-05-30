'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

const SIZES = ['YXS', 'YS', 'YM', 'YL', 'YXL', 'AS', 'AM', 'AL', 'AXL', 'AXXL']

const PRICE = 25
const FEE   = Math.round(PRICE * 0.035 * 100) / 100
const TOTAL = PRICE + FEE

function ShirtOrder() {
  const searchParams = useSearchParams()
  const cancelled = searchParams.get('cancelled')

  const [size, setSize]           = useState('')
  const [name, setName]           = useState('')
  const [email, setEmail]         = useState('')
  const [phone, setPhone]         = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]         = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!size) { setError('Please select a size.'); return }
    setSubmitting(true)
    setError('')

    const res = await fetch('/api/book/shirt-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, phone, size }),
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

      <div className="max-w-xl mx-auto p-4 md:p-6">
        {cancelled && (
          <div className="bg-red-900/20 border border-red-800 rounded-xl px-4 py-3 mb-6 text-red-400 text-sm">
            Order cancelled — no charge was made.
          </div>
        )}

        <h1 className="text-3xl font-black mb-1">Order Your PTG Shirt</h1>
        <p className="text-zinc-400 mb-8">Official PTG training shirt — wear it to every session.</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Size selector */}
          <div>
            <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider block mb-3">
              Select Size *
            </label>
            <div className="grid grid-cols-3 gap-2">
              {SIZES.map(s => (
                <button key={s} type="button" onClick={() => setSize(s)}
                  className={`py-3 rounded-xl border text-sm font-black transition ${
                    size === s
                      ? 'border-[#cee800] bg-zinc-800 text-white'
                      : 'border-zinc-700 text-zinc-400 hover:border-zinc-500'
                  }`}>
                  {s}
                </button>
              ))}
            </div>
            <p className="text-zinc-600 text-xs mt-2">Y = Youth · A = Adult</p>
          </div>

          {/* Contact info */}
          <div className="space-y-4">
            <div>
              <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Full Name *</label>
              <input value={name} onChange={e => setName(e.target.value)} required
                placeholder="First and last name"
                className="mt-1 w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-[#cee800]" />
            </div>
            <div>
              <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Email *</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                placeholder="you@example.com"
                className="mt-1 w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-[#cee800]" />
            </div>
            <div>
              <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Phone (optional)</label>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                placeholder="(555) 000-0000"
                className="mt-1 w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-[#cee800]" />
            </div>
          </div>

          {/* Order summary */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-2 text-sm">
            <div className="flex justify-between text-zinc-400">
              <span>PTG Shirt{size ? ` — ${size}` : ''}</span>
              <span>${PRICE.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-zinc-400">
              <span>Processing fee (3.5%)</span>
              <span>${FEE.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-black text-xl pt-2 border-t border-zinc-800">
              <span>Total</span>
              <span className="text-[#cee800]">${TOTAL.toFixed(2)}</span>
            </div>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button type="submit" disabled={submitting || !size || !name || !email}
            className="w-full bg-[#cee800] text-black font-black py-4 rounded-2xl text-lg hover:bg-[#d4f030] transition disabled:opacity-30 disabled:cursor-not-allowed">
            {submitting ? 'REDIRECTING TO PAYMENT...' : `PAY $${TOTAL.toFixed(2)} →`}
          </button>
          <p className="text-zinc-600 text-xs text-center">
            Secure payment via Stripe
          </p>
        </form>
      </div>
    </div>
  )
}

export default function ShirtPage() {
  return (
    <Suspense>
      <ShirtOrder />
    </Suspense>
  )
}
