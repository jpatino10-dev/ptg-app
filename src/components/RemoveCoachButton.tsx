'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function RemoveCoachButton({ id, name }: { id: string; name: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function remove() {
    if (!confirm(`Remove "${name}" from the coach list?`)) return
    setLoading(true)
    await fetch('/api/admin/add-coach', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setLoading(false)
    router.refresh()
  }

  return (
    <button onClick={remove} disabled={loading}
      className="text-xs text-zinc-500 hover:text-red-400 transition disabled:opacity-40">
      {loading ? 'Removing…' : 'Remove'}
    </button>
  )
}
