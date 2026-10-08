import { useEffect, useState } from 'react'
import { MessageSquare, RefreshCw, SendHorizontal } from 'lucide-react'
import { useAppData } from '../context/AppDataContext'
import { api } from '../lib/api'

function formatWhen(value) {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleString()
  } catch {
    return String(value)
  }
}

export default function Conversations() {
  const { conversations, setConversations, dbStatus } = useAppData()
  const [selectedId, setSelectedId] = useState(null)
  const [messages, setMessages] = useState([])
  const [active, setActive] = useState(null)
  const [reply, setReply] = useState('')
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  async function refreshList() {
    try {
      const res = await api.getConversations()
      setConversations(res.items || [])
    } catch (err) {
      setError(err.message || 'Failed to refresh')
    }
  }

  async function openThread(id) {
    setSelectedId(id)
    setLoading(true)
    setError('')
    try {
      const res = await api.getConversation(id)
      setActive(res.item)
      setMessages(res.messages || [])
    } catch (err) {
      setError(err.message || 'Failed to load thread')
    } finally {
      setLoading(false)
    }
  }

  async function sendReply(e) {
    e.preventDefault()
    const text = reply.trim()
    if (!text || !selectedId || sending) return
    setSending(true)
    setError('')
    try {
      const res = await api.replyConversation(selectedId, text)
      setMessages((prev) => [...prev, res.message])
      setActive(res.item)
      setReply('')
      await refreshList()
    } catch (err) {
      setError(err.message || 'Reply failed')
    } finally {
      setSending(false)
    }
  }

  async function markStatus(status) {
    if (!selectedId) return
    try {
      const res = await api.updateConversation(selectedId, { status })
      setActive(res.item)
      await refreshList()
    } catch (err) {
      setError(err.message || 'Status update failed')
    }
  }

  useEffect(() => {
    if (!selectedId) return undefined
    const t = setInterval(() => {
      api
        .getConversation(selectedId)
        .then((res) => {
          setActive(res.item)
          setMessages(res.messages || [])
        })
        .catch(() => {})
    }, 8000)
    return () => clearInterval(t)
  }, [selectedId])

  return (
    <div className="conv-layout">
      <div className="panel conv-list-panel">
        <div className="panel-head">
          <h3>Conversations</h3>
          <button className="btn-secondary" type="button" onClick={refreshList}>
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>
        <p className="muted" style={{ marginBottom: 12, fontSize: 13 }}>
          {conversations.length} threads · {dbStatus === 'connected' ? 'Live Supabase' : 'API'}
        </p>
        <div className="conv-list">
          {conversations.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`conv-row${selectedId === c.id ? ' active' : ''}`}
              onClick={() => openThread(c.id)}
            >
              <div className="conv-row-top">
                <strong>{c.visitor || 'Guest'}</strong>
                <span className={`badge ${c.status}`}>{c.status.replace('_', ' ')}</span>
              </div>
              <p>{c.lastMessage || 'No messages yet'}</p>
              <small>
                {c.messages || 0} msgs · {formatWhen(c.updatedAt)}
              </small>
            </button>
          ))}
          {!conversations.length && (
            <div className="supabase-note">
              No conversations yet. Chat from the widget or client — threads appear here automatically.
            </div>
          )}
        </div>
      </div>

      <div className="panel conv-thread-panel">
        {!selectedId ? (
          <div className="conv-empty">
            <MessageSquare size={28} color="#a67c52" />
            <h3>Select a conversation</h3>
            <p>Read the full chat and reply as the human operator.</p>
          </div>
        ) : (
          <>
            <div className="panel-head">
              <div>
                <h3>{active?.visitor || 'Guest'}</h3>
                <span>
                  {active?.channel || 'widget'} · {active?.status?.replace('_', ' ')}
                  {active?.handoffNote ? ` · handoff: ${active.handoffNote}` : ''}
                </span>
              </div>
              <div className="conv-actions">
                <button className="btn-secondary" type="button" onClick={() => markStatus('handed_off')}>
                  Mark handed off
                </button>
                <button className="btn-secondary" type="button" onClick={() => markStatus('resolved')}>
                  Resolve
                </button>
              </div>
            </div>

            {error && <div className="error-text" style={{ marginBottom: 10 }}>{error}</div>}

            <div className="conv-thread">
              {loading && <p className="muted">Loading…</p>}
              {!loading &&
                messages.map((m) => (
                  <div key={m.id} className={`conv-bubble ${m.role}`}>
                    <div className="conv-bubble-label">
                      {m.role === 'user' ? 'Shopper' : m.role === 'admin' ? 'You (admin)' : 'AI assistant'}
                    </div>
                    <div className="conv-bubble-text">{m.content}</div>
                    <div className="conv-bubble-time">{formatWhen(m.createdAt)}</div>
                  </div>
                ))}
              {!loading && !messages.length && (
                <p className="muted">No stored messages for this thread yet.</p>
              )}
            </div>

            <form className="conv-reply" onSubmit={sendReply}>
              <textarea
                rows={3}
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="Type a human reply to the shopper…"
              />
              <button className="btn-primary" type="submit" disabled={sending || !reply.trim()}>
                <SendHorizontal size={16} />
                {sending ? 'Sending…' : 'Send reply'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
