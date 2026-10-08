import { API_BASE } from './config'

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`)
  return data
}

export const api = {
  getLeads: () => request('/api/admin/leads'),
  updateLead: (id, body) =>
    request(`/api/admin/leads/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  getConversations: () => request('/api/admin/conversations'),
  getKnowledge: () => request('/api/admin/knowledge'),
  createKnowledge: (body) =>
    request('/api/admin/knowledge', { method: 'POST', body: JSON.stringify(body) }),
  updateKnowledge: (id, body) =>
    request(`/api/admin/knowledge/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteKnowledge: (id) => request(`/api/admin/knowledge/${id}`, { method: 'DELETE' }),
  getTraining: () => request('/api/admin/training'),
  createTraining: (body) =>
    request('/api/admin/training', { method: 'POST', body: JSON.stringify(body) }),
  processTraining: () => request('/api/admin/training/process', { method: 'POST', body: '{}' }),
  getWidgetSettings: () => request('/api/admin/settings/widget'),
  saveWidgetSettings: (body) =>
    request('/api/admin/settings/widget', { method: 'PUT', body: JSON.stringify(body) }),
  getTones: () => request('/api/admin/settings/tones'),
  healthDb: () => request('/api/admin/health-db'),
}
