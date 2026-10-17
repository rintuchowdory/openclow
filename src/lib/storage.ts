export const AI_MODES = ['huggingface', 'gemini', 'openai'] as const

export type AiMode = (typeof AI_MODES)[number]
export type MessageKind = 'chat' | 'welcome' | 'error'
export type TaskPriority = 'low' | 'medium' | 'high'
export type TaskCategory = 'homework' | 'work' | 'devops' | 'personal'

export interface StoredMessage {
  id: string
  text: string
  sender: 'user' | 'ai'
  timestamp: string
  kind?: MessageKind
}

export interface StoredTask {
  id: string
  text: string
  completed: boolean
  priority: TaskPriority
  category: TaskCategory
  dueDate?: string
}

export interface StoredSettings {
  aiMode: AiMode
}

const TASK_PRIORITIES: readonly TaskPriority[] = ['low', 'medium', 'high']
const TASK_CATEGORIES: readonly TaskCategory[] = ['homework', 'work', 'devops', 'personal']
const MESSAGE_KINDS: readonly MessageKind[] = ['chat', 'welcome', 'error']

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)
const isNonEmptyString = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0
const includes = <T extends string>(values: readonly T[], value: unknown): value is T => typeof value === 'string' && values.includes(value as T)

const parseJson = (value: string | null): unknown => {
  if (value === null) return null
  try {
    return JSON.parse(value) as unknown
  } catch {
    return null
  }
}

const isStoredMessage = (value: unknown): value is StoredMessage => {
  if (!isRecord(value)) return false
  if (!isNonEmptyString(value.id) || typeof value.text !== 'string') return false
  if (value.sender !== 'user' && value.sender !== 'ai') return false
  if (!isNonEmptyString(value.timestamp) || Number.isNaN(Date.parse(value.timestamp))) return false
  return value.kind === undefined || includes(MESSAGE_KINDS, value.kind)
}

const isStoredTask = (value: unknown): value is StoredTask => {
  if (!isRecord(value)) return false
  if (!isNonEmptyString(value.id) || !isNonEmptyString(value.text) || typeof value.completed !== 'boolean') return false
  if (!includes(TASK_PRIORITIES, value.priority) || !includes(TASK_CATEGORIES, value.category)) return false
  return value.dueDate === undefined || typeof value.dueDate === 'string'
}

/** Returns null for absent, malformed, or invalid state; callers can safely choose a default. */
export const parseStoredMessages = (value: string | null): StoredMessage[] | null => {
  const parsed = parseJson(value)
  if (!Array.isArray(parsed) || !parsed.every(isStoredMessage)) return null
  return parsed.map(message => ({ ...message }))
}

/** Returns null for absent, malformed, or invalid state; callers can safely choose an empty list. */
export const parseStoredTasks = (value: string | null): StoredTask[] | null => {
  const parsed = parseJson(value)
  if (!Array.isArray(parsed) || !parsed.every(isStoredTask)) return null
  return parsed.map(task => ({ ...task }))
}

/**
 * Reads only a valid provider selection from old settings. Credential fields are intentionally
 * neither returned nor serialized, which migrates legacy settings without exposing their values.
 */
export const parseStoredSettings = (value: string | null): StoredSettings | null => {
  const parsed = parseJson(value)
  if (!isRecord(parsed) || !includes(AI_MODES, parsed.aiMode)) return null
  return { aiMode: parsed.aiMode }
}

/** Persist only the non-sensitive provider mode. */
export const serializeSettings = (aiMode: AiMode): string => JSON.stringify({ aiMode })
