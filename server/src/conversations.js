import { TABLES, getSupabaseAdmin, mapConversation, mapLead } from './db.js'

export const HANDOFF_RE =
  /\b(human|real person|live agent|speak (to|with) (a |someone|an? )?(person|human|agent|someone)|talk to (a )?(human|person|agent)|customer service|escalate|hand ?off|representative|operator)\b/i

export function wantsHandoff(text = '') {
  return HANDOFF_RE.test(text)
}

export function mapMessage(row) {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    sessionId: row.session_id,
    role: row.role,
    content: row.content,
    createdAt: row.created_at,
  }
}

export async function upsertConversationRecord({
  sessionId,
  visitor,
  status,
  lastMessage,
  messagesCount,
  leadId,
  handoffNote,
}) {
  const sb = getSupabaseAdmin()
  const payload = {
    visitor: visitor || 'Widget guest',
    channel: 'widget',
    status: status || 'open',
    last_message: String(lastMessage || '').slice(0, 240),
    messages_count: messagesCount || 0,
    session_id: sessionId || '',
    updated_at: new Date().toISOString(),
  }
  if (leadId) payload.lead_id = leadId
  if (handoffNote != null) payload.handoff_note = handoffNote

  if (sessionId) {
    const { data: existing } = await sb
      .from(TABLES.conversations)
      .select('id, status')
      .eq('session_id', sessionId)
      .limit(1)

    if (existing?.[0]?.id) {
      // Don't downgrade handed_off / resolved unless explicitly set
      if (
        existing[0].status === 'handed_off' &&
        payload.status === 'open'
      ) {
        payload.status = 'handed_off'
      }
      const { data, error } = await sb
        .from(TABLES.conversations)
        .update(payload)
        .eq('id', existing[0].id)
        .select('*')
        .single()
      if (error) throw error
      return mapConversation(data)
    }
  }

  const { data, error } = await sb
    .from(TABLES.conversations)
    .insert(payload)
    .select('*')
    .single()
  if (error) throw error
  return mapConversation(data)
}

export async function appendMessages(conversationId, sessionId, items = []) {
  if (!items.length) return []
  const sb = getSupabaseAdmin()
  const rows = items.map((m) => ({
    conversation_id: conversationId || null,
    session_id: sessionId || '',
    role: m.role,
    content: String(m.content || '').slice(0, 8000),
  }))
  const { data, error } = await sb.from(TABLES.messages).insert(rows).select('*')
  if (error) throw error
  return (data || []).map(mapMessage)
}

export async function listMessagesBySession(sessionId, { after } = {}) {
  const sb = getSupabaseAdmin()
  let q = sb
    .from(TABLES.messages)
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })
  if (after) q = q.gt('created_at', after)
  const { data, error } = await q
  if (error) throw error
  return (data || []).map(mapMessage)
}

export async function listMessagesByConversation(conversationId) {
  const sb = getSupabaseAdmin()
  const { data, error } = await sb
    .from(TABLES.messages)
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data || []).map(mapMessage)
}

export async function getConversationBySession(sessionId) {
  const sb = getSupabaseAdmin()
  const { data, error } = await sb
    .from(TABLES.conversations)
    .select('*')
    .eq('session_id', sessionId)
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data ? mapConversation(data) : null
}

export async function postAdminReply({ conversationId, content }) {
  const sb = getSupabaseAdmin()
  const { data: conv, error: cErr } = await sb
    .from(TABLES.conversations)
    .select('*')
    .eq('id', conversationId)
    .single()
  if (cErr) throw cErr

  const { data: msg, error: mErr } = await sb
    .from(TABLES.messages)
    .insert({
      conversation_id: conversationId,
      session_id: conv.session_id || '',
      role: 'admin',
      content: String(content || '').slice(0, 8000),
    })
    .select('*')
    .single()
  if (mErr) throw mErr

  await sb
    .from(TABLES.conversations)
    .update({
      last_message: String(content || '').slice(0, 240),
      messages_count: (conv.messages_count || 0) + 1,
      status: conv.status === 'handed_off' ? 'handed_off' : 'open',
      updated_at: new Date().toISOString(),
    })
    .eq('id', conversationId)

  return mapMessage(msg)
}

export { mapLead }
