'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'

interface PromoCode {
  id: string
  code: string
  active: boolean
  discount: string
  percent_off: number | null
  amount_off: number | null
  times_redeemed: number
  max_redemptions: number | null
  expires_at: number | null
  created: number
}

export default function DiscountsPage() {
  const [codes, setCodes] = useState<PromoCode[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const [form, setForm] = useState({
    code: '',
    discount_type: 'percent',
    discount_amount: '',
    max_redemptions: '',
    expires_at: '',
  })

  async function load() {
    setLoading(true)
    const res = await fetch('/api/admin/discounts')
    const data = await res.json()
    setCodes(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setSubmitting(true)

    const res = await fetch('/api/admin/discounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: form.code,
        discount_type: form.discount_type,
        discount_amount: form.discount_amount,
        max_redemptions: form.max_redemptions || null,
        expires_at: form.expires_at || null,
      }),
    })

    const data = await res.json()
    setSubmitting(false)

    if (!res.ok) {
      setError(data.error || 'Failed to create code')
    } else {
      setSuccess(`Code "${data.code}" created!`)
      setForm({ code: '', discount_type: 'percent', discount_amount: '', max_redemptions: '', expires_at: '' })
      setShowForm(false)
      load()
    }
  }

  async function toggleActive(id: string, current: boolean) {
    setTogglingId(id)
    await fetch(`/api/admin/discounts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !current }),
    })
    setCodes(prev => prev.map(c => c.id === id ? { ...c, active: !current } : c))
    setTogglingId(null)
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Link href="/admin" className="text-zinc-500 hover:text-white transition">
            <Image src="/logo.png" alt="PTG" width={36} height={36} />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-[#cee800] tracking-widest">DISCOUNT CODES</h1>
            <p className="text-zinc-400 text-sm">Manage Stripe promotion codes</p>
          </div>
          <button
            onClick={() => { setShowForm(v => !v); setError(''); setSuccess('') }}
            className="ml-auto bg-[#cee800] text-black font-black px-4 py-2 rounded-xl hover:bg-[#d4f030] transition text-sm"
          >
            {showForm ? 'Cancel' : '+ New Code'}
          </button>
        </div>

        {success && (
          <div className="bg-[#cee800]/10 border border-[#cee800]/30 text-[#cee800] rounded-xl px-4 py-3 text-sm mb-6">
            {success}
          </div>
        )}

        {showForm && (
          <form onSubmit={handleCreate} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-6 space-y-4">
            <h2 className="font-black text-lg">Create Promotion Code</h2>

            <div>
              <label className="block text-xs text-zinc-400 mb-1">Code (e.g. SUMMER20)</label>
              <input
                required
                value={form.code}
                onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase().replace(/\s+/g, '') }))}
                placeholder="PTGTEST"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#cee800] uppercase"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Discount Type</label>
                <select
                  value={form.discount_type}
                  onChange={e => setForm(f => ({ ...f, discount_type: e.target.value }))}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#cee800]"
                >
                  <option value="percent">Percentage (%)</option>
                  <option value="fixed">Fixed Amount ($)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">
                  {form.discount_type === 'percent' ? 'Percent Off (e.g. 100)' : 'Amount Off (e.g. 20)'}
                </label>
                <input
                  required
                  type="number"
                  min="1"
                  max={form.discount_type === 'percent' ? '100' : undefined}
                  value={form.discount_amount}
                  onChange={e => setForm(f => ({ ...f, discount_amount: e.target.value }))}
                  placeholder={form.discount_type === 'percent' ? '100' : '20'}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#cee800]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Max Redemptions (optional)</label>
                <input
                  type="number"
                  min="1"
                  value={form.max_redemptions}
                  onChange={e => setForm(f => ({ ...f, max_redemptions: e.target.value }))}
                  placeholder="Unlimited"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#cee800]"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Expiry Date (optional)</label>
                <input
                  type="date"
                  value={form.expires_at}
                  onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#cee800]"
                />
              </div>
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-[#cee800] text-black font-black py-3 rounded-xl hover:bg-[#d4f030] transition text-sm disabled:opacity-50"
            >
              {submitting ? 'Creating...' : 'Create Code'}
            </button>
          </form>
        )}

        {loading ? (
          <div className="text-zinc-500 text-sm text-center py-12">Loading...</div>
        ) : codes.length === 0 ? (
          <div className="text-zinc-500 text-sm text-center py-12">No discount codes yet.</div>
        ) : (
          <div className="space-y-3">
            {codes.map(c => (
              <div key={c.id} className={`bg-zinc-900 border rounded-2xl p-5 flex items-center justify-between gap-4 ${c.active ? 'border-zinc-800' : 'border-zinc-800/50 opacity-60'}`}>
                <div className="flex items-center gap-4 min-w-0">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-lg tracking-wider">{c.code}</span>
                      {!c.active && <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full">Inactive</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-sm text-zinc-400 flex-wrap">
                      <span className="text-[#cee800] font-semibold">{c.discount}</span>
                      <span>·</span>
                      <span>{c.times_redeemed} use{c.times_redeemed !== 1 ? 's' : ''}{c.max_redemptions ? ` / ${c.max_redemptions} max` : ''}</span>
                      {c.expires_at && (
                        <>
                          <span>·</span>
                          <span>Expires {new Date(c.expires_at * 1000).toLocaleDateString()}</span>
                        </>
                      )}
                      <span>·</span>
                      <span>Created {new Date(c.created * 1000).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => toggleActive(c.id, c.active)}
                  disabled={togglingId === c.id}
                  className={`shrink-0 text-xs font-bold px-3 py-1.5 rounded-lg transition ${
                    c.active
                      ? 'bg-zinc-800 text-zinc-300 hover:bg-red-900/40 hover:text-red-400'
                      : 'bg-zinc-800 text-zinc-400 hover:bg-[#cee800]/20 hover:text-[#cee800]'
                  } disabled:opacity-50`}
                >
                  {togglingId === c.id ? '...' : c.active ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
