import { useState } from 'react'
import { Plus, Trash2, ImagePlus } from 'lucide-react'
import { useAppData } from '../context/AppDataContext'
import { API_BASE } from '../lib/config'

const emptyForm = {
  title: '',
  type: 'product',
  price: '',
  description: '',
  imageUrl: '',
  sortOrder: 1,
}

function resolveImage(url) {
  if (!url) return ''
  if (/^https?:\/\//i.test(url) || url.startsWith('blob:')) return url
  return `${API_BASE}${url.startsWith('/') ? url : `/${url}`}`
}

export default function KnowledgeBase() {
  const { knowledge, addKnowledge, updateKnowledge, removeKnowledge, queueTraining, dbStatus } =
    useAppData()
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  function onImage(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    setForm((prev) => ({ ...prev, imageUrl: url }))
  }

  async function onSubmit(e) {
    e.preventDefault()
    if (!form.title.trim() || !form.description.trim() || saving) return
    setSaving(true)
    try {
      await addKnowledge({
        ...form,
        sortOrder: Number(form.sortOrder) || 1,
        trained: false,
      })
      await queueTraining({
        sourceType: form.imageUrl ? 'mixed' : 'text',
        label: `Knowledge: ${form.title}`,
        notes: 'Queued from Knowledge Base form',
        status: 'queued',
      })
      setForm(emptyForm)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="kb-page">
      <div className="panel">
        <div className="panel-head">
          <h3>Add knowledge item</h3>
          <span>
            Image · price · description · order · {dbStatus === 'connected' ? 'Supabase' : 'API'}
          </span>
        </div>
        <form className="kb-form kb-form-grid" onSubmit={onSubmit}>
          <div className="field">
            <label>Title</label>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Adjustable Aluminum Laptop Stand"
              required
            />
          </div>
          <div className="field">
            <label>Type</label>
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option value="product">Product</option>
              <option value="policy">Policy</option>
              <option value="faq">FAQ</option>
              <option value="image">Image note</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="field">
            <label>Price (optional)</label>
            <input
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              placeholder="39"
            />
          </div>
          <div className="field">
            <label>Sort order</label>
            <input
              type="number"
              min="1"
              value={form.sortOrder}
              onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
            />
          </div>
          <div className="field kb-form-span">
            <label>Description</label>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Clear product or policy details for training..."
              required
            />
          </div>
          <div className="field">
            <label>Image</label>
            <input type="file" accept="image/*" onChange={onImage} />
            {form.imageUrl && (
              <div className="kb-thumb" style={{ marginTop: 8 }}>
                <img src={form.imageUrl} alt="Preview" />
              </div>
            )}
          </div>
          <div className="field kb-form-actions">
            <button className="btn-primary" type="submit" disabled={saving}>
              <Plus size={16} />
              {saving ? 'Saving…' : 'Save & queue training'}
            </button>
          </div>
        </form>
      </div>

      <div className="panel">
        <div className="panel-head">
          <h3>Knowledge library</h3>
          <span>{knowledge.length} items</span>
        </div>
        <div className="kb-list">
          {knowledge
            .slice()
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((item) => (
              <article className="kb-item" key={item.id}>
                <div className="kb-thumb">
                  {item.imageUrl ? (
                    <img src={resolveImage(item.imageUrl)} alt={item.title} />
                  ) : (
                    <div className="kb-thumb-empty">
                      <ImagePlus size={18} />
                    </div>
                  )}
                </div>
                <div className="kb-item-body">
                  <h4>{item.title}</h4>
                  <p>{item.description}</p>
                  <div className="kb-meta">
                    <span>Type: {item.type}</span>
                    {item.price && <span>Price: ${item.price}</span>}
                    <span>Order: {item.sortOrder}</span>
                    <span className={`badge ${item.trained ? 'trained' : 'untrained'}`}>
                      {item.trained ? 'trained' : 'needs training'}
                    </span>
                  </div>
                </div>
                <div className="kb-actions">
                  <button
                    className="btn-secondary"
                    type="button"
                    onClick={() => updateKnowledge(item.id, { trained: !item.trained })}
                  >
                    {item.trained ? 'Mark untrained' : 'Mark trained'}
                  </button>
                  <button className="btn-danger" type="button" onClick={() => removeKnowledge(item.id)}>
                    <Trash2 size={14} />
                    Remove
                  </button>
                </div>
              </article>
            ))}
        </div>
      </div>
    </div>
  )
}
