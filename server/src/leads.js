import { TABLES, getSupabaseAdmin, mapLead } from './db.js'

const LEAD_BLOCK_RE = /:::lead\s*([\s\S]*?)\s*:::/i

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

export function mergeLeadState(prev = {}, next = {}, history = []) {
  const inferred = pickKnownFields(history)
  return {
    name: String(next.name || prev.name || '').trim(),
    email: String(next.email || prev.email || inferred.email || '').trim(),
    phone: String(next.phone || prev.phone || inferred.phone || '').trim(),
    message: String(next.message || prev.message || '').trim(),
    nextField: next.nextField || prev.nextField || null,
    id: next.id || prev.id || null,
  }
}

export function leadProgress(lead = {}) {
  if (!lead.name) return 'name'
  if (!lead.email) return 'email'
  if (!lead.phone) return 'phone'
  if (!lead.message) return 'message'
  return 'done'
}

export async function upsertLead(lead, { sessionId } = {}) {
  if (!lead?.name && !lead?.email && !lead?.phone) return null

  const sb = getSupabaseAdmin()
  const payload = {
    name: lead.name || 'Guest',
    email: lead.email || '',
    phone: lead.phone || '',
    message:
      lead.message ||
      (sessionId ? `Chat session ${sessionId}` : 'Captured from chat assistant'),
    status: lead.email || lead.phone ? 'new' : 'new',
    updated_at: new Date().toISOString(),
  }

  if (lead.id) {
    const { data, error } = await sb
      .from(TABLES.leads)
      .update(payload)
      .eq('id', lead.id)
      .select('*')
      .single()
    if (error) throw error
    return mapLead(data)
  }

  // Prefer updating an existing lead with same email in this session window
  if (payload.email) {
    const { data: existing } = await sb
      .from(TABLES.leads)
      .select('*')
      .eq('email', payload.email)
      .order('created_at', { ascending: false })
      .limit(1)
    if (existing?.[0]) {
      const { data, error } = await sb
        .from(TABLES.leads)
        .update(payload)
        .eq('id', existing[0].id)
        .select('*')
        .single()
      if (error) throw error
      return mapLead(data)
    }
  }

  const { data, error } = await sb.from(TABLES.leads).insert(payload).select('*').single()
  if (error) throw error
  return mapLead(data)
}
