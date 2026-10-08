import { createClient } from '@supabase/supabase-js'

const TABLE_PREFIX = 'shopify_store_database_'

export const TABLES = {
  leads: `${TABLE_PREFIX}leads`,
  conversations: `${TABLE_PREFIX}conversations`,
  knowledge: `${TABLE_PREFIX}knowledge`,
  trainingJobs: `${TABLE_PREFIX}training_jobs`,
  widgetSettings: `${TABLE_PREFIX}widget_settings`,
}

export function getSupabaseAdmin() {
  const url = (process.env.SUPABASE_URL || '').trim()
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()
  if (!url || !key) {
    const err = new Error('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing in server/.env')
    err.code = 'MISSING_SUPABASE'
    throw err
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export function mapLead(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    message: row.message,
    status: row.status,
    createdAt: row.created_at,
  }
}

export function mapConversation(row) {
  return {
    id: row.id,
    visitor: row.visitor,
    channel: row.channel,
    status: row.status,
    lastMessage: row.last_message,
    messages: row.messages_count,
    updatedAt: row.updated_at,
  }
}

export function mapKnowledge(row) {
  return {
    id: row.id,
    title: row.title,
    type: row.type,
    price: row.price,
    description: row.description,
    imageUrl: row.image_url,
    sortOrder: row.sort_order,
    trained: row.trained,
  }
}

export function mapTraining(row) {
  return {
    id: row.id,
    sourceType: row.source_type,
    label: row.label,
    status: row.status,
    notes: row.notes,
    createdAt: String(row.created_at).slice(0, 10),
  }
}

export function mapWidget(row) {
  return {
    primaryColor: row.primary_color,
    accentColor: row.accent_color,
    bubbleColor: row.bubble_color,
    textColor: row.text_color,
    launcherColor: row.launcher_color,
    assistantTone: row.assistant_tone || 'professional',
  }
}
