'use client'

import { useState } from 'react'

export default function SetRoleButton({
  userId,
  currentRole,
}: {
  userId: string
  currentRole: string
}) {
  const [role, setRole] = useState(currentRole)
  const [loading, setLoading] = useState(false)

  async function toggle() {
    const next = role === 'director' ? 'coach' : 'director'
    setLoading(true)
    const res = await fetch('/api/admin/set-role', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, role: next }),
    })
    if (res.ok) setRole(next)
    setLoading(false)
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition disabled:opacity-50 ${
        role === 'director'
          ? 'border-[#cee800] text-[#cee800] hover:bg-zinc-800'
          : 'border-zinc-600 text-zinc-400 hover:border-[#cee800] hover:text-[#cee800]'
      }`}
    >
      {loading ? '...' : role === 'director' ? 'Director ✓' : 'Make Director'}
    </button>
  )
}
