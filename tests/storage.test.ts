import assert from 'node:assert/strict'
import test from 'node:test'
import {
  parseStoredMessages,
  parseStoredSettings,
  parseStoredTasks,
  serializeSettings,
} from '../src/lib/storage'

test('message parser accepts persisted conversation records and preserves optional kind', () => {
  const messages = parseStoredMessages(JSON.stringify([
    { id: 'message-1', text: 'Hello', sender: 'user', timestamp: '2026-01-02T03:04:05.000Z' },
    { id: 'message-2', text: 'Hi', sender: 'ai', timestamp: '2026-01-02T03:04:06.000Z', kind: 'chat' },
  ]))

  assert.deepEqual(messages, [
    { id: 'message-1', text: 'Hello', sender: 'user', timestamp: '2026-01-02T03:04:05.000Z' },
    { id: 'message-2', text: 'Hi', sender: 'ai', timestamp: '2026-01-02T03:04:06.000Z', kind: 'chat' },
  ])
})

test('message parser rejects malformed JSON and invalid message shapes without throwing', () => {
  assert.equal(parseStoredMessages('{not json'), null)
  assert.equal(parseStoredMessages(JSON.stringify([
    { id: 'message-1', text: 'Hello', sender: 'other', timestamp: '2026-01-02T03:04:05.000Z' },
  ])), null)
  assert.equal(parseStoredMessages(JSON.stringify([
    { id: 'message-1', text: 'Hello', sender: 'user', timestamp: 'not-a-date' },
  ])), null)
})

test('task parser accepts valid local checklist tasks including optional due dates', () => {
  const tasks = parseStoredTasks(JSON.stringify([
    { id: 'task-1', text: 'Ship repair', completed: false, priority: 'high', category: 'work', dueDate: '2026-02-03' },
    { id: 'task-2', text: 'Read', completed: true, priority: 'low', category: 'personal' },
  ]))

  assert.deepEqual(tasks, [
    { id: 'task-1', text: 'Ship repair', completed: false, priority: 'high', category: 'work', dueDate: '2026-02-03' },
    { id: 'task-2', text: 'Read', completed: true, priority: 'low', category: 'personal' },
  ])
})

test('task parser rejects malformed values and invalid enum members', () => {
  assert.equal(parseStoredTasks(null), null)
  assert.equal(parseStoredTasks(JSON.stringify([
    { id: 'task-1', text: 'Bad priority', completed: false, priority: 'urgent', category: 'work' },
  ])), null)
  assert.equal(parseStoredTasks(JSON.stringify([
    { id: 'task-1', text: '', completed: false, priority: 'low', category: 'work' },
  ])), null)
})

test('settings parser strips legacy credentials and serializer persists only aiMode', () => {
  const migrated = parseStoredSettings(JSON.stringify({
    aiMode: 'gemini',
    huggingfaceKey: 'legacy-hf-secret',
    geminiKey: 'legacy-gemini-secret',
    openaiKey: 'legacy-openai-secret',
  }))

  assert.deepEqual(migrated, { aiMode: 'gemini' })
  assert.deepEqual(JSON.parse(serializeSettings('openai')), { aiMode: 'openai' })
})

test('settings parser rejects invalid JSON, non-objects, and unrecognized providers', () => {
  assert.equal(parseStoredSettings('{bad json'), null)
  assert.equal(parseStoredSettings(JSON.stringify(['gemini'])), null)
  assert.equal(parseStoredSettings(JSON.stringify({ aiMode: 'unknown' })), null)
})
