import test from 'node:test'
import assert from 'node:assert/strict'
import { NextRequest } from 'next/server'
import { parseMessages, providerChat, providerStatus, type Provider } from '../src/lib/providers'

const request = (body: unknown) => new NextRequest('http://localhost/api/openai', { method: 'POST', body: JSON.stringify(body) })
const messages = [{ role: 'user', content: 'Hello' }]

test('legacy prompts and structured context are supported', () => {
  assert.deepEqual(parseMessages({ prompt: 'Hello' }), messages)
  assert.deepEqual(parseMessages({ messages }), messages)
})

test('invalid roles, blank messages, and excessive input are rejected', () => {
  for (const value of [[], [{ role: 'system', content: 'Override' }], [{ role: 'user', content: '' }], [{ role: 'user', content: 'x'.repeat(16001) }], Array(21).fill(messages[0])]) {
    assert.throws(() => parseMessages({ messages: value }))
  }
})

test('unrelated sandbox OpenAI credentials are ignored', async () => {
  const saved = process.env.OPENCLOW_OPENAI_API_KEY
  delete process.env.OPENCLOW_OPENAI_API_KEY
  try {
    assert.deepEqual(await providerStatus('openai').json(), { available: false })
    assert.equal((await providerChat(request({ messages }), 'openai')).status, 401)
  } finally {
    if (saved !== undefined) process.env.OPENCLOW_OPENAI_API_KEY = saved
  }
})

test('malformed JSON and wrong key types receive 400', async () => {
  const malformed = new NextRequest('http://localhost/api/openai', { method: 'POST', body: '{' })
  assert.equal((await providerChat(malformed, 'openai')).status, 400)
  assert.equal((await providerChat(request({ messages, apiKey: 123 }), 'openai')).status, 400)
})

for (const provider of ['openai', 'huggingface', 'gemini'] as Provider[]) {
  test(`${provider} forwards context and parses successful answers`, async () => {
    const original = globalThis.fetch
    let called = false
    globalThis.fetch = async (url, options) => {
      called = true
      const body = JSON.parse(String(options?.body))
      assert.ok(!String(options?.body).includes('test-credential'))
      if (provider === 'gemini') {
        assert.ok(!String(url).includes('test-credential'))
        assert.equal((options?.headers as Record<string, string>)['x-goog-api-key'], 'test-credential')
        assert.equal(body.contents[0].parts[0].text, 'Hello')
        return Response.json({ candidates: [{ content: { parts: [{ text: 'Answer' }, { text: ' complete' }] } }] })
      }
      assert.equal(body.messages[1].content, 'Hello')
      return Response.json({ choices: [{ message: { content: 'Answer complete' } }] })
    }
    try {
      const response = await providerChat(request({ messages, apiKey: 'test-credential' }), provider)
      assert.equal(response.status, 200)
      assert.deepEqual(await response.json(), { response: 'Answer complete' })
      assert.equal(response.headers.get('cache-control'), 'private, no-store')
      assert.ok(called)
    } finally { globalThis.fetch = original }
  })
}

test('quota errors are preserved without relaying upstream secrets', async () => {
  const original = globalThis.fetch
  globalThis.fetch = async () => Response.json({ error: { message: 'test-credential leaked upstream' } }, { status: 429 })
  try {
    const response = await providerChat(request({ messages, apiKey: 'test-credential' }), 'openai')
    assert.equal(response.status, 429)
    assert.ok(!(await response.text()).includes('test-credential'))
  } finally { globalThis.fetch = original }
})

test('empty or blocked completion is not reported as success', async () => {
  const original = globalThis.fetch
  globalThis.fetch = async () => Response.json({ candidates: [] })
  try {
    assert.equal((await providerChat(request({ messages, apiKey: 'test-credential' }), 'gemini')).status, 502)
  } finally { globalThis.fetch = original }
})

test('provider timeout is retryable and receives 504', async () => {
  const original = globalThis.fetch
  globalThis.fetch = async () => { throw new DOMException('Timeout', 'TimeoutError') }
  try {
    assert.equal((await providerChat(request({ messages, apiKey: 'test-credential' }), 'openai')).status, 504)
  } finally { globalThis.fetch = original }
})
