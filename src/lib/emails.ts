import { Resend } from 'resend'

type GroupConfirmationOptions = {
  to: string
  parentName: string
  playerName: string
  sessions: { group: string; date: string; time: string }[]
  planLabel: string
  totalPaid: string
}

export async function sendGroupConfirmation(opts: GroupConfirmationOptions) {
  if (!process.env.RESEND_API_KEY) return
  const resend = new Resend(process.env.RESEND_API_KEY)

  const sessionLines = opts.sessions
    .map(s => `<li style="margin:6px 0;"><strong>${s.group}</strong> — ${s.date}, ${s.time}</li>`)
    .join('')

  const html = `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#000;color:#fff;padding:32px;border-radius:12px;">
      <img src="https://app.trainatptg.com/logo.png" alt="PTG" width="48" style="margin-bottom:16px;" />
      <h1 style="color:#cee800;font-size:22px;margin:0 0 4px;">You're registered!</h1>
      <p style="color:#a1a1aa;margin:0 0 24px;">Hi ${opts.parentName} — ${opts.playerName} is all set for group training.</p>

      <div style="background:#18181b;border-radius:10px;padding:20px;margin-bottom:24px;">
        <p style="color:#71717a;font-size:12px;text-transform:uppercase;letter-spacing:.08em;margin:0 0 12px;">Sessions Registered</p>
        <ul style="margin:0;padding:0 0 0 18px;color:#fff;">
          ${sessionLines}
        </ul>
      </div>

      <div style="background:#18181b;border-radius:10px;padding:20px;margin-bottom:24px;">
        <p style="color:#71717a;font-size:12px;text-transform:uppercase;letter-spacing:.08em;margin:0 0 8px;">Plan</p>
        <p style="margin:0;font-weight:700;">${opts.planLabel}</p>
        <p style="color:#a1a1aa;margin:4px 0 0;font-size:14px;">Total paid: ${opts.totalPaid}</p>
      </div>

      <p style="color:#71717a;font-size:13px;">Please arrive 10 minutes early. Bring plenty of water. Wear your PTG shirt, black shorts and black socks.</p>
      <p style="color:#71717a;font-size:13px;">Questions? Reply to this email or text us.</p>

      <hr style="border:none;border-top:1px solid #27272a;margin:24px 0;" />
      <p style="color:#3f3f46;font-size:11px;margin:0;">Patino Training Grounds · trainatptg.com</p>
    </div>
  `

  await resend.emails.send({
    from: 'PTG <no-reply@trainatptg.com>',
    to: opts.to,
    subject: `${opts.playerName} is registered for PTG Group Training`,
    html,
  })
}

type IndividualConfirmationOptions = {
  to: string
  parentName: string
  playerName: string
  sessionType: string
  preferredDate: string
  totalPaid: string
}

export async function sendIndividualConfirmation(opts: IndividualConfirmationOptions) {
  if (!process.env.RESEND_API_KEY) return
  const resend = new Resend(process.env.RESEND_API_KEY)

  const typeLabels: Record<string, string> = {
    individual: 'Individual (1-on-1)',
    semi: 'Semi-Private',
    duo: 'Duo Session',
  }

  const html = `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#000;color:#fff;padding:32px;border-radius:12px;">
      <img src="https://app.trainatptg.com/logo.png" alt="PTG" width="48" style="margin-bottom:16px;" />
      <h1 style="color:#cee800;font-size:22px;margin:0 0 4px;">Booking received!</h1>
      <p style="color:#a1a1aa;margin:0 0 24px;">Hi ${opts.parentName} — we've got ${opts.playerName}'s session request and will confirm the exact time shortly.</p>

      <div style="background:#18181b;border-radius:10px;padding:20px;margin-bottom:24px;">
        <p style="color:#71717a;font-size:12px;text-transform:uppercase;letter-spacing:.08em;margin:0 0 8px;">Session Details</p>
        <p style="margin:0;font-weight:700;">${typeLabels[opts.sessionType] || opts.sessionType}</p>
        ${opts.preferredDate ? `<p style="color:#a1a1aa;margin:4px 0 0;font-size:14px;">Requested: ${opts.preferredDate}</p>` : ''}
        <p style="color:#a1a1aa;margin:4px 0 0;font-size:14px;">Total paid: ${opts.totalPaid}</p>
      </div>

      <p style="color:#71717a;font-size:13px;">We'll reach out within 24 hours to confirm your coach and exact session time.</p>

      <hr style="border:none;border-top:1px solid #27272a;margin:24px 0;" />
      <p style="color:#3f3f46;font-size:11px;margin:0;">Patino Training Grounds · trainatptg.com</p>
    </div>
  `

  await resend.emails.send({
    from: 'PTG <no-reply@trainatptg.com>',
    to: opts.to,
    subject: `PTG booking confirmed — ${opts.playerName}`,
    html,
  })
}
