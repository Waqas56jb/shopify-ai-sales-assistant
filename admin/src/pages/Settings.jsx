import { useEffect, useState } from 'react'
import { MessageCircle, Copy, Check } from 'lucide-react'
import { useAppData } from '../context/AppDataContext'
import { api } from '../lib/api'
import { API_BASE } from '../lib/config'

const WIDGET_HOST = 'https://shopify-ai-sales-assistant.vercel.app'
const EMBED_SCRIPT = `<script
  src="${WIDGET_HOST}/widget.js"
  data-position="right"
  data-color="#a67c52"
  defer
></script>`

export default function Settings() {
  const { widgetSettings, setWidgetSettings, saveWidgetSettings, dbStatus } = useAppData()
  const [tones, setTones] = useState([])
  const [saving, setSaving] = useState(false)
  const [savedNote, setSavedNote] = useState('')
  const [copied, setCopied] = useState(false)

  async function copyEmbed() {
    try {
      await navigator.clipboard.writeText(EMBED_SCRIPT)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const res = await api.getTones()
        if (alive) setTones(res.items || [])
      } catch {
        if (alive) {
          setTones([
            { id: 'professional', label: 'Professional', blurb: 'Polished, clear, business-ready.' },
            { id: 'friendly', label: 'Friendly', blurb: 'Warm, approachable, helpful.' },
            { id: 'funny', label: 'Funny', blurb: 'Light humor, still accurate.' },
            { id: 'warm', label: 'Warm', blurb: 'Soft, caring, unhurried.' },
            { id: 'concise', label: 'Concise', blurb: 'Short answers, high signal.' },
            { id: 'luxury', label: 'Luxury', blurb: 'Premium, elegant, refined.' },
            { id: 'supportive', label: 'Supportive', blurb: 'Patient guide for unsure shoppers.' },
            { id: 'energetic', label: 'Energetic', blurb: 'Upbeat and motivating.' },
            { id: 'educational', label: 'Educational', blurb: 'Teach trade-offs and specs.' },
            { id: 'casual', label: 'Casual', blurb: 'Relaxed everyday chat.' },
          ])
        }
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  function update(key, value) {
    setWidgetSettings({ ...widgetSettings, [key]: value })
    setSavedNote('')
  }

  async function persist() {
    setSaving(true)
    setSavedNote('')
    try {
      await saveWidgetSettings(widgetSettings)
      setSavedNote('Saved — chat will use this tone on the next message.')
    } catch (err) {
      setSavedNote(err.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const fields = [
    ['primaryColor', 'Primary color'],
    ['accentColor', 'Accent color'],
    ['bubbleColor', 'Bubble color'],
    ['textColor', 'Text color'],
    ['launcherColor', 'Launcher color'],
  ]

  const activeTone = widgetSettings.assistantTone || 'professional'

  return (
    <div className="settings-stack">
      <div className="panel">
        <div className="panel-head">
          <h3>Embed widget</h3>
          <span>Paste this script on any website</span>
        </div>
        <pre className="embed-code">{EMBED_SCRIPT}</pre>
        <div className="embed-actions">
          <button className="btn-primary" type="button" onClick={copyEmbed}>
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? 'Copied' : 'Copy script tag'}
          </button>
          <a className="btn-secondary" href={`${WIDGET_HOST}/embed-demo.html`} target="_blank" rel="noreferrer">
            Open demo page
          </a>
        </div>
        <div className="supabase-note">
          Widget URL: {WIDGET_HOST}/widget.js · Chat loads from the same host with{' '}
          <code>?embed=1</code> · API: {API_BASE}
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <h3>Assistant tone</h3>
          <span>10 tones · applied to live chat replies</span>
        </div>
        <div className="tone-grid">
          {tones.map((tone) => (
            <button
              key={tone.id}
              type="button"
              className={`tone-card${activeTone === tone.id ? ' active' : ''}`}
              onClick={() => update('assistantTone', tone.id)}
            >
              <strong>{tone.label}</strong>
              <span>{tone.blurb}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="split-2">
        <div className="panel">
          <div className="panel-head">
            <h3>Chatbot widget colors</h3>
            <span>Live preview updates instantly</span>
          </div>
          <div className="color-grid">
            {fields.map(([key, label]) => (
              <label className="color-field" key={key}>
                <span>{label}</span>
                <input
                  type="color"
                  value={widgetSettings[key]}
                  onChange={(e) => update(key, e.target.value)}
                />
              </label>
            ))}
          </div>
          <button className="btn-primary mt-14" type="button" onClick={persist} disabled={saving}>
            {saving ? 'Saving…' : 'Save tone & colors'}
          </button>
          {savedNote && <div className="supabase-note">{savedNote}</div>}
          <div className="supabase-note">
            Storage: {dbStatus === 'connected' ? 'Supabase via backend API' : 'API offline'}.
            API: {API_BASE}. Tone changes the assistant voice without changing product facts.
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <h3>Widget preview</h3>
            <span>Tone: {activeTone}</span>
          </div>
          <div
            className="widget-preview"
            style={{
              background: `linear-gradient(160deg, ${widgetSettings.bubbleColor}, #fffdf9)`,
            }}
          >
            <div
              className="preview-bubble"
              style={{
                background: widgetSettings.primaryColor,
                color: '#f4efe6',
                marginBottom: 10,
              }}
            >
              Desk & Day · {activeTone}
            </div>
            <div
              className="preview-bubble"
              style={{
                background: '#fff',
                color: widgetSettings.textColor,
                border: `1px solid ${widgetSettings.accentColor}33`,
              }}
            >
              Hi! I can help you choose a desk essential, check sample shipping, or explain returns.
            </div>
            <div
              className="preview-launcher"
              style={{ background: widgetSettings.launcherColor }}
            >
              <MessageCircle size={22} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
