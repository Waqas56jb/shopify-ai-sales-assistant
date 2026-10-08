import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  SendHorizontal,
  ChevronLeft,
  Truck,
  Sparkles,
  Package,
} from 'lucide-react'
import { streamChat } from './api'
import MarkdownMessage from './MarkdownMessage'
import './App.css'

const MEMORY_TURNS = 20
const SESSION_KEY = 'deskday_chat_session'
const LEAD_KEY = 'deskday_lead_draft'

const SUGGESTIONS = [
  { label: 'What can I get for a desk setup under $100?', icon: Sparkles },
  { label: 'Does the keyboard work with an iPad?', icon: Package },
  { label: 'Which product would help with evening reading?', icon: Sparkles },
  { label: 'What are the sample shipping and return rules?', icon: Truck },
]

const STARTER = {
  id: 'welcome-note',
  role: 'assistant',
  text: 'Hey — I’m the **Desk & Day** demo assistant.\n\nI can help you compare the laptop stand, wireless keyboard, and LED lamp, or walk through the sample shipping and return rules.\n\n*(No real orders.)*',
  time: 'Now',
  streaming: false,
  recommendations: null,
}

function getOrCreateSessionId() {
  try {
    let id = localStorage.getItem(SESSION_KEY)
    if (!id) {
      id = crypto.randomUUID()
      localStorage.setItem(SESSION_KEY, id)
    }
    return id
  } catch {
    return crypto.randomUUID()
  }
}

function loadLeadDraft() {
  try {
    const raw = localStorage.getItem(LEAD_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function saveLeadDraft(lead) {
  try {
    localStorage.setItem(LEAD_KEY, JSON.stringify(lead || {}))
  } catch {
    // ignore
  }
}

function nowLabel() {
  return new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

function toApiMessages(messages) {
  return messages
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .filter((m) => m.id !== 'welcome-note')
    .map((m) => ({ role: m.role, content: m.text }))
    .slice(-MEMORY_TURNS)
}

function CoverPage({ onOpen }) {
  return (
    <motion.section
      className="cover"
      key="cover"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.03, filter: 'blur(6px)' }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="cover-glow cover-glow-a" aria-hidden="true" />
      <div className="cover-glow cover-glow-b" aria-hidden="true" />
      <div className="cover-grain" aria-hidden="true" />

      <motion.div
        className="cover-orbit"
        aria-hidden="true"
        animate={{ rotate: 360 }}
        transition={{ duration: 28, ease: 'linear', repeat: Infinity }}
      />

      <button className="cover-logo-btn" type="button" onClick={onOpen} aria-label="Open chat assistant">
        <motion.div
          className="cover-logo-ring"
          animate={{ scale: [1, 1.06, 1], opacity: [0.45, 0.8, 0.45] }}
          transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="cover-logo-ring cover-logo-ring-delay"
          animate={{ scale: [1, 1.14, 1], opacity: [0.2, 0.5, 0.2] }}
          transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut', delay: 0.45 }}
        />
        <motion.div
          className="cover-logo"
          initial={{ scale: 0.82, opacity: 0, y: 16 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.96 }}
          transition={{ type: 'spring', stiffness: 260, damping: 18 }}
        >
          <motion.span
            className="cover-logo-letter"
            animate={{ y: [0, -3, 0] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
          >
            D
          </motion.span>
        </motion.div>
      </button>

      <motion.div
        className="cover-copy"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.55 }}
      >
        <p className="cover-eyebrow">Desk & Day</p>
        <h1>Your desk, thoughtfully guided.</h1>
        <p className="cover-sub">Tap the mark to begin a quiet, helpful conversation.</p>
      </motion.div>

      <motion.button
        className="cover-cta"
        type="button"
        onClick={onOpen}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45, duration: 0.45 }}
        whileTap={{ scale: 0.98 }}
      >
        Start conversation
      </motion.button>
    </motion.section>
  )
}

function ProductCard({ product, index }) {
  return (
    <motion.article
      className={`product-card tone-${product.tone || 'sand'}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.08 * index, duration: 0.35 }}
    >
      <div className="product-visual">
        {product.imageUrl ? (
          <img src={product.imageUrl} alt={product.name || 'Product'} loading="lazy" />
        ) : (
          <span aria-hidden="true" />
        )}
      </div>
      <div className="product-body">
        <div className="product-top">
          <span className="product-tag">{product.tag}</span>
          <strong>{product.price}</strong>
        </div>
        <h4>{product.name}</h4>
        <p>{product.description || product.blurb}</p>
      </div>
    </motion.article>
  )
}

function ChatPage({ onBack }) {
  const [messages, setMessages] = useState([STARTER])
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [lead, setLead] = useState(() => loadLeadDraft())
  const sessionIdRef = useRef(getOrCreateSessionId())
  const endRef = useRef(null)
  const areaRef = useRef(null)
  const abortRef = useRef(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, busy])

  useEffect(() => {
    return () => abortRef.current?.abort()
  }, [])

  async function pushUser(value) {
    const trimmed = value.trim()
    if (!trimmed || busy) return

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    const userMsg = {
      id: crypto.randomUUID(),
      role: 'user',
      text: trimmed,
      time: nowLabel(),
      streaming: false,
      recommendations: null,
    }

    const assistantId = crypto.randomUUID()
    const historyForApi = [...messages, userMsg]

    setMessages((prev) => [
      ...prev,
      userMsg,
      {
        id: assistantId,
        role: 'assistant',
        text: '',
        time: nowLabel(),
        streaming: true,
        recommendations: null,
      },
    ])
    setText('')
    setBusy(true)

    try {
      await streamChat({
        messages: toApiMessages(historyForApi),
        sessionId: sessionIdRef.current,
        lead,
        signal: controller.signal,
        onToken: (token) => {
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, text: `${m.text}${token}` } : m))
          )
        },
        onRecommendations: (items) => {
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, recommendations: items } : m))
          )
        },
        onLead: (item) => {
          if (!item) return
          const next = {
            id: item.id || lead.id,
            name: item.name || '',
            email: item.email || '',
            phone: item.phone || '',
            message: item.message || '',
          }
          setLead(next)
          saveLeadDraft(next)
        },
        onError: (message) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, text: message || 'Something went wrong.', streaming: false }
                : m
            )
          )
        },
      })

      if (!controller.signal.aborted) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  streaming: false,
                  text:
                    m.text ||
                    'I could not generate a reply just now. Please try again in a moment.',
                }
              : m
          )
        )
      }
    } catch (err) {
      if (err.name === 'AbortError') return
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? {
                ...m,
                streaming: false,
                text:
                  err.message ||
                  'Could not reach the server. Make sure the API is running on port 3001.',
              }
            : m
        )
      )
    } finally {
      if (!controller.signal.aborted) setBusy(false)
    }
  }

  function onKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      pushUser(text)
    }
  }

  function autoGrow() {
    const el = areaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 96)}px`
  }

  return (
    <motion.div
      className="chat-shell"
      key="chat"
      initial={{ opacity: 0, y: 18, filter: 'blur(8px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      exit={{ opacity: 0, y: 10, filter: 'blur(6px)' }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      <header className="chat-header">
        <button className="icon-btn" type="button" aria-label="Back to cover" onClick={onBack}>
          <ChevronLeft size={18} />
        </button>
        <div className="brand-mark" aria-hidden="true">
          <span>D</span>
        </div>
        <div className="brand-copy">
          <h1>Desk & Day</h1>
          <p>
            <span className="live-dot" aria-hidden="true" />
            {busy ? 'Writing a reply…' : 'Sales assistant · Online'}
          </p>
        </div>
      </header>

      <main className="chat-scroll">
        <motion.section
          className="welcome"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.15, ease: 'easeOut' }}
        >
          <div className="welcome-top">
            <div className="eyebrow">Concierge</div>
            <span className="welcome-badge">3 products</span>
          </div>
          <h2>Find the right desk essentials.</h2>
          <p>Ask about the stand, keyboard, or lamp — plus sample shipping and returns.</p>
          <div className="suggestions">
            {SUGGESTIONS.map(({ label, icon: Icon }) => (
              <button
                key={label}
                className="chip"
                type="button"
                disabled={busy}
                onClick={() => pushUser(label)}
              >
                <Icon size={14} strokeWidth={2.1} />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </motion.section>

        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              className={`message-row ${msg.role}`}
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.28, ease: 'easeOut' }}
            >
              <div className={`bubble ${msg.role}${msg.recommendations?.length ? ' rich' : ''}`}>
                {msg.role === 'assistant' && <div className="bubble-label">Desk & Day</div>}
                <div className="bubble-text">
                  {msg.role === 'assistant' ? (
                    <MarkdownMessage text={msg.text} />
                  ) : (
                    <span className="plain-text">{msg.text}</span>
                  )}
                  {msg.streaming && <span className="caret" aria-hidden="true" />}
                </div>

                {msg.recommendations?.length > 0 && (
                  <div className="reco-block">
                    <div className="reco-title">Recommended for you</div>
                    <div className="reco-list">
                      {msg.recommendations.map((product, index) => (
                        <ProductCard key={product.id} product={product} index={index} />
                      ))}
                    </div>
                  </div>
                )}

                {!msg.streaming && <div className="meta">{msg.time}</div>}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        <div ref={endRef} />
      </main>

      <footer className="composer-wrap">
        <form
          className="composer"
          onSubmit={(e) => {
            e.preventDefault()
            pushUser(text)
          }}
        >
          <textarea
            ref={areaRef}
            rows={1}
            value={text}
            onChange={(e) => {
              setText(e.target.value)
              autoGrow()
            }}
            onKeyDown={onKeyDown}
            placeholder="Ask about products, shipping, returns..."
            aria-label="Message"
            disabled={busy}
          />
          <button className="send-btn" type="submit" disabled={!text.trim() || busy} aria-label="Send">
            <SendHorizontal size={18} />
          </button>
        </form>
        <div className="composer-note">Markdown replies · 20-turn memory · Desk & Day demo</div>
      </footer>
    </motion.div>
  )
}

export default function App() {
  const [view, setView] = useState('cover')

  return (
    <div className="app-stage">
      <div className="phone" role="application" aria-label="Desk and Day AI assistant">
        <AnimatePresence mode="wait">
          {view === 'cover' ? (
            <CoverPage key="cover" onOpen={() => setView('chat')} />
          ) : (
            <ChatPage key="chat" onBack={() => setView('cover')} />
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
