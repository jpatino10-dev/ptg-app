'use client'

import { useState } from 'react'

export default function InviteCoachForm() {
  const [open, setOpen]       = useState(false)
  const [name, setName]       = useState('')
  const [email, setEmail]     = useState('')
  const [saving, setSaving]   = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError]     = useState('')

  async function send(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')
    const res = await fetch('/api/admin/invite-coach', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, full_name: name }),
    })
    const data = await res.json()
    if (res.ok) {
      setSuccess(`Invite sent to ${email}`)
      setName('')
      setEmail('')
    } else {
      setError(data.error || 'Failed to send invite')
    }
    setSaving(false)
  }

  return (
    <div>
      <button onClick={() => setOpen(true)}
        className="px-4 py-1.5 bg-[#cee800] text-black font-black text-sm rounded-lg hover:bg-[#d4f030] transition">
        + Invite Coach
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setOpen(false)}>
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-sm"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-black text-[#cee800]">INVITE COACH</h2>
              <button onClick={() => setOpen(false)} className="text-zinc-500 hover:text-white text-xl">✕</button>
            </div>

            {success ? (
              <div className="text-center py-4">
                <p className="text-[#cee800] font-black mb-1">Invite sent!</p>
                <p className="text-zinc-400 text-sm">{success}</p>
                <p className="text-zinc-500 text-xs mt-2">They'll receive an email to set their password and access the coach portal.</p>
                <button onClick={() => { setSuccess(''); setOpen(false) }}
                  className="mt-4 px-6 py-2 bg-zinc-800 text-white font-black rounded-xl text-sm hover:bg-zinc-700 transition">
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={send} className="space-y-4">
                <div>
                  <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Full Name</label>
                  <input required value={name} onChange={e => setName(e.target.value)}
                    placeholder="Coach name"
                    className="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#cee800]" />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Email</label>
                  <input required type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="coach@email.com"
                    className="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#cee800]" />
                </div>
                {error && <p className="text-red-400 text-sm">{error}</p>}
                <p className="text-zinc-500 text-xs">They'll receive an email invite to set their password and access the coach portal.</p>
                <button type="submit" disabled={saving}
                  className="w-full bg-[#cee800] text-black font-black py-3 rounded-xl hover:bg-[#d4f030] transition disabled:opacity-50">
                  {saving ? 'SENDING...' : 'SEND INVITE'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
