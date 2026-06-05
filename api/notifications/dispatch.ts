// Notification dispatcher — atomic claim + Gmail SMTP send.
//
// Required Vercel env vars:
//   CRON_SECRET            — Bearer secret for cron auth
//   SUPABASE_URL           — Supabase REST endpoint
//   SUPABASE_SERVICE_ROLE_KEY — bypasses RLS
//   GMAIL_USER             — sender Gmail address (e.g. tomersananes10@gmail.com)
//   GMAIL_APP_PASSWORD     — 16-char Google App Password (NOT regular password)
//   GMAIL_FROM_NAME        — optional display name (default: "LIBA — מכרזים")
//
// Atomicity: PATCH with `status=eq.pending` + `id=in.(...)` is atomic in
// PostgREST. Only one worker advances a row from pending → processing.

import nodemailer from 'nodemailer'

const BATCH_SIZE = 25  // smaller batch — SMTP is slower than mock

interface QueueRow {
  id: string
  recipient_email: string | null
  user_id: string | null
  subject: string | null
  channel: string
  notification_type: string
  tender_id: string | null
  payload: Record<string, unknown>
}

async function supaFetch(url: string, key: string, init: RequestInit) {
  return fetch(url, {
    ...init,
    headers: {
      ...init.headers,
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
  })
}

/** Resolve recipient address. For internal users we'd lookup auth.users.email,
 *  but for now we only dispatch external email recipients. */
async function resolveRecipientEmail(row: QueueRow, supabaseUrl: string, key: string): Promise<string | null> {
  if (row.recipient_email) return row.recipient_email
  if (!row.user_id) return null
  // Look up the auth user's email via the profiles table (RLS-bypass with service role)
  const res = await supaFetch(
    `${supabaseUrl}/rest/v1/profiles?select=email&id=eq.${row.user_id}`,
    key,
    { method: 'GET' }
  )
  if (!res.ok) return null
  const rows: Array<{ email: string }> = await res.json()
  return rows[0]?.email ?? null
}

// HTML-escape every untrusted value before interpolating into the email body.
// Queue rows are writable by authenticated users (RLS allows participants
// to enqueue), so subject/payload/role_hint/request_type are untrusted input.
function escHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// UUID guard for tender_id before embedding in a URL — defence in depth even
// though tender_id is a uuid column at the DB layer.
function isUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)
}

function buildHtmlBody(row: QueueRow): { subject: string; html: string; text: string } {
  const rawSubject = row.subject || `התראת מערכת — ${row.notification_type}`
  const payload = row.payload || {}
  const bodyText = (payload.body as string) || ''
  const tenderId = row.tender_id && isUuid(row.tender_id) ? row.tender_id : null
  const roleHint = (payload.role_hint as string) || ''
  const reqType = (payload.request_type as string) || ''
  const slaDue = (payload.sla_due_at as string) || ''

  const safeSlaTime = slaDue ? escHtml(new Date(slaDue).toLocaleString('he-IL')) : ''
  const slaLine = safeSlaTime ? `<p style="color:#64748b;font-size:13px">⏱️ SLA יסתיים: ${safeSlaTime}</p>` : ''
  const linkLine = tenderId
    ? `<p><a href="https://liba.vercel.app/tenders/${encodeURIComponent(tenderId)}" style="color:#2563eb">פתיחת ההליך במערכת ←</a></p>`
    : ''
  const bodyHtml = bodyText
    ? `<div style="background:#f1f5f9;padding:14px 16px;border-radius:8px;margin:14px 0;white-space:pre-wrap">${escHtml(bodyText).replace(/\n/g, '<br>')}</div>`
    : ''

  const html = `<!doctype html>
<html dir="rtl" lang="he">
<body style="font-family:Heebo,Arial,sans-serif;line-height:1.6;color:#1e293b;max-width:560px;margin:0 auto;padding:24px">
  <h2 style="color:#1e293b;margin:0 0 4px">${escHtml(rawSubject)}</h2>
  ${roleHint ? `<p style="color:#64748b;margin:0 0 14px">פנייה ל${escHtml(roleHint)}${reqType ? ` · ${escHtml(reqType)}` : ''}</p>` : ''}
  ${bodyHtml}
  ${slaLine}
  ${linkLine}
  <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0">
  <p style="color:#94a3b8;font-size:11px">הודעה זו נשלחה אוטומטית ממערכת LIBA — מכרזים. אין להשיב למייל זה.</p>
</body>
</html>`

  const text = `${rawSubject}\n\n${bodyText}\n\n${slaDue ? `SLA: ${new Date(slaDue).toLocaleString('he-IL')}\n` : ''}${tenderId ? `https://liba.vercel.app/tenders/${tenderId}\n` : ''}`

  return { subject: rawSubject, html, text }
}

export default async function handler(req: any, res: any) {
  const expectedSecret = process.env.CRON_SECRET
  const authHeader = req.headers?.authorization ?? ''
  if (!expectedSecret) return res.status(500).json({ ok: false, error: 'CRON_SECRET not configured' })
  if (authHeader !== `Bearer ${expectedSecret}`) return res.status(401).json({ ok: false, error: 'Unauthorized' })

  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const gmailUser = process.env.GMAIL_USER
  const gmailPass = process.env.GMAIL_APP_PASSWORD
  const fromName = process.env.GMAIL_FROM_NAME ?? 'LIBA — מכרזים'

  if (!supabaseUrl || !serviceRoleKey) {
    return res.status(500).json({ ok: false, error: 'Supabase env not configured' })
  }
  if (!gmailUser || !gmailPass) {
    return res.status(500).json({ ok: false, error: 'Gmail SMTP env not configured (GMAIL_USER / GMAIL_APP_PASSWORD)' })
  }

  const nowIso = new Date().toISOString()

  try {
    // 1. Fetch pending candidates
    const candidatesUrl = `${supabaseUrl}/rest/v1/tender_notifications_queue`
      + `?select=id,recipient_email,user_id,subject,channel,notification_type,tender_id,payload`
      + `&status=eq.pending&scheduled_for=lte.${encodeURIComponent(nowIso)}`
      + `&channel=eq.email`
      + `&order=scheduled_for.asc&limit=${BATCH_SIZE}`
    const candRes = await supaFetch(candidatesUrl, serviceRoleKey, { method: 'GET' })
    if (!candRes.ok) {
      return res.status(candRes.status).json({ ok: false, error: await candRes.text() })
    }
    const candidates: QueueRow[] = await candRes.json()
    if (candidates.length === 0) {
      return res.status(200).json({ ok: true, dispatched: 0, message: 'queue empty' })
    }

    // 2. Atomic claim → 'processing' (so a second worker won't pick same rows).
    //    Only rows still 'pending' will be claimed by us.
    const ids = candidates.map(c => c.id)
    const claimUrl = `${supabaseUrl}/rest/v1/tender_notifications_queue`
      + `?id=in.(${ids.join(',')})&status=eq.pending`
    const claimRes = await fetch(claimUrl, {
      method: 'PATCH',
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify({ status: 'processing' }),
    })
    if (!claimRes.ok) {
      return res.status(claimRes.status).json({ ok: false, error: await claimRes.text() })
    }
    const claimedRows: Array<{ id: string }> = await claimRes.json()
    const claimedIds = new Set(claimedRows.map(r => r.id))
    const toSend = candidates.filter(c => claimedIds.has(c.id))

    // 3. Initialize SMTP transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: gmailUser, pass: gmailPass },
    })

    // 4. Send each. On failure → mark failed + record error. On success → sent.
    let sent = 0
    let failed = 0
    for (const row of toSend) {
      const to = await resolveRecipientEmail(row, supabaseUrl, serviceRoleKey)
      if (!to) {
        await supaFetch(`${supabaseUrl}/rest/v1/tender_notifications_queue?id=eq.${row.id}`, serviceRoleKey, {
          method: 'PATCH',
          headers: { Prefer: 'return=minimal' },
          body: JSON.stringify({ status: 'failed', error_message: 'no recipient address' }),
        })
        failed += 1
        continue
      }

      const { subject, html, text } = buildHtmlBody(row)
      try {
        await transporter.sendMail({
          from: `"${fromName}" <${gmailUser}>`,
          to,
          subject,
          html,
          text,
        })
        await supaFetch(`${supabaseUrl}/rest/v1/tender_notifications_queue?id=eq.${row.id}`, serviceRoleKey, {
          method: 'PATCH',
          headers: { Prefer: 'return=minimal' },
          body: JSON.stringify({ status: 'sent', sent_at: new Date().toISOString() }),
        })
        sent += 1
      } catch (sendErr: unknown) {
        const msg = sendErr instanceof Error ? sendErr.message : 'unknown send error'
        await supaFetch(`${supabaseUrl}/rest/v1/tender_notifications_queue?id=eq.${row.id}`, serviceRoleKey, {
          method: 'PATCH',
          headers: { Prefer: 'return=minimal' },
          body: JSON.stringify({
            status: 'failed',
            error_message: msg.slice(0, 500),
            retry_count: (row as unknown as { retry_count?: number }).retry_count ?? 0 + 1,
          }),
        })
        failed += 1
      }
    }

    return res.status(200).json({
      ok: true,
      candidates: candidates.length,
      claimed: toSend.length,
      sent,
      failed,
      skipped: candidates.length - toSend.length,
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    return res.status(502).json({ ok: false, error: msg })
  }
}
