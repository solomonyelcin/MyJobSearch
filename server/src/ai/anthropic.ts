/** Minimal Anthropic Messages API client (uses Node 20's built-in fetch, so no extra dependency). */
const API_URL = 'https://api.anthropic.com/v1/messages'

export function aiEnabled(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY)
}

export function aiModel(): string {
  return process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5'
}

export interface AiRequest {
  system: string
  user: string
  maxTokens?: number
  temperature?: number
  webSearch?: { maxUses?: number; country?: string }
  timeoutMs?: number
}

interface ContentBlock {
  type: string
  text?: string
}

export async function callClaude(req: AiRequest): Promise<string> {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) throw new Error('AI is not configured (ANTHROPIC_API_KEY is missing)')

  const body: Record<string, unknown> = {
    model: aiModel(),
    max_tokens: req.maxTokens ?? 4000,
    temperature: req.temperature ?? 0,
    system: req.system,
    messages: [{ role: 'user', content: req.user }],
  }
  if (req.webSearch) {
    body.tools = [
      {
        type: 'web_search_20250305',
        name: 'web_search',
        max_uses: req.webSearch.maxUses ?? 5,
        ...(req.webSearch.country ? { user_location: { type: 'approximate', country: req.webSearch.country } } : {}),
      },
    ]
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), req.timeoutMs ?? 60000)
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      throw new Error(`Anthropic API ${res.status}: ${detail.slice(0, 300)}`)
    }
    const data = (await res.json()) as { content?: ContentBlock[] }
    return (data.content || []).filter(b => b.type === 'text' && b.text).map(b => b.text).join('\n').trim()
  } finally {
    clearTimeout(timer)
  }
}

/** Pull the first JSON object/array out of a model reply (handles ```json fences and chatter). */
export function parseJsonLoose<T>(text: string): T {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const src = (fenced ? fenced[1] : text).trim()
  const start = src.search(/[{[]/)
  if (start === -1) throw new Error('Model reply contained no JSON')
  const open = src[start]
  const close = open === '{' ? '}' : ']'
  let depth = 0
  let inStr = false
  let esc = false
  for (let i = start; i < src.length; i++) {
    const ch = src[i]
    if (inStr) {
      if (esc) esc = false
      else if (ch === '\\') esc = true
      else if (ch === '"') inStr = false
      continue
    }
    if (ch === '"') inStr = true
    else if (ch === open) depth++
    else if (ch === close && --depth === 0) return JSON.parse(src.slice(start, i + 1)) as T
  }
  throw new Error('Model reply contained incomplete JSON')
}
