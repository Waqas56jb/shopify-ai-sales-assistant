import 'dotenv/config'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import cors from 'cors'
import express from 'express'
import OpenAI from 'openai'
import {
  STORE,
  MEMORY_TURNS,
  buildSystemPrompt,
  pickRecommendations,
  refreshKnowledgeFromDb,
  getProducts,
  getAssistantToneId,
} from './knowledge.js'
import { extractLeadBlock, stripPartialLead, mergeLeadState, upsertLead } from './leads.js'
import adminRoutes from './routes/admin.js'
import { TABLES, getSupabaseAdmin } from './db.js'
import { ASSISTANT_TONES } from './tones.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PORT = Number(process.env.PORT || 3001)
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5174'
const ADMIN_ORIGIN = process.env.ADMIN_ORIGIN || 'http://localhost:5175'
const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini'

function allowedOrigins() {
  const fromEnv = String(process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  return [
    ...new Set([
      CLIENT_ORIGIN,
      ADMIN_ORIGIN,
      ...fromEnv,
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:5175',
      'http://127.0.0.1:5174',
      'http://127.0.0.1:5175',
      'https://shopify-ai-sales-assistant.vercel.app',
      'https://shopify-ai-sales-assistant-34sp.vercel.app',
      'https://shopify-ai-sales-assistant-54i6.vercel.app',
    ]),
  ]
}

const app = express()
app.use(
  cors({
    origin(origin, callback) {
      const list = allowedOrigins()
      // Allow non-browser clients (no Origin) and known frontends
      if (!origin || list.includes(origin)) return callback(null, true)
      console.warn('[cors] blocked origin:', origin)
      return callback(null, false)
    },
    credentials: true,
  })
)
app.use(express.json({ limit: '2mb' }))
app.use('/products', express.static(path.join(__dirname, '../public/products')))

function getOpenAI() {
  const key = (process.env.OPENAI_API_KEY || '').trim()
  if (!key) {
    const err = new Error('OPENAI_API_KEY is missing in server/.env')
    err.code = 'MISSING_KEY'
    throw err
  }
  return new OpenAI({ apiKey: key })
}

async function upsertConversation({ sessionId, visitor, lastMessage, messagesCount, leadName }) {
  const sb = getSupabaseAdmin()
  const payload = {
    visitor: leadName || visitor || 'Widget guest',
    channel: 'widget',
    status: 'open',
    last_message: String(lastMessage || '').slice(0, 240),
    messages_count: messagesCount,
    updated_at: new Date().toISOString(),
  }

  if (sessionId) {
    const { data: existing } = await sb
      .from(TABLES.conversations)
      .select('id')
      .eq('channel', 'widget')
      .eq('visitor', `session:${sessionId}`)
      .limit(1)

    if (existing?.[0]?.id) {
      const { error } = await sb
        .from(TABLES.conversations)
        .update({ ...payload, visitor: `session:${sessionId}` })
        .eq('id', existing[0].id)
      if (error) throw error
      return existing[0].id
    }

    const { data, error } = await sb
      .from(TABLES.conversations)
      .insert({ ...payload, visitor: `session:${sessionId}` })
      .select('id')
      .single()
    if (error) throw error
    return data.id
  }

  const { data, error } = await sb.from(TABLES.conversations).insert(payload).select('id').single()
  if (error) throw error
  return data.id
}

app.get('/api/health', async (_req, res) => {
  await refreshKnowledgeFromDb()
  let supabaseOk = false
  try {
    const sb = getSupabaseAdmin()
    const { error } = await sb.from(TABLES.widgetSettings).select('id').limit(1)
    supabaseOk = !error
  } catch {
    supabaseOk = false
  }

  res.json({
    ok: true,
    store: STORE.name,
    products: getProducts().length,
    model: MODEL,
    memoryTurns: MEMORY_TURNS,
    tones: ASSISTANT_TONES.map((t) => t.id),
    assistantTone: getAssistantToneId(),
    hasOpenAIKey: Boolean((process.env.OPENAI_API_KEY || '').trim()),
    supabaseOk,
    tablePrefix: 'shopify_store_database_',
  })
})

app.get('/api/knowledge', async (_req, res) => {
  await refreshKnowledgeFromDb()
  res.json({
    store: STORE,
    products: getProducts(),
    tones: ASSISTANT_TONES,
    assistantTone: getAssistantToneId(),
  })
})

app.use('/api/admin', adminRoutes)

app.post('/api/chat', async (req, res) => {
  const messages = Array.isArray(req.body?.messages) ? req.body.messages : []
  const sessionId = typeof req.body?.sessionId === 'string' ? req.body.sessionId.slice(0, 80) : ''
  const incomingLead = req.body?.lead && typeof req.body.lead === 'object' ? req.body.lead : {}

  const clean = messages
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }))
    .slice(-MEMORY_TURNS)

  if (!clean.length || clean[clean.length - 1].role !== 'user') {
    return res.status(400).json({ error: 'Send messages ending with a user message.' })
  }

  await refreshKnowledgeFromDb()
  let leadState = mergeLeadState({}, incomingLead, clean)

  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders?.()

  const send = (payload) => {
    res.write(`data: ${JSON.stringify(payload)}\n\n`)
  }

  const latestUser = clean[clean.length - 1].content
  let rawAssistant = ''
  let visibleAssistant = ''

  try {
    const openai = getOpenAI()
    const stream = await openai.chat.completions.create({
      model: MODEL,
      stream: true,
      temperature: 0.35,
      presence_penalty: 0.2,
      frequency_penalty: 0.25,
      messages: [
        {
          role: 'system',
          content: buildSystemPrompt({
            toneId: getAssistantToneId(),
            leadState,
          }),
        },
        ...clean,
      ],
    })

    for await (const chunk of stream) {
      const token = chunk.choices?.[0]?.delta?.content || ''
      if (!token) continue
      rawAssistant += token
      const nextVisible = stripPartialLead(rawAssistant)
      const delta = nextVisible.slice(visibleAssistant.length)
      if (delta) {
        visibleAssistant = nextVisible
        send({ type: 'token', content: delta })
      }
    }

    const { cleanText, lead: leadFromModel } = extractLeadBlock(rawAssistant)
    if (cleanText !== visibleAssistant) {
      // Final sync if trailing block completed
      const remainder = cleanText.slice(visibleAssistant.length)
      if (remainder) send({ type: 'token', content: remainder })
      visibleAssistant = cleanText
    } else if (!visibleAssistant && cleanText) {
      visibleAssistant = cleanText
      send({ type: 'token', content: cleanText })
    }

    leadState = mergeLeadState(leadState, leadFromModel || {}, [...clean, { role: 'assistant', content: visibleAssistant }])

    let savedLead = null
    try {
      if (leadState.name || leadState.email || leadState.phone) {
        savedLead = await upsertLead(leadState, { sessionId })
        if (savedLead?.id) leadState.id = savedLead.id
      }
    } catch (leadErr) {
      console.warn('[chat] lead upsert skipped:', leadErr.message)
    }

    try {
      await upsertConversation({
        sessionId,
        visitor: 'Widget guest',
        leadName: leadState.name,
        lastMessage: latestUser,
        messagesCount: clean.length + 1,
      })
    } catch (persistErr) {
      console.warn('[chat] conversation persist skipped:', persistErr.message)
    }

    const recommendations = pickRecommendations(latestUser, visibleAssistant)
    if (recommendations?.length) {
      send({
        type: 'recommendations',
        items: recommendations.map(({ id, name, tag, price, blurb, tone, imageUrl, description }) => ({
          id,
          name,
          tag,
          price,
          blurb: blurb || description?.slice(0, 120),
          description: description || blurb || '',
          tone,
          imageUrl,
        })),
      })
    }

    if (savedLead || leadState.name || leadState.email) {
      send({
        type: 'lead',
        item: savedLead || leadState,
      })
    }

    send({ type: 'done' })
    res.end()
  } catch (err) {
    console.error('[chat]', err.message)
    const message =
      err.code === 'MISSING_KEY'
        ? 'OpenAI API key is missing. Add OPENAI_API_KEY to server/.env and restart the server.'
        : err.status === 401
          ? 'OpenAI API key is invalid. Please check server/.env.'
          : err.code === 'insufficient_quota' || err.status === 429
            ? 'OpenAI credits are exhausted. Please add credits and try again.'
            : 'Something went wrong while generating a reply. Please try again.'

    send({ type: 'error', message })
    send({ type: 'done' })
    res.end()
  }
})

await refreshKnowledgeFromDb()

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Desk & Day API running on http://localhost:${PORT}`)
    console.log(`Health: http://localhost:${PORT}/api/health`)
    console.log(`Memory turns: ${MEMORY_TURNS}`)
    console.log(`Admin API: http://localhost:${PORT}/api/admin/health-db`)
  })
}

export default app
