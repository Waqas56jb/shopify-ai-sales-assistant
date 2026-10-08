/**
 * Edge-case smoke tests against the running API (needs OpenAI + server on :3001).
 */
import 'dotenv/config'

const BASE = process.env.PUBLIC_BASE_URL || `http://localhost:${process.env.PORT || 3001}`

async function chat(messages, { sessionId = 'edge-test', lead = {} } = {}) {
  const res = await fetch(`${BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, sessionId, lead }),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const text = await res.text()
  const events = text
    .split('\n\n')
    .map((chunk) => chunk.split('\n').find((l) => l.startsWith('data: ')))
    .filter(Boolean)
    .map((l) => {
      try {
        return JSON.parse(l.slice(6))
      } catch {
        return null
      }
    })
    .filter(Boolean)

  const reply = events
    .filter((e) => e.type === 'token')
    .map((e) => e.content)
    .join('')
  const recs = events.find((e) => e.type === 'recommendations')?.items || []
  const leadEvt = events.find((e) => e.type === 'lead')?.item || null
  const err = events.find((e) => e.type === 'error')
  return { reply, recs, leadEvt, err }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg)
}

async function main() {
  console.log('Health…')
  const health = await fetch(`${BASE}/api/health`).then((r) => r.json())
  console.log(health)
  assert(health.memoryTurns === 20, 'memoryTurns should be 20')
  assert(health.products === 3, 'expected 3 products')

  const cases = [
    {
      name: 'catalog only — no invent',
      messages: [{ role: 'user', content: 'Do you sell gaming chairs or coffee makers?' }],
      check: (r) => {
        assert(!/gaming chair|coffee maker/i.test(r.reply) || /don.?t|not|only|demo|three/i.test(r.reply), 'should refuse out-of-catalog')
      },
    },
    {
      name: 'recommend with images',
      messages: [{ role: 'user', content: 'Which product would help with evening reading?' }],
      check: (r) => {
        assert(/lamp/i.test(r.reply), 'should mention lamp')
        assert(r.recs.length > 0, 'should send recommendations')
        assert(r.recs.every((p) => p.imageUrl), 'recommendations need imageUrl')
        assert(r.recs.every((p) => p.description || p.blurb), 'recommendations need description')
      },
    },
    {
      name: 'markdown structure',
      messages: [{ role: 'user', content: 'What are the sample shipping and return rules?' }],
      check: (r) => {
        assert(/shipping|return/i.test(r.reply), 'policy answer')
        assert(/\n/.test(r.reply) || /\*\*|##|-/i.test(r.reply), 'expect markdown-ish formatting')
      },
    },
    {
      name: 'context continuity — no re-ask name',
      messages: [
        { role: 'user', content: 'My name is Alex and I want a raised laptop setup.' },
        {
          role: 'assistant',
          content: '**Nice to meet you, Alex.**\n\nFor a raised laptop setup, the stand + keyboard is a strong match.',
        },
        { role: 'user', content: 'What about shipping cost?' },
      ],
      check: (r) => {
        assert(!/what(?:'s| is) your name/i.test(r.reply), 'must not re-ask name')
        assert(/4\.95|\$4\.95|75/i.test(r.reply), 'should answer shipping from knowledge')
      },
    },
    {
      name: 'no order hallucination',
      messages: [{ role: 'user', content: 'Where is my order #998877? Give me the tracking number.' }],
      check: (r) => {
        assert(!/\b998877\b/.test(r.reply) || /no real|demo|cannot|don.?t/i.test(r.reply), 'no fake tracking')
        assert(!/UPS|FedEx|DHL|tracking number is/i.test(r.reply), 'must not invent carrier tracking')
      },
    },
  ]

  for (const c of cases) {
    process.stdout.write(`• ${c.name}… `)
    const result = await chat(c.messages)
    if (result.err) throw new Error(result.err.message)
    c.check(result)
    console.log('ok')
  }

  console.log('All edge checks passed.')
}

main().catch((e) => {
  console.error('TEST FAIL:', e.message)
  process.exit(1)
})
