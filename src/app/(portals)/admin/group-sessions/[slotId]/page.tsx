'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

type Registration = {
  id: string
  player_name: string
  parent_name: string | null
  email: string | null
  phone: string | null
  status: 'registered' | 'attended' | 'absent' | 'cancelled'
  notes: string | null
  created_at: string
}

type Slot = {
  id: string
  date: string
  hour: string
  client: string
  capacity: number | null
  location: string | null
  status: string
}

const STATUS_STYLES: Record<string, string> = {
  registered: 'bg-zinc-700 text-zinc-300',
  attended:   'bg-[#cee800]/20 text-[#cee800]',
  absent:     'bg-red-900/30 text-red-400',
  cancelled:  'bg-zinc-800 text-zinc-500',
}

export default function GroupSessionRosterPage() {
  const { slotId } = useParams<{ slotId: string }>()
  const [slot, setSlot] = useState<Slot | null>(null)
  const [registrations, setRegistrations] = useState<Registration[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [addForm, setAddForm] = useState({ player_name: '', parent_name: '', email: '', phone: '' })
  const [adding, setAdding] = useState(false)

  async function load() {
    setLoading(true)
    const res = await fetch(`/api/group-registrations/${slotId}`)
    if (res.ok) {
      const data = await res.json()
      setSlot(data.slot)
      setRegistrations(data.registrations)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [slotId])

  async function updateStatus(registrationId: string, status: string) {
    setUpdatingId(registrationId)
    await fetch(`/api/group-registrations/${slotId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ registrationId, status }),
    })
    setUpdatingId(null)
    load()
  }

  async function removeRegistration(registrationId: string) {
    if (!confirm('Remove this registration?')) return
    setUpdatingId(registrationId)
    await fetch(`/api/group-registrations/${slotId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ registrationId }),
    })
    setUpdatingId(null)
    load()
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!addForm.player_name.trim()) return
    setAdding(true)
    await fetch(`/api/group-registrations/${slotId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(addForm),
    })
    setAdding(false)
    setShowAdd(false)
    setAddForm({ player_name: '', parent_name: '', email: '', phone: '' })
    load()
  }

  if (loading) return <div className="min-h-screen bg-black text-zinc-500 flex items-center justify-center">Loading...</div>
  if (!slot) return <div className="min-h-screen bg-black text-zinc-500 flex items-center justify-center">Session not found.</div>

  const capacity = slot.capacity || 12
  const active = registrations.filter(r => r.status !== 'cancelled')
  const attended = registrations.filter(r => r.status === 'attended').length
  const today = new Date().toISOString().slice(0, 10)
  const isPast = slot.date < today

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-6">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex items-center gap-4">
            <Link href="/admin/group-sessions" className="text-zinc-500 hover:text-white text-sm">← Group Sessions</Link>
          </div>
          <button onClick={() => setShowAdd(true)}
            className="px-4 py-1.5 bg-[#cee800] text-black font-black text-sm rounded-lg hover:bg-[#d4f030] transition">
            + Add Player
          </button>
        </div>

        {/* Slot info */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-4">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-black">{slot.client}</h1>
              <p className="text-zinc-400">{slot.date} · {slot.hour}</p>
              {slot.location && <p className="text-zinc-500 text-sm mt-0.5">{slot.location}</p>}
            </div>
            <div className="text-right">
              <p className="text-3xl font-black">
                {active.length}
                <span className="text-zinc-500 text-xl font-normal">/{capacity}</span>
              </p>
              <p className="text-zinc-500 text-xs">registered</p>
            </div>
          </div>

          {/* Fill bar */}
          <div className="mt-4 w-full bg-zinc-800 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                active.length >= capacity ? 'bg-red-500' : active.length >= capacity * 0.7 ? 'bg-yellow-500' : 'bg-[#00e676]'
              }`}
              style={{ width: `${Math.min(100, (active.length / capacity) * 100)}%` }}
            />
          </div>

          {isPast && (
            <div className="mt-4 grid grid-cols-3 gap-3 text-center text-sm">
              <div className="bg-zinc-800 rounded-xl p-3">
                <p className="text-zinc-500 text-xs">Registered</p>
                <p className="font-black text-xl">{active.length}</p>
              </div>
              <div className="bg-[#cee800]/10 rounded-xl p-3">
                <p className="text-[#cee800] text-xs">Attended</p>
                <p className="font-black text-xl text-[#cee800]">{attended}</p>
              </div>
              <div className="bg-red-900/20 rounded-xl p-3">
                <p className="text-red-400 text-xs">Absent</p>
                <p className="font-black text-xl text-red-400">{registrations.filter(r => r.status === 'absent').length}</p>
              </div>
            </div>
          )}
        </div>

        {/* Roster */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
            <h2 className="font-black text-lg">Roster</h2>
            {isPast && registrations.filter(r => r.status === 'registered').length > 0 && (
              <p className="text-zinc-500 text-xs">Tap a row to mark attendance</p>
            )}
          </div>

          {registrations.length === 0 ? (
            <p className="text-zinc-500 text-sm p-6">No players registered yet.</p>
          ) : (
            <div className="divide-y divide-zinc-800">
              {registrations.map(reg => (
                <div key={reg.id}
                  className={`px-6 py-4 ${updatingId === reg.id ? 'opacity-50' : ''}`}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold">{reg.player_name}</p>
                      {reg.parent_name && <p className="text-zinc-400 text-sm">{reg.parent_name}</p>}
                      {reg.email && <p className="text-zinc-500 text-xs">{reg.email}</p>}
                      {reg.phone && <p className="text-zinc-500 text-xs">{reg.phone}</p>}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {/* Attendance buttons */}
                      {reg.status !== 'cancelled' && (
                        <>
                          <button
                            onClick={() => updateStatus(reg.id, reg.status === 'attended' ? 'registered' : 'attended')}
                            disabled={updatingId === reg.id}
                            className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition ${
                              reg.status === 'attended'
                                ? 'border-[#cee800] bg-[#cee800]/10 text-[#cee800]'
                                : 'border-zinc-700 text-zinc-500 hover:border-[#cee800] hover:text-[#cee800]'
                            }`}>
                            ✓ Present
                          </button>
                          <button
                            onClick={() => updateStatus(reg.id, reg.status === 'absent' ? 'registered' : 'absent')}
                            disabled={updatingId === reg.id}
                            className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition ${
                              reg.status === 'absent'
                                ? 'border-red-600 bg-red-900/20 text-red-400'
                                : 'border-zinc-700 text-zinc-500 hover:border-red-600 hover:text-red-400'
                            }`}>
                            ✕ Absent
                          </button>
                        </>
                      )}

                      {reg.status === 'cancelled' && (
                        <span className="text-xs text-zinc-600 font-semibold">Cancelled</span>
                      )}

                      <button
                        onClick={() => removeRegistration(reg.id)}
                        disabled={updatingId === reg.id}
                        className="text-zinc-700 hover:text-red-400 text-sm transition ml-1">
                        ✕
                      </button>
                    </div>
                  </div>
                  {reg.notes && <p className="text-zinc-500 text-xs mt-1 italic">{reg.notes}</p>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add player modal */}
        {showAdd && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setShowAdd(false)}>
            <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
              <h2 className="font-black text-[#cee800] mb-4">ADD PLAYER</h2>
              <form onSubmit={handleAdd} className="space-y-3">
                {([
                  ['player_name', 'Player Name *', 'text'],
                  ['parent_name', 'Parent / Guardian', 'text'],
                  ['email',       'Email', 'email'],
                  ['phone',       'Phone', 'tel'],
                ] as [keyof typeof addForm, string, string][]).map(([key, label, type]) => (
                  <div key={key}>
                    <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">{label}</label>
                    <input
                      type={type}
                      value={addForm[key]}
                      onChange={e => setAddForm(f => ({ ...f, [key]: e.target.value }))}
                      className="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#cee800]"
                      required={key === 'player_name'}
                    />
                  </div>
                ))}
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowAdd(false)}
                    className="flex-1 py-2.5 border border-zinc-700 rounded-xl text-sm hover:border-zinc-500 transition">
                    Cancel
                  </button>
                  <button type="submit" disabled={adding}
                    className="flex-1 py-2.5 bg-[#cee800] text-black font-black rounded-xl text-sm hover:bg-[#d4f030] transition disabled:opacity-50">
                    {adding ? 'Adding...' : 'Add Player'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
