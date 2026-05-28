'use client'

import Image from 'next/image'
import Link from 'next/link'

export default function BookingSuccessPage() {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <div className="max-w-sm w-full text-center">
        <div className="flex justify-center mb-6">
          <Image src="/logo.png" alt="PTG" width={64} height={64} />
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
          <div className="w-16 h-16 rounded-full bg-[#cee800]/20 flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">✓</span>
          </div>

          <h1 className="text-2xl font-black text-[#cee800] mb-2">YOU'RE BOOKED!</h1>
          <p className="text-zinc-400 text-sm mb-6">
            Payment confirmed. We'll reach out within 24 hours to confirm your session details and assign a coach.
          </p>

          <div className="bg-zinc-800 rounded-xl p-4 mb-6 text-left space-y-2 text-sm">
            <p className="font-semibold text-zinc-200">What happens next:</p>
            <p className="text-zinc-400">📧 Check your email for a booking confirmation</p>
            <p className="text-zinc-400">🔑 You'll also receive an invite to create your PTG account</p>
            <p className="text-zinc-400">📅 We'll confirm your exact session date and time</p>
          </div>

          <a href="https://trainatptg.com"
            className="block w-full bg-[#cee800] text-black font-black py-3 rounded-xl hover:bg-[#d4f030] transition text-sm">
            Back to trainatptg.com
          </a>
        </div>

        <p className="text-zinc-600 text-xs mt-4">
          Questions? Email us at{' '}
          <a href="mailto:josh@trainatptg.com" className="text-zinc-400 hover:text-white">
            josh@trainatptg.com
          </a>
        </p>
      </div>
    </div>
  )
}
