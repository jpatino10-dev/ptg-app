import Image from 'next/image'
import Link from 'next/link'

export default function ShirtSuccessPage() {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6">
      <Image src="/logo.png" alt="PTG" width={64} height={64} className="mb-8" />

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 rounded-full bg-[#cee800]/20 flex items-center justify-center mx-auto mb-4">
          <span className="text-[#cee800] text-2xl">✓</span>
        </div>
        <h1 className="text-2xl font-black text-[#cee800] mb-2">ORDER CONFIRMED!</h1>
        <p className="text-zinc-400 mb-6">
          Your PTG shirt is on its way. We'll reach out with pickup or delivery details.
        </p>

        <div className="bg-zinc-800 rounded-xl p-4 text-sm text-zinc-300 text-left space-y-2 mb-6">
          <p className="font-semibold text-white">What's next:</p>
          <p>📧 Check your email for a receipt</p>
          <p>👕 We'll contact you about pickup or delivery</p>
          <p>⚽ Wear it to every PTG session!</p>
        </div>

        <a href="https://trainatptg.com"
          className="block w-full bg-[#cee800] text-black font-black py-3 rounded-xl hover:bg-[#d4f030] transition">
          Back to trainatptg.com
        </a>
      </div>
    </div>
  )
}
