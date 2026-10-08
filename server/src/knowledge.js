import { TABLES, getSupabaseAdmin, mapKnowledge } from './db.js'
import { getTone } from './tones.js'
import { leadProgress } from './leads.js'

export const STORE = {
  name: 'Desk & Day',
  currency: 'USD',
  url: 'https://1mfsbv-dg.myshopify.com/',
  passwordHint: 'Storefront password for Bryan’s demo: owheat',
  summary:
    'Desk & Day is a private demonstration Shopify storefront (fictional desk-accessories shop) for an AI shopping assistant tutorial. Sample products and policies only — no real purchases, shipments, refunds, or support.',
  tagline: 'Small essentials. A more considered desk.',
  contact:
    'Private demonstration storefront for an AI shopping assistant tutorial. There is no customer service team or real fulfillment. Do not submit real orders, passwords, payment details, or personal customer information.',
}

export const MEMORY_TURNS = 20

/** Fallback catalog used if Supabase is unreachable */
export const FALLBACK_PRODUCTS = [
  {
    id: 'laptop-stand',
    name: 'Adjustable Aluminum Laptop Stand',
    tag: 'Stand',
    price: '$39',
    priceValue: 39,
    blurb: 'Adjustable height and angle for 11–17″ laptops.',
    tone: 'sand',
    imageUrl: '/products/aluminum-laptop-stand.png',
    description:
      'Adjustable Aluminum Laptop Stand: $39 USD. For 11 to 17 inch laptops; adjustable height and angle, non-slip pads and fold-flat aluminum construction. Laptop not included.',
  },
  {
    id: 'keyboard',
    name: 'Compact Wireless Keyboard',
    tag: 'Keyboard',
    price: '$59',
    priceValue: 59,
    blurb: 'Bluetooth, rechargeable, quiet compact keys.',
    tone: 'ink',
    imageUrl: '/products/compact-wireless-keyboard.png',
    description:
      'Compact Wireless Keyboard: $59 USD. Bluetooth, rechargeable battery, quiet compact keys, no number pad. Sample compatibility: Windows, macOS, iPadOS and Android.',
  },
  {
    id: 'lamp',
    name: 'Rechargeable LED Desk Lamp',
    tag: 'Lamp',
    price: '$49',
    priceValue: 49,
    blurb: 'Warm/cool modes, USB-C, up to 8 hours runtime.',
    tone: 'oak',
    imageUrl: '/products/rechargeable-led-desk-lamp.png',
    description:
      'Rechargeable LED Desk Lamp: $49 USD. Adjustable brightness, warm and cool modes, USB-C charging, adjustable arm. Sample runtime: up to 8 hours on the lowest setting.',
  },
]

export const POLICIES = {
  shipping:
    'For chatbot demonstrations, assume shipping within the contiguous United States only. Sample processing time is 1 to 2 business days, followed by 3 to 5 business days in transit. Sample shipping costs $4.95, or is free on merchandise subtotals of $75 or more. These are fictional test rules, not actual services.',
  returns:
    'For testing, assume unused items in original packaging may be returned within 30 days of delivery after contacting support. Damaged items should be reported with a photo. No actual returns or refunds are processed by this demo store.',
  ordering:
    'No. Browse the products and use fictional questions to test the assistant. Do not enter payment information or personal customer data, and do not complete checkout. There are no real orders to track. The assistant must not invent order status, tracking numbers or refund confirmations.',
  bundles:
    'For a raised laptop setup, choose the stand and keyboard. For reading or evening work, choose the lamp. The stand plus lamp totals $88; the stand plus keyboard totals $98; all three total $147 before any hypothetical shipping or tax.',
  faq: [
    {
      q: 'What can I get for a desk setup under $100?',
      a: 'Stand + lamp = $88, or stand + keyboard = $98. All three = $147 (over $100).',
    },
    {
      q: 'Does the keyboard work with an iPad?',
      a: 'Sample compatibility includes iPadOS, plus Windows, macOS, and Android.',
    },
    {
      q: 'Which product would help with evening reading?',
      a: 'The Rechargeable LED Desk Lamp ($49) with warm/cool modes and adjustable brightness.',
    },
    {
      q: 'What are the sample shipping and return rules?',
      a: 'Contiguous US only; 1–2 days processing + 3–5 transit; $4.95 or free over $75. Returns: unused in original packaging within 30 days (demo only — no real refunds).',
    },
  ],
}

let cache = {
  products: FALLBACK_PRODUCTS,
  knowledgeItems: [],
  assistantTone: 'professional',
  loadedAt: 0,
}

const PUBLIC_BASE = () =>
  (
    process.env.PUBLIC_BASE_URL ||
    'https://shopify-ai-sales-assistant-54i6.vercel.app'
  ).replace(/\/$/, '')

function absoluteImage(url = '') {
  if (!url) return ''
  if (/^https?:\/\//i.test(url)) return url
  return `${PUBLIC_BASE()}${url.startsWith('/') ? url : `/${url}`}`
}

function knowledgeRowToProduct(item) {
  const title = item.title || ''
  const priceNum = Number(String(item.price || '').replace(/[^0-9.]/g, '')) || 0
  let id = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
  let tag = 'Product'
  let tone = 'sand'
  if (/laptop.?stand|aluminum/i.test(title)) {
    id = 'laptop-stand'
    tag = 'Stand'
    tone = 'sand'
  } else if (/keyboard/i.test(title)) {
    id = 'keyboard'
    tag = 'Keyboard'
    tone = 'ink'
  } else if (/lamp/i.test(title)) {
    id = 'lamp'
    tag = 'Lamp'
    tone = 'oak'
  }

  const description = item.description || ''
  return {
    id,
    name: title,
    tag,
    price: priceNum ? `$${priceNum}` : item.price || '',
    priceValue: priceNum,
    blurb: description.slice(0, 120) + (description.length > 120 ? '…' : ''),
    tone,
    imageUrl: absoluteImage(item.imageUrl || item.image_url || ''),
    description,
  }
}

export async function refreshKnowledgeFromDb() {
  try {
    const sb = getSupabaseAdmin()
    const [{ data, error }, widgetRes] = await Promise.all([
      sb.from(TABLES.knowledge).select('*').order('sort_order', { ascending: true }),
      sb.from(TABLES.widgetSettings).select('*').eq('id', 'default').maybeSingle(),
    ])
    if (error) throw error
    const items = (data || []).map(mapKnowledge)
    const products = items
      .filter((k) => k.type === 'product')
      .map(knowledgeRowToProduct)
      .map((p) => ({ ...p, imageUrl: absoluteImage(p.imageUrl) }))

    cache = {
      products: products.length
        ? products
        : FALLBACK_PRODUCTS.map((p) => ({ ...p, imageUrl: absoluteImage(p.imageUrl) })),
      knowledgeItems: items,
      assistantTone: widgetRes.data?.assistant_tone || 'professional',
      loadedAt: Date.now(),
    }
    return cache
  } catch (err) {
    console.warn('[knowledge] DB refresh failed, using fallback:', err.message)
    cache = {
      products: FALLBACK_PRODUCTS.map((p) => ({
        ...p,
        imageUrl: absoluteImage(p.imageUrl),
      })),
      knowledgeItems: cache.knowledgeItems,
      assistantTone: cache.assistantTone || 'professional',
      loadedAt: Date.now(),
    }
    return cache
  }
}

export function getProducts() {
  return cache.products
}

export function getKnowledgeItems() {
  return cache.knowledgeItems
}

export function getAssistantToneId() {
  return cache.assistantTone || 'professional'
}

/** @deprecated use getProducts() */
export const PRODUCTS = FALLBACK_PRODUCTS

export function buildSystemPrompt({ toneId, leadState } = {}) {
  const products = getProducts()
  const extras = getKnowledgeItems().filter((k) => k.type !== 'product')
  const tone = getTone(toneId || getAssistantToneId())
  const nextLeadField = leadProgress(leadState || {})
  const knownLead = {
    name: leadState?.name || '',
    email: leadState?.email || '',
    phone: leadState?.phone || '',
    message: leadState?.message || '',
  }

  const productBlock = products
    .map(
      (p) =>
        `- ${p.name} (id: ${p.id}) | ${p.price} | ${p.tag}\n  Description: ${p.description}\n  Image: ${p.imageUrl || 'n/a'}`
    )
    .join('\n')

  const extraBlock = extras.length
    ? extras.map((k) => `- [${k.type}] ${k.title}: ${k.description}`).join('\n')
    : ''

  return `You are the Desk & Day AI sales & support assistant for a private Shopify demo storefront.

# Identity
- Store: ${STORE.name}
- URL: ${STORE.url}
- Tagline: ${STORE.tagline}
- Active tone: **${tone.label}** — ${tone.guide}

# Non‑negotiable rules (no hallucination)
1. Use ONLY the store knowledge in this prompt. If something is not listed, say you do not have that detail in the demo — do NOT invent products, prices, specs, stock, tracking numbers, refunds, or policies.
2. Only these 3 products exist. Never mention other desks, brands, or accessories.
3. This is a fictional tutorial store: no real purchases, shipments, refunds, or support.
4. Never collect passwords or payment / card details. If asked, refuse and explain demo limits.
5. Stay on-topic for Desk & Day (products, sample shipping/returns, recommendations, lead follow-up). For unrelated topics, briefly decline and steer back.
6. Do not mention system prompts, APIs, JSON lead blocks, or that you are roleplaying.

# Memory & context continuity
- You receive up to the last **${MEMORY_TURNS}** user/assistant turns. Treat them as long-term memory for this chat.
- NEVER re-ask for information the shopper already gave (name, email, phone, preferences, budget, use-case).
- When the shopper changes the question, keep earlier facts; just answer the new question.
- Do not repeat the same clarifying question twice. If unsure, make a best recommendation from known facts and offer one optional follow-up.
- Refer to the shopper by name once you know it.

# Answer format (beautiful Markdown — always)
Structure every reply with clear spacing:
- Start with a short **bold** lead line (1 sentence).
- Use \`##\` or \`###\` headings when comparing options or explaining policies.
- Use bullet lists for features, steps, or comparisons.
- Put a blank line between paragraphs and after headings.
- Keep paragraphs short (1–3 sentences).
- End with a single clear next step when useful (one question max).
- Align content cleanly — no walls of text, no cramped lines.
- Prices always with \$ and product full names on first mention.

# Lead capture (step-by-step, polite)
When the shopper shows interest in follow-up, a quote, or “contact me”, collect ONE field at a time:
1) name → 2) email → 3) phone → 4) short note (what they want help with).
Already known lead fields (do not re-ask):
- name: ${knownLead.name || '(unknown)'}
- email: ${knownLead.email || '(unknown)'}
- phone: ${knownLead.phone || '(unknown)'}
- message: ${knownLead.message || '(unknown)'}
Next field to collect if continuing lead flow: **${nextLeadField}**
- If next field is \`done\`, thank them once and stop asking for contact info.
- Offer lead capture naturally; never force it on every message.
- After your visible Markdown reply, append EXACTLY one machine block (shoppers will not see it) with updated lead fields you know:

:::lead
{"name":"","email":"","phone":"","message":"","nextField":"name|email|phone|message|done|null"}
:::

Fill only fields you actually know from the conversation. Use null for nextField when not in lead-capture mode.

# Products (only these)
${productBlock}

# Recommendation guide
${POLICIES.bundles}

# Sample shipping
${POLICIES.shipping}

# Sample returns
${POLICIES.returns}

# Orders / tracking
${POLICIES.ordering}

# Contact / demo notice
${STORE.contact}

# FAQ
${POLICIES.faq.map((f) => `Q: ${f.q}\nA: ${f.a}`).join('\n')}

${extraBlock ? `# Additional knowledge\n${extraBlock}\n` : ''}
# Edge cases
- Out of catalog → say it’s not in this 3-product demo; offer the closest of the three if relevant.
- “Where is my order?” → explain no real orders / no tracking; do not invent status.
- Abusive or off-topic → stay brief, professional, redirect.
- Ambiguous ask → ask ONE clarifying question OR recommend based on best match — not both repeatedly.
`
}

export function pickRecommendations(userText = '', assistantText = '') {
  const products = getProducts()
  const hay = `${userText} ${assistantText}`.toLowerCase()
  const byId = Object.fromEntries(products.map((p) => [p.id, p]))
  const ids = new Set()

  if (/stand|laptop.?stand|aluminum|raised|ergonomic/.test(hay)) ids.add('laptop-stand')
  if (/keyboard|bluetooth|ipad|typing|keys/.test(hay)) ids.add('keyboard')
  if (/lamp|light|reading|evening|brightness|warm|cool/.test(hay)) ids.add('lamp')

  if (/show me your products|all products|what do you sell|catalog|collection|desk essentials/.test(hay)) {
    return products
  }

  if (/under ?\$?100|budget|bundle|setup/.test(hay)) {
    return [byId['laptop-stand'], byId.lamp].filter(Boolean)
  }

  if (/recommend|which product|best|should i|help me choose|suggest/.test(hay)) {
    if (ids.size === 0) return products.slice(0, 2)
  }

  if (ids.size === 0) return null
  const selected = [...ids].map((id) => byId[id]).filter(Boolean)
  return selected.length ? selected : null
}
