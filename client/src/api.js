import { API_BASE } from './config'

export async function streamChat({
  messages,
  sessionId,
  lead,
  signal,
  onToken,
  onRecommendations,
  onLead,
  onError,
}) {
  const response = await fetch(`${API_BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, sessionId, lead }),
    signal,
  })

  if (!response.ok || !response.body) {
    let message = 'Could not reach the assistant server.'
    try {
      const data = await response.json()
      message = data.error || message
    } catch {
      // ignore
    }
    throw new Error(message)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { value, done } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const parts = buffer.split('\n\n')
    buffer = parts.pop() || ''

    for (const part of parts) {
      const line = part
        .split('\n')
        .find((l) => l.startsWith('data: '))
      if (!line) continue

      let payload
      try {
        payload = JSON.parse(line.slice(6))
      } catch {
        continue
      }

      if (payload.type === 'token' && payload.content) {
        onToken?.(payload.content)
      } else if (payload.type === 'recommendations') {
        onRecommendations?.(payload.items || [])
      } else if (payload.type === 'lead') {
        onLead?.(payload.item)
      } else if (payload.type === 'error') {
        onError?.(payload.message || 'Assistant error')
      }
    }
  }
}
