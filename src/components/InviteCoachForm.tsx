'use client'

import { useState } from 'react'

type Mode = 'invite' | 'password' | 'name-only'

export default function InviteCoachForm({ onAdded }: { onAdded?: () => void }) {
  const [open, setOpen]     = useState(false)
  const [mode, setMode]     = useState<Mode>('invite')
  const [name, setName]         = useState('')
  const [email, setEmail]       = useState('')
  const [tempPassword, setTempPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError]   = useState('')

  function reset() {
    setName(''); setEmail(''); setTempPassword(''); setError(''); setSuccess(''); setMode('invite')
  }

  async function send(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')

    if (mode === 'invite') {
      const res = await fetch('/api/admin/invite-coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, full_name: name }),
      })
      const data = await res.json()
      if (res.ok) {
        setSuccess(`Invite sent to ${email}`)
        setName(''); setEmail('')
        onAdded?.()
      } else {
        setError(data.error || 'Failed to send invite')
      }
    } else if (mode === 'password') {
      const res = await fetch('/api/admin/create-coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, full_name: name, temp_password: tempPassword }),
      })
      const data = await res.json()
      if (res.ok) {
        setSuccess(`Account created for ${name}`)
        setName(''); setEmail(''); setTempPassword('')
        onAdded?.()
      } else {
        setError(data.error || 'Failed to create account')
      }
    } else {
      const res = await fetch('/api/admin/add-coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      const data = await res.json()
      if (res.ok) {
        setSuccess(`${name} added to coach list`)
        setName('')
        onAdded?.()
      } else {
        setError(data.error || 'Failed to add coach')
      }
    }

    setSaving(false)
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

            {/* Mode tabs */}
            <div className="flex gap-2 mb-5 flex-wrap">
              {([['invite', 'Invite email'], ['password', 'Set password'], ['name-only', 'Name only']] as [Mode, string][]).map(([m, label]) => (
                <button key={m} type="button" onClick={() => { setMode(m); setError('') }}
                  className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition ${
                    mode === m
                      ? 'bg-[#cee800] text-black border-[#cee800]'
                      : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:border-zinc-500'
                  }`}>
                  {label}
                </button>
              ))}
            </div>

            {success ? (
              <div className="text-center py-4">
                <p className="text-[#cee800] font-black mb-1">Done!</p>
                <p className="text-zinc-400 text-sm">{success}</p>
                {mode === 'invite' && (
                  <p className="text-zinc-500 text-xs mt-2">They'll receive an email to set their password and access the coach portal.</p>
                )}
                <button onClick={() => { setSuccess(''); setOpen(false); reset() }}
                  className="mt-4 px-6 py-2 bg-zinc-800 text-white font-black rounded-xl text-sm hover:bg-zinc-700 transition">
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={send} className="space-y-4">
                <div>
                  <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Full Name</label>
                  <input required value={name} onChange={e => setName(e.target.value)}
                    placeholder="e.g. Coach Maria"
                    className="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#cee800]" />
                </div>

                {(mode === 'invite' || mode === 'password') && (
                  <div>
                    <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Email</label>
                    <input required type="email" value={email} onChange={e => setEmail(e.target.value)}
                      placeholder="coach@email.com"
                      className="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#cee800]" />
                  </div>
                )}

                {mode === 'password' && (
                  <div>
                    <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Temporary Password</label>
                    <input required type="text" value={tempPassword} onChange={e => setTempPassword(e.target.value)}
                      placeholder="Share this with the coach"
                      className="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#cee800]" />
                  </div>
                )}

                <p className="text-zinc-500 text-xs">
                  {mode === 'invite'
                    ? "They'll receive an email invite to set their password and access the coach portal."
                    : mode === 'password'
                    ? "Creates the account instantly. Share the temp password with the coach — they'll be prompted to set their own when they first log in."
                    : "Adds the coach to the assignable list immediately. You can invite them later when they're ready to log in."}
                </p>

                {error && <p className="text-red-400 text-sm">{error}</p>}

                <button type="submit" disabled={saving}
                  className="w-full bg-[#cee800] text-black font-black py-3 rounded-xl hover:bg-[#d4f030] transition disabled:opacity-50">
                  {saving ? 'SAVING...' : mode === 'invite' ? 'SEND INVITE' : mode === 'password' ? 'CREATE ACCOUNT' : 'ADD COACH'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
