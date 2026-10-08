import { Router } from 'express'
import {
  TABLES,
  getSupabaseAdmin,
  mapConversation,
  mapKnowledge,
  mapLead,
  mapTraining,
  mapWidget,
} from '../db.js'
import { ASSISTANT_TONES, isValidTone } from '../tones.js'
import { listMessagesByConversation, postAdminReply } from '../conversations.js'

const router = Router()

function handleError(res, err, fallback = 'Request failed') {
  console.error('[admin-api]', err.message)
  const status = err.code === 'MISSING_SUPABASE' ? 500 : 500
  res.status(status).json({ error: err.message || fallback })
}

router.get('/health-db', async (_req, res) => {
  try {
    const sb = getSupabaseAdmin()
    const { data, error } = await sb.from(TABLES.widgetSettings).select('id').limit(1)
    if (error) throw error
    res.json({
      ok: true,
      supabase: true,
      tablePrefix: 'shopify_store_database_',
      sample: data,
    })
  } catch (err) {
    handleError(res, err)
  }
})

// —— Leads ——
router.get('/leads', async (_req, res) => {
  try {
    const sb = getSupabaseAdmin()
    const { data, error } = await sb
      .from(TABLES.leads)
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    res.json({ items: (data || []).map(mapLead) })
  } catch (err) {
    handleError(res, err)
  }
})

router.post('/leads', async (req, res) => {
  try {
    const sb = getSupabaseAdmin()
    const payload = {
      name: req.body.name || '',
      email: req.body.email || '',
      phone: req.body.phone || '',
      message: req.body.message || '',
      status: req.body.status || 'new',
    }
    const { data, error } = await sb.from(TABLES.leads).insert(payload).select('*').single()
    if (error) throw error
    res.status(201).json({ item: mapLead(data) })
  } catch (err) {
    handleError(res, err)
  }
})

router.patch('/leads/:id', async (req, res) => {
  try {
    const sb = getSupabaseAdmin()
    const patch = { updated_at: new Date().toISOString() }
    if (req.body.status) patch.status = req.body.status
    if (req.body.name != null) patch.name = req.body.name
    if (req.body.email != null) patch.email = req.body.email
    if (req.body.phone != null) patch.phone = req.body.phone
    if (req.body.message != null) patch.message = req.body.message

    const { data, error } = await sb
      .from(TABLES.leads)
      .update(patch)
      .eq('id', req.params.id)
      .select('*')
      .single()
    if (error) throw error
    res.json({ item: mapLead(data) })
  } catch (err) {
    handleError(res, err)
  }
})

// —— Conversations ——
router.get('/conversations', async (_req, res) => {
  try {
    const sb = getSupabaseAdmin()
    const { data, error } = await sb
      .from(TABLES.conversations)
      .select('*')
      .order('updated_at', { ascending: false })
    if (error) throw error
    res.json({ items: (data || []).map(mapConversation) })
  } catch (err) {
    handleError(res, err)
  }
})

router.post('/conversations', async (req, res) => {
  try {
    const sb = getSupabaseAdmin()
    const payload = {
      visitor: req.body.visitor || 'Guest',
      channel: req.body.channel || 'widget',
      status: req.body.status || 'open',
      last_message: req.body.lastMessage || '',
      messages_count: Number(req.body.messages || 0),
      session_id: req.body.sessionId || '',
    }
    const { data, error } = await sb.from(TABLES.conversations).insert(payload).select('*').single()
    if (error) throw error
    res.status(201).json({ item: mapConversation(data) })
  } catch (err) {
    handleError(res, err)
  }
})

router.get('/conversations/:id', async (req, res) => {
  try {
    const sb = getSupabaseAdmin()
    const { data, error } = await sb
      .from(TABLES.conversations)
      .select('*')
      .eq('id', req.params.id)
      .single()
    if (error) throw error
    const messages = await listMessagesByConversation(req.params.id)
    res.json({ item: mapConversation(data), messages })
  } catch (err) {
    handleError(res, err)
  }
})

router.patch('/conversations/:id', async (req, res) => {
  try {
    const sb = getSupabaseAdmin()
    const patch = { updated_at: new Date().toISOString() }
    if (req.body.status) patch.status = req.body.status
    if (req.body.visitor != null) patch.visitor = req.body.visitor
    if (req.body.handoffNote != null) patch.handoff_note = req.body.handoffNote
    const { data, error } = await sb
      .from(TABLES.conversations)
      .update(patch)
      .eq('id', req.params.id)
      .select('*')
      .single()
    if (error) throw error
    res.json({ item: mapConversation(data) })
  } catch (err) {
    handleError(res, err)
  }
})

router.post('/conversations/:id/reply', async (req, res) => {
  try {
    const content = String(req.body.content || '').trim()
    if (!content) return res.status(400).json({ error: 'Reply content required' })
    const message = await postAdminReply({
      conversationId: req.params.id,
      content,
    })
    const sb = getSupabaseAdmin()
    const { data, error } = await sb
      .from(TABLES.conversations)
      .select('*')
      .eq('id', req.params.id)
      .single()
    if (error) throw error
    res.status(201).json({ message, item: mapConversation(data) })
  } catch (err) {
    handleError(res, err)
  }
})

router.get('/conversations/:id/messages', async (req, res) => {
  try {
    const messages = await listMessagesByConversation(req.params.id)
    res.json({ items: messages.map ? messages : messages })
  } catch (err) {
    handleError(res, err)
  }
})

// —— Knowledge ——
router.get('/knowledge', async (_req, res) => {
  try {
    const sb = getSupabaseAdmin()
    const { data, error } = await sb
      .from(TABLES.knowledge)
      .select('*')
      .order('sort_order', { ascending: true })
    if (error) throw error
    res.json({ items: (data || []).map(mapKnowledge) })
  } catch (err) {
    handleError(res, err)
  }
})

router.post('/knowledge', async (req, res) => {
  try {
    const sb = getSupabaseAdmin()
    const payload = {
      title: req.body.title || '',
      type: req.body.type || 'product',
      price: req.body.price || '',
      description: req.body.description || '',
      image_url: req.body.imageUrl || '',
      sort_order: Number(req.body.sortOrder || 1),
      trained: Boolean(req.body.trained),
    }
    const { data, error } = await sb.from(TABLES.knowledge).insert(payload).select('*').single()
    if (error) throw error
    res.status(201).json({ item: mapKnowledge(data) })
  } catch (err) {
    handleError(res, err)
  }
})

router.patch('/knowledge/:id', async (req, res) => {
  try {
    const sb = getSupabaseAdmin()
    const patch = { updated_at: new Date().toISOString() }
    if (req.body.title != null) patch.title = req.body.title
    if (req.body.type != null) patch.type = req.body.type
    if (req.body.price != null) patch.price = req.body.price
    if (req.body.description != null) patch.description = req.body.description
    if (req.body.imageUrl != null) patch.image_url = req.body.imageUrl
    if (req.body.sortOrder != null) patch.sort_order = Number(req.body.sortOrder)
    if (req.body.trained != null) patch.trained = Boolean(req.body.trained)

    const { data, error } = await sb
      .from(TABLES.knowledge)
      .update(patch)
      .eq('id', req.params.id)
      .select('*')
      .single()
    if (error) throw error
    res.json({ item: mapKnowledge(data) })
  } catch (err) {
    handleError(res, err)
  }
})

router.delete('/knowledge/:id', async (req, res) => {
  try {
    const sb = getSupabaseAdmin()
    const { error } = await sb.from(TABLES.knowledge).delete().eq('id', req.params.id)
    if (error) throw error
    res.json({ ok: true })
  } catch (err) {
    handleError(res, err)
  }
})

// —— Training ——
router.get('/training', async (_req, res) => {
  try {
    const sb = getSupabaseAdmin()
    const { data, error } = await sb
      .from(TABLES.trainingJobs)
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    res.json({ items: (data || []).map(mapTraining) })
  } catch (err) {
    handleError(res, err)
  }
})

router.post('/training', async (req, res) => {
  try {
    const sb = getSupabaseAdmin()
    const payload = {
      source_type: req.body.sourceType || 'text',
      label: req.body.label || 'Training job',
      status: req.body.status || 'queued',
      notes: req.body.notes || '',
    }
    const { data, error } = await sb.from(TABLES.trainingJobs).insert(payload).select('*').single()
    if (error) throw error
    res.status(201).json({ item: mapTraining(data) })
  } catch (err) {
    handleError(res, err)
  }
})

router.post('/training/process', async (_req, res) => {
  try {
    const sb = getSupabaseAdmin()
    const { data: queued, error: qErr } = await sb
      .from(TABLES.trainingJobs)
      .select('*')
      .eq('status', 'queued')
    if (qErr) throw qErr

    const { data: processing, error: pErr } = await sb
      .from(TABLES.trainingJobs)
      .select('*')
      .eq('status', 'processing')
    if (pErr) throw pErr

    for (const job of queued || []) {
      await sb
        .from(TABLES.trainingJobs)
        .update({
          status: 'processing',
          notes: `${job.notes} · started`,
          updated_at: new Date().toISOString(),
        })
        .eq('id', job.id)
    }

    for (const job of processing || []) {
      await sb
        .from(TABLES.trainingJobs)
        .update({
          status: 'completed',
          notes: `${job.notes} · completed`,
          updated_at: new Date().toISOString(),
        })
        .eq('id', job.id)
    }

    const { data, error } = await sb
      .from(TABLES.trainingJobs)
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    res.json({ items: (data || []).map(mapTraining) })
  } catch (err) {
    handleError(res, err)
  }
})

// —— Widget settings ——
router.get('/settings/tones', (_req, res) => {
  res.json({ items: ASSISTANT_TONES })
})

router.get('/settings/widget', async (_req, res) => {
  try {
    const sb = getSupabaseAdmin()
    const { data, error } = await sb
      .from(TABLES.widgetSettings)
      .select('*')
      .eq('id', 'default')
      .single()
    if (error) throw error
    res.json({ item: mapWidget(data), tones: ASSISTANT_TONES })
  } catch (err) {
    handleError(res, err)
  }
})

router.put('/settings/widget', async (req, res) => {
  try {
    const sb = getSupabaseAdmin()
    const tone = isValidTone(req.body.assistantTone) ? req.body.assistantTone : 'professional'
    const payload = {
      id: 'default',
      primary_color: req.body.primaryColor || '#1a1714',
      accent_color: req.body.accentColor || '#a67c52',
      bubble_color: req.body.bubbleColor || '#f4efe6',
      text_color: req.body.textColor || '#1a1714',
      launcher_color: req.body.launcherColor || '#a67c52',
      assistant_tone: tone,
      updated_at: new Date().toISOString(),
    }
    const { data, error } = await sb
      .from(TABLES.widgetSettings)
      .upsert(payload)
      .select('*')
      .single()
    if (error) throw error
    res.json({ item: mapWidget(data), tones: ASSISTANT_TONES })
  } catch (err) {
    handleError(res, err)
  }
})

export default router
