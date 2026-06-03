'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import Image from 'next/image'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function SetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [role, setRole]         = useState<string | null>(null)
  const [ready, setReady]       = useState(false)

  useEffect(() => {
    // onAuthStateChange fires when the browser client detects the #access_token hash
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const r = session.user.user_metadata?.role || session.user.app_metadata?.role || null
        setRole(r)
        setReady(true)
      }
    })

    // Also check if session already exists (returning visitor)
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        const r = data.session.user.user_metadata?.role || data.session.user.app_metadata?.role || null
        setRole(r)
        setReady(true)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const roleLabel = role === 'parent' ? 'parent' : role === 'admin' ? 'admin' : 'coach'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (password !== confirm) { setError('Passwords do not match.'); return }

    setLoading(true)
    setError('')

    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    // Clear the must_reset_password flag
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('profiles').update({ must_reset_password: false }).eq('id', user.id)
    }

    if (role === 'parent') router.push('/parent')
    else if (role === 'admin') router.push('/admin')
    else router.push('/coach')
  }

  if (!ready) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="w-full max-w-sm text-center">
          <div className="flex justify-center mb-8">
            <Image src="/logo.png" alt="PTG" width={64} height={64} />
          </div>
          <p className="text-zinc-400 text-sm">Verifying your invite link...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <Image src="/logo.png" alt="PTG" width={64} height={64} />
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
          <h1 className="text-2xl font-black text-[#cee800] tracking-widest text-center mb-1">
            WELCOME TO PTG
          </h1>
          <p className="text-zinc-400 text-sm text-center mb-6">
            Set a password to activate your {roleLabel} account.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="At least 8 characters"
                className="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-[#cee800]"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Confirm Password</label>
              <input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                required
                placeholder="Repeat password"
                className="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-[#cee800]"
              />
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <button type="submit" disabled={loading}
              className="w-full bg-[#cee800] text-black font-black py-3 rounded-xl hover:bg-[#d4f030] transition disabled:opacity-50 mt-2">
              {loading ? 'SETTING UP...' : 'ACTIVATE ACCOUNT'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
