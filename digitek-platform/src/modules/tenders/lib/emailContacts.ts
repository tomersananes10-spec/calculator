import { supabase } from '../../../lib/supabase'

export interface EmailContact {
  id: string
  email: string
  use_count: number
  last_used_at: string
}

/**
 * Searches the shared contacts pool.
 * @param prefix — substring to match (case-insensitive). Empty → most-used contacts.
 * @param excludeEmails — already-selected addresses to filter out.
 */
export async function searchEmailContacts(
  prefix: string,
  excludeEmails: string[] = [],
  limit = 8,
): Promise<EmailContact[]> {
  let query = supabase
    .from('email_contacts')
    .select('id, email, use_count, last_used_at')
    .order('use_count', { ascending: false })
    .order('last_used_at', { ascending: false })
    .limit(limit + excludeEmails.length)

  const term = prefix.trim()
  if (term) {
    // ilike בלבד — index על lower(email) יעזור
    query = query.ilike('email', `%${term}%`)
  }

  const { data, error } = await query
  if (error || !data) return []

  const excludeSet = new Set(excludeEmails.map(e => e.toLowerCase()))
  return data.filter(c => !excludeSet.has(c.email.toLowerCase())).slice(0, limit)
}

/** Records the email use (atomic upsert via RPC). Silent on failure — autofill is non-blocking. */
export async function recordEmailContact(email: string): Promise<void> {
  const { error } = await supabase.rpc('record_email_contact', { p_email: email })
  if (error) console.warn('record_email_contact failed:', error.message)
}
