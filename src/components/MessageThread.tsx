'use client'

import { useState, useEffect, useRef } from 'react'

type Message = {
  id: string; body: string; sender_name: string; sender_role: string; created_at: string
}

export default function MessageThread({
  playerId,
  viewerRole,
}: {
  playerId: string
  viewerRole: 'coach' | 'parent' | 'admin'
}) {
  const [messages, setMessages] = useState<Message[]>([])
  const [draft, setDraft]       = useState('')
  const [sending, setSending]   = useState(false)
  const [loading, setLoading]   = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch(`/api/messages/${playerId}`)
      .then(r => r.json())
      .then(d => { setMessages(d); setLoading(false) })
  }, [playerId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send(e: React.FormEvent) {
    e.preventDefault()
    if (!draft.trim()) return
    setSending(true)
    const res = await fetch(`/api/messages/${playerId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: draft }),
    })
    if (res.ok) {
      const msg = await res.json()
      setMessages(m => [...m, msg])
      setDraft('')
    }
    setSending(false)
  }

  function formatTime(ts: string) {
    const d = new Date(ts)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' +
      d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  }

  const isMe = (role: string) => role === viewerRole || (viewerRole === 'admin' && role === 'admin')

  return (
    <div className="flex flex-col">
      <p className="text-xs text-zinc-400 font-semibold uppercase tracking-wider mb-3">Messages</p>

      {/* Message list */}
      <div className="space-y-2 max-h-64 overflow-y-auto mb-3 pr-1">
        {loading ? (
          <p className="text-zinc-500 text-xs text-center py-4">Loading...</p>
        ) : messages.length === 0 ? (
          <p className="text-zinc-600 text-xs text-center py-4">No messages yet. Start the conversation.</p>
        ) : (
          messages.map(m => (
            <div key={m.id} className={`flex flex-col ${isMe(m.sender_role) ? 'items-end' : 'items-start'}`}>
              <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                isMe(m.sender_role)
                  ? 'bg-[#cee800] text-black rounded-br-sm'
                  : 'bg-zinc-800 text-white rounded-bl-sm'
              }`}>
                {m.body}
              </div>
              <p className="text-zinc-600 text-xs mt-0.5 px-1">
                {isMe(m.sender_role) ? 'You' : m.sender_name} · {formatTime(m.created_at)}
              </p>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={send} className="flex gap-2">
        <input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          placeholder="Write a message..."
          className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-[#cee800]"
        />
        <button type="submit" disabled={sending || !draft.trim()}
          className="px-4 py-2 bg-[#cee800] text-black font-black text-sm rounded-xl hover:bg-[#d4f030] transition disabled:opacity-40">
          Send
        </button>
      </form>
    </div>
  )
}
