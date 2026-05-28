'use client'

import { useState, useEffect } from 'react'

type Report = {
  what_we_covered: string
  key_wins: string
  areas_to_improve: string
  homework: string
  video_url: string
}

const BLANK: Report = { what_we_covered: '', key_wins: '', areas_to_improve: '', homework: '', video_url: '' }

export default function SessionReportModal({
  bookingId,
  sessionLabel,
  onClose,
  onSaved,
  readOnly = false,
}: {
  bookingId: string
  sessionLabel: string
  onClose: () => void
  onSaved: () => void
  readOnly?: boolean
}) {
  const [form, setForm]     = useState<Report>(BLANK)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [existing, setExisting] = useState(false)

  useEffect(() => {
    fetch(`/api/session-reports/${bookingId}`)
      .then(r => r.json())
      .then(data => {
        if (data) {
          setForm({
            what_we_covered: data.what_we_covered || '',
            key_wins: data.key_wins || '',
            areas_to_improve: data.areas_to_improve || '',
            homework: data.homework || '',
            video_url: data.video_url || '',
          })
          setExisting(true)
        }
        setLoading(false)
      })
  }, [bookingId])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const method = existing ? 'PATCH' : 'POST'
    await fetch(`/api/session-reports/${bookingId}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setSaving(false)
    onSaved()
    onClose()
  }

  const fields: [keyof Report, string, string, number][] = [
    ['what_we_covered',  'What We Covered',   'Drills, techniques, or concepts worked on today...', 3],
    ['key_wins',         'Key Wins',          'What the player did really well...', 2],
    ['areas_to_improve', 'Areas to Improve',  'Specific things to keep working on...', 2],
    ['homework',         'Homework / Drills', 'What to practice before next session...', 2],
  ]

  return (
    <div className="fixed inset-0 bg-black/80 flex items-end sm:items-center justify-center z-50 p-4"
      onClick={onClose}>
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-black text-[#cee800]">SESSION REPORT</h2>
            <p className="text-zinc-400 text-sm">{sessionLabel}</p>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white text-xl">✕</button>
        </div>

        {loading ? (
          <p className="text-zinc-500 text-sm text-center py-8">Loading...</p>
        ) : readOnly ? (
          /* Read-only view for parents */
          <div className="space-y-4">
            {existing ? (
              <>
                {fields.map(([key, label]) => form[key] ? (
                  <div key={key}>
                    <p className="text-xs text-zinc-400 font-semibold uppercase tracking-wider mb-1">{label}</p>
                    <p className="text-sm text-zinc-200 whitespace-pre-wrap bg-zinc-800 rounded-xl px-3 py-2.5">{form[key]}</p>
                  </div>
                ) : null)}
                {form.video_url && (
                  <div>
                    <p className="text-xs text-zinc-400 font-semibold uppercase tracking-wider mb-1">Video</p>
                    <a href={form.video_url} target="_blank" rel="noopener noreferrer"
                      className="text-[#cee800] text-sm hover:underline break-all">
                      {form.video_url}
                    </a>
                  </div>
                )}
              </>
            ) : (
              <p className="text-zinc-500 text-sm text-center py-4">No report for this session yet.</p>
            )}
          </div>
        ) : (
          <form onSubmit={save} className="space-y-4">
            {fields.map(([key, label, placeholder, rows]) => (
              <div key={key}>
                <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">{label}</label>
                <textarea
                  value={form[key]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  rows={rows}
                  placeholder={placeholder}
                  className="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-[#cee800] resize-none"
                />
              </div>
            ))}

            <div>
              <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Video Link (optional)</label>
              <input
                type="url"
                value={form.video_url}
                onChange={e => setForm(f => ({ ...f, video_url: e.target.value }))}
                placeholder="YouTube or Vimeo URL..."
                className="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-[#cee800]"
              />
            </div>

            <button type="submit" disabled={saving}
              className="w-full bg-[#cee800] text-black font-black py-3 rounded-xl hover:bg-[#d4f030] transition disabled:opacity-50">
              {saving ? 'SAVING...' : existing ? 'UPDATE REPORT' : 'SAVE REPORT'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
