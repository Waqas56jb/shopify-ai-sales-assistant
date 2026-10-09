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
import {
  extractLeadBlock,
  stripPartialLead,
  mergeLeadState,
  upsertLead,
  preferName,
  isPlaceholderName,
} from './leads.js'
import {
  wantsHandoff,
  upsertConversationRecord,
  appendMessages,
  listMessagesBySession,
  getConversationBySession,
} from './conversations.js'
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
      'https://1mfsbv-dg.myshopify.com',
    ]),
  ]
}

const app = express()
app.use(
  cors({
    origin(origin, callback) {
      const list = allowedOrigins()
      if (!origin || list.includes(origin)) return callback(null, true)
      try {
        // Embed widget on Shopify storefronts / previews
        if (/\.myshopify\.com$/i.test(new URL(origin).hostname)) return callback(null, true)
      } catch {
        // ignore
      }
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

/** Client polls this for admin replies */
app.get('/api/chat/session/:sessionId/messages', async (req, res) => {
  try {
    const sessionId = String(req.params.sessionId || '').slice(0, 80)
    const after = req.query.after || undefined
    const items = await listMessagesBySession(sessionId, { after })
    const conversation = await getConversationBySession(sessionId)
    res.json({ items, conversation })
  } catch (err) {
    console.error('[session-messages]', err.message)
    res.status(500).json({ error: err.message || 'Failed to load messages' })
  }
})

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
  const latestUser = clean[clean.length - 1].content
  const escalate = wantsHandoff(latestUser)
  let existingConv = null
  try {
    existingConv = sessionId ? await getConversationBySession(sessionId) : null
  } catch {
    existingConv = null
  }
  const alreadyHandedOff = existingConv?.status === 'handed_off' || escalate

  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders?.()

  const send = (payload) => {
    res.write(`data: ${JSON.stringify(payload)}\n\n`)
  }

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
            handedOff: alreadyHandedOff,
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
      const remainder = cleanText.slice(visibleAssistant.length)
      if (remainder) send({ type: 'token', content: remainder })
      visibleAssistant = cleanText
    } else if (!visibleAssistant && cleanText) {
      visibleAssistant = cleanText
      send({ type: 'token', content: cleanText })
    }

    leadState = mergeLeadState(leadState, leadFromModel || {}, [
      ...clean,
      { role: 'assistant', content: visibleAssistant },
    ])

    if (escalate && !leadState.message) {
      leadState.message = 'Requested human / live help from chat widget'
    }

    let savedLead = null
    try {
      if (leadState.name || leadState.email || leadState.phone || escalate) {
        // Only use placeholder on escalate when we still don't know the shopper
        if (escalate && isPlaceholderName(leadState.name)) {
          leadState.name = preferName(leadState.name) || 'Chat guest'
        }
        savedLead = await upsertLead(leadState, { sessionId })
        if (savedLead?.id) {
          leadState.id = savedLead.id
          leadState.name = preferName(savedLead.name, leadState.name)
          leadState.email = savedLead.email || leadState.email
          leadState.phone = savedLead.phone || leadState.phone
        }
      }
    } catch (leadErr) {
      console.warn('[chat] lead upsert skipped:', leadErr.message)
    }

    const visitorName = preferName(leadState.name, existingConv?.visitor) || 'Widget guest'

    let conversation = null
    try {
      conversation = await upsertConversationRecord({
        sessionId,
        visitor: visitorName,
        status: escalate || alreadyHandedOff ? 'handed_off' : 'open',
        lastMessage: latestUser,
        messagesCount: clean.length + 1,
        leadId: savedLead?.id || leadState.id || null,
        handoffNote: escalate ? latestUser.slice(0, 240) : existingConv?.handoffNote || '',
      })

      // Persist only the newest user + assistant turn (avoid duplicates on each call)
      await appendMessages(conversation.id, sessionId, [
        { role: 'user', content: latestUser },
        { role: 'assistant', content: visibleAssistant },
      ])
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
      send({ type: 'lead', item: savedLead || leadState })
    }

    if (conversation) {
      send({
        type: 'conversation',
        item: conversation,
        handedOff: conversation.status === 'handed_off',
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
