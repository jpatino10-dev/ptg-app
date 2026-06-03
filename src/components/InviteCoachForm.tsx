'use client'

import { useState } from 'react'

export default function InviteCoachForm({ onAdded }: { onAdded?: () => void }) {
  const [open, setOpen]       = useState(false)
  const [mode, setMode]       = useState<'link' | 'name-only'>('link')
  const [name, setName]       = useState('')
  const [email, setEmail]     = useState('')
  const [saving, setSaving]   = useState(false)
  const [link, setLink]       = useState('')
  const [copied, setCopied]   = useState(false)
  const [error, setError]     = useState('')

  function reset() {
    setName(''); setEmail(''); setLink(''); setCopied(false); setError(''); setMode('link')
  }

  async function generate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError('')

    if (mode === 'name-only') {
      const res = await fetch('/api/admin/add-coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      const data = await res.json()
      if (res.ok) { setLink('done'); onAdded?.() }
      else setError(data.error || 'Failed to add coach')
      setSaving(false)
      return
    }

    const res = await fetch('/api/admin/generate-coach-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, full_name: name }),
    })
    const data = await res.json()
    if (res.ok) { setLink(data.link); onAdded?.() }
    else setError(data.error || 'Failed to generate link')
    setSaving(false)
  }

  async function copyLink() {
    await navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div>
      <button onClick={() => setOpen(true)}
        className="px-4 py-1.5 bg-[#cee800] text-black font-black text-sm rounded-lg hover:bg-[#d4f030] transition">
        + Add Coach
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => { setOpen(false); reset() }}>
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-sm"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-black text-[#cee800]">ADD COACH</h2>
              <button onClick={() => { setOpen(false); reset() }} className="text-zinc-500 hover:text-white text-xl">✕</button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-5">
              {([['link', 'Login link'], ['name-only', 'Name only']] as const).map(([m, label]) => (
                <button key={m} type="button" onClick={() => { setMode(m); setError('') }}
                  className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition ${
                    mode === m ? 'bg-[#cee800] text-black border-[#cee800]' : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:border-zinc-500'
                  }`}>
                  {label}
                </button>
              ))}
            </div>

            {/* Done state for name-only */}
            {link === 'done' ? (
              <div className="text-center py-4">
                <p className="text-[#cee800] font-black mb-1">Added!</p>
                <p className="text-zinc-400 text-sm">{name} is now assignable to sessions.</p>
                <button onClick={() => { setLink(''); setName('') }}
                  className="mt-4 px-6 py-2 bg-zinc-800 text-white font-black rounded-xl text-sm hover:bg-zinc-700 transition">
                  Add Another
                </button>
              </div>

            /* Link generated — show copy UI */
            ) : link ? (
              <div className="space-y-4">
                <p className="text-zinc-300 text-sm">
                  Send this link to <span className="font-bold text-white">{name}</span>. They click it, set their password, and they&apos;re in.
                </p>
                <div className="bg-zinc-800 rounded-xl p-3 break-all text-xs text-zinc-400 font-mono">
                  {link.slice(0, 60)}…
                </div>
                <button onClick={copyLink}
                  className={`w-full font-black py-3 rounded-xl transition ${copied ? 'bg-[#00e676] text-black' : 'bg-[#cee800] text-black hover:bg-[#d4f030]'}`}>
                  {copied ? '✓ COPIED!' : 'COPY LINK'}
                </button>
                <p className="text-zinc-500 text-xs text-center">Paste it in a text or WhatsApp. Link expires in 24 hours.</p>
                <button onClick={reset} className="w-full text-zinc-500 hover:text-white text-sm transition">
                  Add another coach →
                </button>
              </div>

            /* Form */
            ) : (
              <form onSubmit={generate} className="space-y-4">
                <div>
                  <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Full Name</label>
                  <input required value={name} onChange={e => setName(e.target.value)}
                    placeholder="e.g. Coach Maria"
                    className="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#cee800]" />
                </div>

                {mode === 'link' && (
                  <div>
                    <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Email</label>
                    <input required type="email" value={email} onChange={e => setEmail(e.target.value)}
                      placeholder="coach@email.com"
                      className="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#cee800]" />
                  </div>
                )}

                <p className="text-zinc-500 text-xs">
                  {mode === 'link'
                    ? "Generates a login link you can copy and text directly — no email required."
                    : "Adds to the assignable list now. You can generate a login link later."}
                </p>

                {error && <p className="text-red-400 text-sm">{error}</p>}

                <button type="submit" disabled={saving}
                  className="w-full bg-[#cee800] text-black font-black py-3 rounded-xl hover:bg-[#d4f030] transition disabled:opacity-50">
                  {saving ? 'GENERATING...' : mode === 'link' ? 'GENERATE LINK' : 'ADD COACH'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
