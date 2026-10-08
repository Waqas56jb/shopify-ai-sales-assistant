import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL || ''
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const isSupabaseConfigured = Boolean(url && anonKey)

export const supabase = isSupabaseConfigured
  ? createClient(url, anonKey)
  : null

/**
 * Future tables (create in Supabase):
 * - leads (id, name, email, phone, message, status, created_at)
 * - conversations (id, visitor_name, channel, status, last_message, updated_at)
 * - knowledge_items (id, title, type, price, description, image_url, sort_order, trained, created_at)
 * - training_jobs (id, source_type, status, notes, created_at)
 * - widget_settings (id, primary_color, accent_color, bubble_color, text_color)
 */
