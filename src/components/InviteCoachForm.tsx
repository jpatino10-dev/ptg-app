'use client'

import { useState } from 'react'

export default function InviteCoachForm({ onAdded }: { onAdded?: () => void }) {
  const [open, setOpen]     = useState(false)
  const [tab, setTab]       = useState<'account' | 'name-only'>('account')
  const [name, setName]     = useState('')
  const [email, setEmail]   = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole]     = useState<'coach' | 'director'>('coach')
  const [saving, setSaving] = useState(false)
  const [done, setDone]     = useState(false)
  const [error, setError]   = useState('')

  function reset() {
    setName(''); setEmail(''); setPassword(''); setError(''); setDone(false); setTab('account'); setRole('coach')
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError('')

    if (tab === 'name-only') {
      const res = await fetch('/api/admin/add-coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      const data = await res.json()
      if (res.ok) { setDone(true); onAdded?.() }
      else setError(data.error || 'Failed to add')
      setSaving(false)
      return
    }

    const res = await fetch('/api/admin/create-coach', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, full_name: name, temp_password: password, role }),
    })
    const data = await res.json()
    if (res.ok) { setDone(true); onAdded?.() }
    else setError(data.error || 'Failed to create account')
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

            <div className="flex gap-2 mb-5">
              {([['account', 'Create account'], ['name-only', 'Name only']] as const).map(([t, label]) => (
                <button key={t} type="button" onClick={() => { setTab(t); setError('') }}
                  className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition ${tab === t ? 'bg-[#cee800] text-black border-[#cee800]' : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:border-zinc-500'}`}>
                  {label}
                </button>
              ))}
            </div>

            {done ? (
              <div className="text-center py-4 space-y-3">
                <p className="text-[#cee800] font-black text-lg">Done!</p>
                {tab === 'account' ? (
                  <>
                    <p className="text-zinc-300 text-sm">Account created for <span className="font-bold text-white">{name}</span>.</p>
                    <div className="bg-zinc-800 rounded-xl p-4 text-left space-y-1">
                      <p className="text-zinc-400 text-xs uppercase tracking-wider font-semibold">Share these with the coach</p>
                      <p className="text-white text-sm">Email: <span className="text-[#cee800] font-bold">{email}</span></p>
                      <p className="text-white text-sm">Password: <span className="text-[#cee800] font-bold">{password}</span></p>
                    </div>
                    <p className="text-zinc-500 text-xs">They&apos;ll be prompted to set their own password when they first log in.</p>
                  </>
                ) : (
                  <p className="text-zinc-400 text-sm">{name} is now assignable to sessions.</p>
                )}
                <button onClick={() => { setDone(false); setName(''); setEmail(''); setPassword('') }}
                  className="mt-2 px-6 py-2 bg-zinc-800 text-white font-black rounded-xl text-sm hover:bg-zinc-700 transition">
                  Add Another
                </button>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-4">
                <div>
                  <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Full Name</label>
                  <input required value={name} onChange={e => setName(e.target.value)} placeholder="Coach Name"
                    className="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#cee800]" />
                </div>
                {tab === 'account' && (
                  <>
                    <div>
                      <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Email</label>
                      <input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="coach@email.com"
                        className="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#cee800]" />
                    </div>
                    <div>
                      <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Temporary Password</label>
                      <input required value={password} onChange={e => setPassword(e.target.value)} placeholder="e.g. PTG2026"
                        className="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#cee800]" />
                      <p className="text-zinc-600 text-xs mt-1">You&apos;ll see this after so you can text it to them.</p>
                    </div>
                    <div>
                      <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Role</label>
                      <div className="flex gap-2 mt-1">
                        {(['coach', 'director'] as const).map(r => (
                          <button key={r} type="button" onClick={() => setRole(r)}
                            className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition capitalize ${role === r ? 'bg-[#cee800] text-black border-[#cee800]' : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:border-zinc-500'}`}>
                            {r}
                          </button>
                        ))}
                      </div>
                      <p className="text-zinc-600 text-xs mt-1">Director gets full calendar access, no financial data.</p>
                    </div>
                  </>
                )}
                {error && <p className="text-red-400 text-sm">{error}</p>}
                <button type="submit" disabled={saving}
                  className="w-full bg-[#cee800] text-black font-black py-3 rounded-xl hover:bg-[#d4f030] transition disabled:opacity-50">
                  {saving ? 'CREATING...' : tab === 'account' ? 'CREATE ACCOUNT' : 'ADD COACH'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
