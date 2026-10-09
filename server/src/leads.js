import { TABLES, getSupabaseAdmin, mapLead } from './db.js'

const LEAD_BLOCK_RE = /:::lead\s*([\s\S]*?)\s*:::/i
const PLACEHOLDER_NAME_RE = /^(chat guest|guest|widget guest)$/i

export function isPlaceholderName(name = '') {
  const n = String(name || '').trim()
  return !n || PLACEHOLDER_NAME_RE.test(n)
}

export function preferName(...candidates) {
  for (const c of candidates) {
    const n = String(c || '').trim()
    if (n && !isPlaceholderName(n)) return n
  }
  for (const c of candidates) {
    const n = String(c || '').trim()
    if (n) return n
  }
  return ''
}

export function extractLeadBlock(text = '') {
  const match = text.match(LEAD_BLOCK_RE)
  if (!match) {
    return { cleanText: text.trim(), lead: null }
  }
  let lead = null
  try {
    lead = JSON.parse(match[1].trim())
  } catch {
    lead = null
  }
  const cleanText = text.replace(LEAD_BLOCK_RE, '').replace(/\n{3,}/g, '\n\n').trim()
  return { cleanText, lead }
}

/** Strip a partial trailing :::lead block while streaming */
export function stripPartialLead(text = '') {
  const idx = text.search(/\n?:::lead/i)
  if (idx === -1) return text
  return text.slice(0, idx)
}

function pickKnownFields(history = []) {
  const blob = history.map((m) => m.content).join('\n')
  const email = blob.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || ''
  const phone = blob.match(/(?:\+?\d[\d\s().-]{7,}\d)/)?.[0] || ''
  return { email, phone }
}

/** When the assistant asked for a name, pull it from the shopper's reply */
export function inferNameFromHistory(history = []) {
  for (let i = history.length - 1; i >= 0; i--) {
    const m = history[i]
    if (!m || m.role !== 'user') continue
    const raw = String(m.content || '').trim()
    if (!raw || raw.includes('@') || /\d{6,}/.test(raw) || raw.length > 60) continue
    if (/\b(human|real person|live agent|speak|talk to|handoff|operator)\b/i.test(raw)) continue

    const recentAsk = history
      .slice(Math.max(0, i - 4), i)
      .some(
        (x) =>
          x?.role === 'assistant' &&
          /\b(your name|share your name|may i (have|get) your name|what('?s| is) your name|call you)\b/i.test(
            x.content || ''
          )
      )
    if (!recentAsk) continue

    const cleaned = raw
      .replace(/^(hi[,!]?\s+|hello[,!]?\s+)?/i, '')
      .replace(/^(i'?m|i am|my name is|this is|it'?s|call me)\s+/i, '')
      .replace(/[.!?]+$/g, '')
      .trim()

    if (!cleaned) continue
    if (cleaned.split(/\s+/).length > 4) continue
    if (!/^[A-Za-z][A-Za-z' .-]{0,40}$/.test(cleaned)) continue
    if (isPlaceholderName(cleaned)) continue
    return cleaned
  }
  return ''
}

export function mergeLeadState(prev = {}, next = {}, history = []) {
  const inferred = pickKnownFields(history)
  const inferredName = inferNameFromHistory(history)
  return {
    name: preferName(next.name, inferredName, prev.name),
    email: String(next.email || prev.email || inferred.email || '').trim(),
    phone: String(next.phone || prev.phone || inferred.phone || '').trim(),
    message: String(next.message || prev.message || '').trim(),
    nextField: next.nextField || prev.nextField || null,
    id: next.id || prev.id || null,
  }
}

export function leadProgress(lead = {}) {
  if (isPlaceholderName(lead.name)) return 'name'
  if (!lead.email) return 'email'
  if (!lead.phone) return 'phone'
  if (!lead.message) return 'message'
  return 'done'
}

async function updateLeadById(sb, id, payload) {
  const { data, error } = await sb.from(TABLES.leads).update(payload).eq('id', id).select('*').single()
  if (error) throw error
  return mapLead(data)
}

export async function upsertLead(lead, { sessionId } = {}) {
  if (!lead?.name && !lead?.email && !lead?.phone && !sessionId) return null
  // Escalate-only placeholder still allowed
  if (!lead?.name && !lead?.email && !lead?.phone) return null

  const sb = getSupabaseAdmin()
  const payload = {
    name: preferName(lead.name) || 'Chat guest',
    email: lead.email || '',
    phone: lead.phone || '',
    message:
      lead.message ||
      (sessionId ? `Chat session ${sessionId}` : 'Captured from chat assistant'),
    status: 'new',
    updated_at: new Date().toISOString(),
  }
  if (sessionId) payload.session_id = sessionId

  // 1) Update by known lead id
  if (lead.id) {
    try {
      const existing = await sb.from(TABLES.leads).select('*').eq('id', lead.id).maybeSingle()
      if (existing?.data) {
        payload.name = preferName(payload.name, existing.data.name)
        payload.email = payload.email || existing.data.email || ''
        payload.phone = payload.phone || existing.data.phone || ''
        payload.message =
          lead.message || existing.data.message || payload.message
        if (sessionId && !existing.data.session_id) payload.session_id = sessionId
        return await updateLeadById(sb, lead.id, payload)
      }
    } catch {
      // fall through
    }
  }

  // 2) Update by session_id (same chat thread)
  if (sessionId) {
    try {
      const { data: bySession } = await sb
        .from(TABLES.leads)
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false })
        .limit(1)
      if (bySession?.[0]) {
        payload.name = preferName(payload.name, bySession[0].name)
        payload.email = payload.email || bySession[0].email || ''
        payload.phone = payload.phone || bySession[0].phone || ''
        payload.message = lead.message || bySession[0].message || payload.message
        return await updateLeadById(sb, bySession[0].id, payload)
      }
    } catch {
      // session_id column may be missing until migration — fall through
    }
  }

  // 3) Update by email
  if (payload.email) {
    const { data: existing } = await sb
      .from(TABLES.leads)
      .select('*')
      .eq('email', payload.email)
      .order('created_at', { ascending: false })
      .limit(1)
    if (existing?.[0]) {
      payload.name = preferName(payload.name, existing[0].name)
      payload.phone = payload.phone || existing[0].phone || ''
      payload.message = lead.message || existing[0].message || payload.message
      if (sessionId) payload.session_id = sessionId
      return await updateLeadById(sb, existing[0].id, payload)
    }
  }

  const { data, error } = await sb.from(TABLES.leads).insert(payload).select('*').single()
  if (error) throw error
  return mapLead(data)
}
