import { NextRequest, NextResponse } from 'next/server'

export type Provider = 'huggingface' | 'gemini' | 'openai'
export type ChatMessage = { role: 'user' | 'assistant'; content: string }
const systemPrompt = 'You are Openclow, a helpful and professional AI assistant. Format answers with Markdown. Tasks in this app are a local checklist, not scheduled notifications.'
const names: Record<Provider, string> = { huggingface: 'Hugging Face', gemini: 'Gemini', openai: 'OpenAI' }
const keyNames: Record<Provider, string> = {
  huggingface: 'HUGGINGFACE_API_KEY',
  gemini: 'GEMINI_API_KEY',
  // Never accidentally consume the Manus sandbox's unrelated OpenAI key.
  openai: 'OPENCLOW_OPENAI_API_KEY',
}
const noCache = { 'Cache-Control': 'private, no-store' }

function json(body: object, status = 200) {
  return NextResponse.json(body, { status, headers: noCache })
}

export function providerStatus(provider: Provider) {
  return json({ available: Boolean(process.env[keyNames[provider]]?.trim()) })
}

export function parseMessages(body: Record<string, unknown>): ChatMessage[] {
  const messages = body.messages ?? (typeof body.prompt === 'string' ? [{ role: 'user', content: body.prompt }] : null)
  if (!Array.isArray(messages) || !messages.length || messages.length > 20) {
    throw new Error('Send between 1 and 20 conversation messages.')
  }
  let size = 0
  return messages.map((message: unknown) => {
    if (!message || typeof message !== 'object') throw new Error('Invalid conversation message.')
    const item = message as Record<string, unknown>
    if ((item.role !== 'user' && item.role !== 'assistant') || typeof item.content !== 'string' || !item.content.trim()) {
      throw new Error('Each message needs a user or assistant role and nonempty text.')
    }
    size += item.content.length
    if (item.content.length > 16000 || size > 64000) throw new Error('Conversation is too long. Shorten your message or start a new conversation.')
    return { role: item.role, content: item.content }
  })
}

type Completion = {
  choices?: { message?: { content?: string } }[]
  candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] } }[]
}

export async function providerChat(request: NextRequest, provider: Provider) {
  let body: Record<string, unknown>
  let messages: ChatMessage[]
  try {
    const raw = await request.text()
    if (raw.length > 100000) return json({ error: 'Request is too large.' }, 413)
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Send a JSON object.')
    body = parsed as Record<string, unknown>
    messages = parseMessages(body)
    if (body.apiKey !== undefined && typeof body.apiKey !== 'string') throw new Error('API key must be text.')
  } catch (error) {
    return json({ error: error instanceof SyntaxError ? 'Send valid JSON.' : error instanceof Error ? error.message : 'Invalid request.' }, 400)
  }

  const apiKey = (typeof body.apiKey === 'string' ? body.apiKey.trim() : '') || process.env[keyNames[provider]]?.trim()
  if (!apiKey) return json({ error: `Add your ${names[provider]} API key in Settings to start chatting.` }, 401)
  if (apiKey.length > 4096 || /[\r\n]/.test(apiKey)) return json({ error: 'Invalid API key format.' }, 400)

  let url: string
  let payload: object
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (provider === 'gemini') {
    const model = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite'
    url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`
    headers['x-goog-api-key'] = apiKey
    payload = {
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: messages.map(message => ({ role: message.role === 'assistant' ? 'model' : 'user', parts: [{ text: message.content }] })),
      generationConfig: { maxOutputTokens: 2048 },
    }
  } else {
    url = provider === 'huggingface' ? 'https://router.huggingface.co/v1/chat/completions' : 'https://api.openai.com/v1/chat/completions'
    headers.Authorization = `Bearer ${apiKey}`
    payload = {
      model: provider === 'huggingface' ? process.env.HUGGINGFACE_MODEL || 'meta-llama/Llama-3.1-8B-Instruct' : process.env.OPENCLOW_OPENAI_MODEL || 'gpt-4o-mini',
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
      max_tokens: 2048,
    }
  }

  try {
    const response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(payload), signal: AbortSignal.timeout(60000), cache: 'no-store' })
    if (!response.ok) {
      // Do not relay raw upstream diagnostics: some providers include credentials in them.
      const status = response.status
      const error = status === 401 || status === 403
        ? `${names[provider]} rejected the key or its permissions. Check Settings${provider === 'huggingface' ? ' and enable Inference Providers permission for your token' : ''}.`
        : status === 429 ? `${names[provider]} rate limit or quota reached. Wait and retry, or check your provider account.`
        : status === 404 ? `${names[provider]} model is unavailable. The site owner can update the configured model.`
        : `${names[provider]} is temporarily unavailable. Please retry.`
      return json({ error }, [401, 403, 404, 429].includes(status) ? status : 502)
    }
    const data = await response.json() as Completion
    const text = provider === 'gemini'
      ? data.candidates?.[0]?.content?.parts?.filter(part => !part.thought).map(part => part.text || '').join('')
      : data.choices?.[0]?.message?.content
    if (typeof text !== 'string' || !text.trim()) return json({ error: `${names[provider]} returned no answer. The message may have been blocked; try rephrasing it.` }, 502)
    return json({ response: text })
  } catch (error) {
    const timeout = error instanceof Error && ['TimeoutError', 'AbortError'].includes(error.name)
    return json({ error: timeout ? 'The provider took too long to answer. Please retry.' : 'Could not reach the AI provider. Please retry.' }, timeout ? 504 : 502)
  }
}
