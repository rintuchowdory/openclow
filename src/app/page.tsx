'use client'

import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import {
  AI_MODES,
  type AiMode,
  parseStoredMessages,
  parseStoredSettings,
  parseStoredTasks,
  serializeSettings,
  type StoredMessage,
  type StoredTask,
} from '@/lib/storage'

type Message = Omit<StoredMessage, 'timestamp'> & { timestamp: Date }

type Task = StoredTask

interface Settings {
  huggingfaceKey: string
  geminiKey: string
  openaiKey: string
  aiMode: AiMode
}

const EMPTY_SETTINGS: Settings = {
  huggingfaceKey: '',
  geminiKey: '',
  openaiKey: '',
  aiMode: 'huggingface',
}

const welcomeMessage = (): Message => ({
  id: crypto.randomUUID(),
  text: '👋 **Welcome to Openclow!**\n\nChoose an AI provider in **Settings**, enter a key for this browser session, and start chatting.\n\nI can write code, analyze data, or just have a chat.',
  sender: 'ai',
  timestamp: new Date(),
  kind: 'welcome',
})

const activeKeyFor = (settings: Settings) => {
  if (settings.aiMode === 'huggingface') return settings.huggingfaceKey.trim()
  if (settings.aiMode === 'gemini') return settings.geminiKey.trim()
  return settings.openaiKey.trim()
}

const isActualConversationMessage = (message: Message) => {
  const isLegacyWelcome = message.id === '1' && message.sender === 'ai' && message.text.includes('Welcome to Openclow')
  const isLegacyError = message.sender === 'ai' && (
    message.text.startsWith('**Error Details:**') ||
    message.text.startsWith('⚠️ **Authentication Required**')
  )
  return message.kind !== 'welcome' && message.kind !== 'error' && !isLegacyWelcome && !isLegacyError
}

const errorText = (error: unknown) => {
  if (error instanceof Error) return error.message
  return 'The request could not be completed. Please try again.'
}

export default function OpenclowApp() {
  const [messages, setMessages] = useState<Message[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'chat' | 'tasks' | 'about'>('chat')
  const [showSettings, setShowSettings] = useState(false)
  const [isHydrated, setIsHydrated] = useState(false)
  const [providerAvailable, setProviderAvailable] = useState<boolean | null>(null)
  const [settings, setSettings] = useState<Settings>(EMPTY_SETTINGS)
  const [settingsDraft, setSettingsDraft] = useState<Settings>(EMPTY_SETTINGS)
  const [taskText, setTaskText] = useState('')
  const [taskCategory, setTaskCategory] = useState<Task['category']>('personal')
  const [taskPriority, setTaskPriority] = useState<Task['priority']>('medium')
  const [taskDueDate, setTaskDueDate] = useState('')
  const [showCommandPalette, setShowCommandPalette] = useState(false)
  const [taskFilter, setTaskFilter] = useState<'all' | 'open' | 'done'>('all')
  const [lastFailedPrompt, setLastFailedPrompt] = useState('')
  const [lastLatencyMs, setLastLatencyMs] = useState<number | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const sendLockRef = useRef(false)
  const requestControllerRef = useRef<AbortController | null>(null)

  const activeKey = useMemo(() => activeKeyFor(settings), [settings])
  const hasClientKey = activeKey.length > 0
  const isConfigured = hasClientKey || providerAvailable === true
  const aiLabel = settings.aiMode === 'huggingface' ? 'HuggingFace' : settings.aiMode === 'gemini' ? 'Gemini' : 'OpenAI'
  const actualMessageCount = messages.filter(isActualConversationMessage).length
  const openTaskCount = tasks.filter(task => !task.completed).length
  const filteredTasks = tasks.filter(task => taskFilter === 'all' || (taskFilter === 'done' ? task.completed : !task.completed))

  // Hydration is deliberately state-driven so persistence effects cannot write defaults in this render pass.
  useEffect(() => {
    let restoredMessages: Message[] | null = null
    let restoredTasks: Task[] | null = null
    let restoredMode: AiMode = EMPTY_SETTINGS.aiMode

    try {
      const parsedMessages = parseStoredMessages(localStorage.getItem('openclow-messages'))
      if (parsedMessages) {
        restoredMessages = parsedMessages.map(message => ({
          ...message,
          timestamp: new Date(message.timestamp),
        }))
      }

      const parsedTasks = parseStoredTasks(localStorage.getItem('openclow-tasks'))
      if (parsedTasks) restoredTasks = parsedTasks

      // Only aiMode is read from older settings; credential fields are intentionally discarded.
      const parsedSettings = parseStoredSettings(localStorage.getItem('openclow-settings'))
      if (parsedSettings) restoredMode = parsedSettings.aiMode

      // Rewriting this value removes legacy credential fields without inspecting or displaying them.
      localStorage.setItem('openclow-settings', serializeSettings(restoredMode))
    } catch {
      // Private browsing, quota, and malformed storage should never prevent the interface from loading.
    }

    const nextSettings = { ...EMPTY_SETTINGS, aiMode: restoredMode }
    setMessages(restoredMessages ?? [welcomeMessage()])
    setTasks(restoredTasks ?? [])
    setSettings(nextSettings)
    setSettingsDraft(nextSettings)
    setIsHydrated(true)
  }, [])

  useEffect(() => {
    if (!isHydrated) return
    try {
      localStorage.setItem('openclow-messages', JSON.stringify(messages))
    } catch {
      // Storage is optional; keep the current in-memory state usable.
    }
  }, [isHydrated, messages])

  useEffect(() => {
    if (!isHydrated) return
    try {
      localStorage.setItem('openclow-tasks', JSON.stringify(tasks))
    } catch {
      // Storage is optional; keep the current in-memory state usable.
    }
  }, [isHydrated, tasks])

  useEffect(() => {
    if (!isHydrated) return
    try {
      // Never serialize provider credentials. They exist only in this page's React state.
      localStorage.setItem('openclow-settings', serializeSettings(settings.aiMode))
    } catch {
      // A storage failure does not affect a configured in-memory key.
    }
  }, [isHydrated, settings.aiMode])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  useEffect(() => {
    if (!isHydrated || hasClientKey) {
      setProviderAvailable(null)
      return
    }

    const controller = new AbortController()
    setProviderAvailable(null)

    const checkAvailability = async () => {
      try {
        const response = await fetch(`/api/${settings.aiMode}`, { signal: controller.signal })
        const data: unknown = response.ok ? await response.json() : null
        const available = typeof data === 'object' && data !== null &&
          (data as { available?: unknown }).available === true
        if (!controller.signal.aborted) setProviderAvailable(available)
      } catch {
        // A transient check failure is unknown, not a persistent offline state.
        if (!controller.signal.aborted) setProviderAvailable(null)
      }
    }

    void checkAvailability()
    return () => controller.abort()
  }, [hasClientKey, isHydrated, settings.aiMode])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const editing = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.tagName === 'SELECT'
      if ((event.key === '/' && !editing) || ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k')) {
        event.preventDefault()
        setShowCommandPalette(true)
      }
      if (event.key === 'Escape') setShowCommandPalette(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const openSettings = () => {
    setSettingsDraft(settings)
    setShowSettings(true)
  }

  const closeSettings = () => {
    setSettingsDraft(settings)
    setShowSettings(false)
  }

  const saveSettings = () => {
    setSettings(settingsDraft)
    setShowSettings(false)
  }

  const addTask = (text: string, category: Task['category'], priority: Task['priority'], dueDate?: string) => {
    const trimmedText = text.trim()
    if (!trimmedText) return

    setTasks(previous => [
      ...previous,
      {
        id: crypto.randomUUID(),
        text: trimmedText,
        completed: false,
        category,
        priority,
        ...(dueDate ? { dueDate } : {}),
      },
    ])
  }

  const submitTask = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    addTask(taskText, taskCategory, taskPriority, taskDueDate || undefined)
    setTaskText('')
    setTaskCategory('personal')
    setTaskPriority('medium')
    setTaskDueDate('')
  }

  const toggleTask = (id: string) => {
    setTasks(previous => previous.map(task => task.id === id ? { ...task, completed: !task.completed } : task))
  }

  const deleteTask = (id: string) => {
    setTasks(previous => previous.filter(task => task.id !== id))
  }

  const clearConversation = () => {
    if (!window.confirm('Clear this local conversation? This cannot be undone.')) return
    setMessages([welcomeMessage()])
    setLastFailedPrompt('')
  }

  const copyMessage = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      // Clipboard permission is optional; the conversation remains available.
    }
  }

  const stopRequest = () => {
    requestControllerRef.current?.abort()
  }

  const sendMessage = async (textOverride?: string) => {
    if (sendLockRef.current || isLoading) return

    const text = (textOverride ?? inputMessage).trim()
    if (!text) return

    if (!isConfigured) {
      setMessages(previous => [
        ...previous,
        {
          id: crypto.randomUUID(),
          text: '⚠️ **Key required**\n\nOpen **Settings** from the navigation and enter a key for the selected provider.',
          sender: 'ai',
          timestamp: new Date(),
          kind: 'error',
        },
      ])
      return
    }

    // State updates are async, so this synchronous lock prevents duplicate submits in the same event turn.
    sendLockRef.current = true
    const userMessage: Message = {
      id: crypto.randomUUID(),
      text,
      sender: 'user',
      timestamp: new Date(),
      kind: 'chat',
    }
    const conversation = [...messages, userMessage]
      .filter(isActualConversationMessage)
      .slice(-20)
      .map(message => ({
        role: message.sender === 'user' ? 'user' as const : 'assistant' as const,
        content: message.text,
      }))

    setMessages(previous => [...previous, userMessage])
    setInputMessage('')
    setIsLoading(true)

    const controller = new AbortController()
    requestControllerRef.current = controller
    const startedAt = Date.now()
    const timeoutId = window.setTimeout(() => controller.abort(), 65_000)

    try {
      const response = await fetch(`/api/${settings.aiMode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({ messages: conversation, apiKey: activeKey }),
      })

      let data: unknown
      try {
        data = await response.json()
      } catch {
        throw new Error('The provider returned an invalid response.')
      }

      const error = typeof data === 'object' && data !== null && typeof (data as { error?: unknown }).error === 'string'
        ? (data as { error: string }).error
        : null
      const aiText = typeof data === 'object' && data !== null && typeof (data as { response?: unknown }).response === 'string'
        ? (data as { response: string }).response.trim()
        : ''

      if (!response.ok) throw new Error(error || `The provider request failed (${response.status}).`)
      if (!aiText) throw new Error('The provider returned an empty response.')

      setMessages(previous => [
        ...previous,
        {
          id: crypto.randomUUID(),
          text: aiText,
          sender: 'ai',
          timestamp: new Date(),
          kind: 'chat',
        },
      ])

      setLastFailedPrompt('')

      // Only successful conversations may create an inferred local checklist item.
      if (text.toLowerCase().includes('remind me') || text.toLowerCase().includes('add task')) {
        const task = text.replace(/remind me to|add task|remind me/gi, '').trim()
        if (task) addTask(task, 'personal', 'medium')
      }
    } catch (error) {
      const timedOut = controller.signal.aborted
      if (!timedOut || error instanceof DOMException) setLastFailedPrompt(text)
      setMessages(previous => [
        ...previous,
        {
          id: crypto.randomUUID(),
          text: `**Request error**\n\n${timedOut ? 'The request timed out. Please try again.' : errorText(error)}`,
          sender: 'ai',
          timestamp: new Date(),
          kind: 'error',
        },
      ])
    } finally {
      window.clearTimeout(timeoutId)
      requestControllerRef.current = null
      setLastLatencyMs(Date.now() - startedAt)
      sendLockRef.current = false
      setIsLoading(false)
    }
  }

  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'high': return 'bg-rose-500/20 text-rose-400 border-rose-500/30'
      case 'medium': return 'bg-amber-500/20 text-amber-400 border-amber-500/30'
      case 'low': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
    }
  }

  return (
    <div className="digital-grid relative flex h-dvh overflow-hidden font-mono text-slate-200 selection:bg-cyan-400/30">
      <div className="digital-scanlines pointer-events-none absolute inset-0 z-20 opacity-40" />
      <div className="pointer-events-none absolute left-1/4 top-0 h-[500px] w-[500px] rounded-full bg-indigo-600/15 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-0 right-1/4 h-[600px] w-[600px] rounded-full bg-purple-600/10 blur-[150px]" />
      <div className="pointer-events-none absolute right-0 top-1/2 h-[400px] w-[400px] rounded-full bg-blue-600/10 blur-[100px]" />

      {showSettings && (
        <div className="absolute inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:items-center">
          <button aria-label="Close settings" className="absolute inset-0 cursor-default bg-black/70 backdrop-blur-lg" onClick={closeSettings} />
          <div className="digital-panel relative my-auto max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-3xl border border-cyan-300/20 bg-[#0a1020]/95 p-5 shadow-2xl animate-in fade-in zoom-in-95 duration-200 sm:p-8">
            <div className="mb-6 flex items-center justify-between sm:mb-8">
              <h2 className="digital-glow text-2xl font-bold tracking-tight text-cyan-100">System configuration</h2>
              <button onClick={closeSettings} aria-label="Close settings" className="text-slate-400 transition-colors hover:text-white">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="mb-3 block text-sm font-semibold text-slate-300">Select Provider</label>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3">
                  {AI_MODES.map(mode => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setSettingsDraft(draft => ({ ...draft, aiMode: mode }))}
                      className={`rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200 ${
                        settingsDraft.aiMode === mode
                          ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-600/30 ring-1 ring-indigo-400'
                          : 'bg-white/5 text-slate-400 ring-1 ring-white/10 hover:bg-white/10 hover:text-slate-200'
                      }`}
                    >
                      {mode === 'huggingface' ? '🤗 HuggingFace' : mode === 'gemini' ? '✨ Gemini' : '🚀 OpenAI'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl bg-white/5 p-5 ring-1 ring-white/10">
                {settingsDraft.aiMode === 'huggingface' && (
                  <div className="animate-in fade-in slide-in-from-bottom-2">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <label htmlFor="huggingface-key" className="text-sm font-semibold text-slate-300">HuggingFace Token</label>
                      <a href="https://huggingface.co/settings/tokens" target="_blank" rel="noreferrer" className="text-xs text-indigo-400 transition-colors hover:text-indigo-300">Get token ↗</a>
                    </div>
                    <input id="huggingface-key" type="password" value={settingsDraft.huggingfaceKey} onChange={event => setSettingsDraft(draft => ({ ...draft, huggingfaceKey: event.target.value }))} placeholder="hf_..." autoComplete="off" className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3.5 text-white placeholder-slate-600 transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                )}

                {settingsDraft.aiMode === 'gemini' && (
                  <div className="animate-in fade-in slide-in-from-bottom-2">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <label htmlFor="gemini-key" className="text-sm font-semibold text-slate-300">Gemini API Key</label>
                      <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-xs text-indigo-400 transition-colors hover:text-indigo-300">Get key ↗</a>
                    </div>
                    <input id="gemini-key" type="password" value={settingsDraft.geminiKey} onChange={event => setSettingsDraft(draft => ({ ...draft, geminiKey: event.target.value }))} placeholder="AIza..." autoComplete="off" className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3.5 text-white placeholder-slate-600 transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                )}

                {settingsDraft.aiMode === 'openai' && (
                  <div className="animate-in fade-in slide-in-from-bottom-2">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <label htmlFor="openai-key" className="text-sm font-semibold text-slate-300">OpenAI API Key</label>
                      <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer" className="text-xs text-indigo-400 transition-colors hover:text-indigo-300">Get key ↗</a>
                    </div>
                    <input id="openai-key" type="password" value={settingsDraft.openaiKey} onChange={event => setSettingsDraft(draft => ({ ...draft, openaiKey: event.target.value }))} placeholder="sk-..." autoComplete="off" className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3.5 text-white placeholder-slate-600 transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                )}
              </div>

              <p className="text-sm leading-relaxed text-slate-400">Provider keys stay only in this page&apos;s current memory. They are not saved to browser storage.</p>
            </div>

            <div className="mt-8 flex gap-3">
              <button type="button" onClick={closeSettings} className="flex-1 rounded-xl bg-transparent px-4 py-3.5 font-semibold text-slate-300 ring-1 ring-white/10 transition-colors hover:bg-white/5">Cancel</button>
                  <button type="button" onClick={saveSettings} className="flex-1 rounded-xl bg-cyan-300/15 px-4 py-3.5 font-semibold text-cyan-100 shadow-lg shadow-cyan-500/10 ring-1 ring-cyan-300/30 transition-all hover:bg-cyan-300/25">Save</button>
            </div>
          </div>
        </div>
      )}

      {showCommandPalette && (
        <div className="absolute inset-0 z-50 flex items-start justify-center bg-slate-950/70 p-4 pt-[12vh] backdrop-blur-sm" onClick={() => setShowCommandPalette(false)}>
          <div className="digital-panel w-full max-w-xl rounded-2xl border border-cyan-300/30 bg-[#08101f] p-3 shadow-2xl" role="dialog" aria-modal="true" aria-label="Command palette" onClick={event => event.stopPropagation()}>
            <div className="flex items-center gap-3 border-b border-white/10 px-3 pb-3 text-xs uppercase tracking-[0.2em] text-cyan-200">
              <span className="text-cyan-400">⌘</span> Command palette <span className="ml-auto text-[10px] text-slate-500">ESC</span>
            </div>
            <div className="grid gap-1 pt-2">
              {[
                ['Go to chat', () => setActiveTab('chat')],
                ['Open tasks', () => setActiveTab('tasks')],
                ['Open settings', openSettings],
                ['New conversation', clearConversation],
              ].map(([label, action]) => (
                <button key={label as string} type="button" className="flex items-center justify-between rounded-xl px-3 py-3 text-left text-sm text-slate-200 transition-colors hover:bg-cyan-300/10 hover:text-cyan-100" onClick={() => { (action as () => void)(); setShowCommandPalette(false) }}>
                  <span>{label as string}</span><span className="text-xs text-slate-600">↵</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="relative z-10 flex h-full w-full flex-col md:flex-row">
        <aside className="flex w-full shrink-0 flex-col border-b border-white/5 bg-gradient-to-b from-slate-900/50 to-slate-950/50 backdrop-blur-sm md:w-64 md:border-b-0 md:border-r">
          <div className="border-b border-cyan-300/10 bg-slate-950/20 p-3 md:p-6">
            <div className="flex items-center gap-3 md:mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-cyan-300/50 bg-cyan-300/10 shadow-[0_0_28px_rgba(34,211,238,0.2)]"><span className="text-lg font-bold text-cyan-200">C</span></div>
              <div>
                <h1 className="digital-glow text-lg font-bold uppercase tracking-[0.18em] text-cyan-100">Openclow</h1>
                <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Neural console · {isConfigured ? 'ready' : 'key required'}</p>
              </div>
            </div>
            <button type="button" onClick={openSettings} aria-label="Open settings" className="rounded-lg p-2 text-slate-300 ring-1 ring-white/10 transition-colors hover:bg-white/10 hover:text-white md:hidden">⚙️</button>
          </div>

          <nav aria-label="Primary navigation" className="flex gap-1 overflow-x-auto p-2 md:flex-1 md:flex-col md:gap-2 md:p-4">
            {(['chat', 'tasks', 'about'] as const).map(tab => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`shrink-0 whitespace-nowrap rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 md:w-full md:px-4 md:py-3 md:text-left ${
                  activeTab === tab ? 'bg-cyan-300/10 text-cyan-100 ring-1 ring-cyan-300/30' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                }`}
              >
                {tab === 'chat' && '💬 Chat'}
                {tab === 'tasks' && '✓ Tasks'}
                {tab === 'about' && 'ℹ️ About'}
              </button>
            ))}
          </nav>

          <div className="hidden space-y-3 border-t border-white/5 p-4 md:block">
            <div title={providerAvailable === true ? 'Provider availability check completed' : undefined} className="flex items-center gap-2 rounded-lg bg-white/5 px-4 py-3 ring-1 ring-white/10">
              <div className={`h-2 w-2 rounded-full ${isConfigured ? 'bg-emerald-500' : 'bg-slate-500'}`} />
              <span className="text-xs font-medium text-slate-300">{aiLabel} · {isConfigured ? 'Configured' : 'Key required'}</span>
            </div>
            <button type="button" onClick={openSettings} className="w-full rounded-lg bg-gradient-to-r from-indigo-600/20 to-purple-600/20 px-4 py-3 font-medium text-slate-200 ring-1 ring-indigo-500/30 transition-all hover:from-indigo-600/30 hover:to-purple-600/30">⚙️ Settings</button>
          </div>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 border-b border-cyan-300/10 bg-slate-950/35 px-4 py-2 text-[10px] uppercase tracking-[0.16em] text-slate-500 sm:px-6">
            <span className="text-cyan-300">{aiLabel}</span>
            <span>{isLoading ? 'uplink active' : 'standby'}</span>
            <span>{actualMessageCount} msgs</span>
            <span>{openTaskCount} open tasks</span>
            {lastLatencyMs !== null && <span>last {lastLatencyMs}ms</span>}
            <span className="ml-auto">{isHydrated ? 'local vault ready' : 'hydrating'}</span>
          </div>
          {activeTab === 'chat' && (
            <>
              <div className="flex shrink-0 items-center justify-between border-b border-white/5 px-4 py-2 sm:px-6">
                <span className="text-[10px] uppercase tracking-[0.2em] text-slate-600">channel / primary</span>
                <div className="flex items-center gap-2">
                  {lastFailedPrompt && <button type="button" onClick={() => void sendMessage(lastFailedPrompt)} className="rounded-lg px-2 py-1 text-[10px] uppercase tracking-wider text-amber-300 ring-1 ring-amber-300/20 hover:bg-amber-300/10">retry</button>}
                  {isLoading && <button type="button" onClick={stopRequest} className="rounded-lg px-2 py-1 text-[10px] uppercase tracking-wider text-rose-300 ring-1 ring-rose-300/20 hover:bg-rose-300/10">stop</button>}
                  <button type="button" onClick={clearConversation} className="rounded-lg px-2 py-1 text-[10px] uppercase tracking-wider text-slate-500 ring-1 ring-white/10 hover:bg-white/5 hover:text-slate-200">clear</button>
                  <button type="button" onClick={() => setShowCommandPalette(true)} className="hidden rounded-lg px-2 py-1 text-[10px] uppercase tracking-wider text-slate-500 ring-1 ring-white/10 hover:text-cyan-200 sm:inline-flex">⌘K</button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                <div className="space-y-4">
                  {messages.map(message => (
                    <div key={message.id} className={`flex min-w-0 ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`digital-panel min-w-0 max-w-full break-words rounded-2xl px-4 py-4 ring-1 [overflow-wrap:anywhere] sm:max-w-2xl sm:px-6 ${message.sender === 'user' ? 'bg-cyan-300/10 text-cyan-50 ring-cyan-300/30' : 'bg-slate-950/45 ring-white/10'}`}>
                        <ReactMarkdown
                          components={{
                            code: ({ className, children }) => {
                              const match = /language-(\w+)/.exec(className || '')
                              return match ? (
                                <SyntaxHighlighter style={vscDarkPlus} language={match[1]} PreTag="div" wrapLongLines customStyle={{ maxWidth: '100%', overflowX: 'auto' }}>
                                  {String(children).replace(/\n$/, '')}
                                </SyntaxHighlighter>
                              ) : (
                                <code className="whitespace-pre-wrap break-words rounded bg-slate-800 px-2 py-1 text-sm">{children}</code>
                              )
                            },
                          }}
                        >
                          {message.text}
                        </ReactMarkdown>
                        <button type="button" onClick={() => void copyMessage(message.text)} className="mt-3 text-[10px] uppercase tracking-[0.16em] text-slate-600 transition-colors hover:text-cyan-300" aria-label={`Copy ${message.sender} message`}>
                          copy signal
                        </button>
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start"><div className="rounded-2xl bg-white/5 px-6 py-4 ring-1 ring-white/10"><div className="flex gap-2"><div className="h-2 w-2 animate-bounce rounded-full bg-indigo-500" /><div className="h-2 w-2 animate-bounce rounded-full bg-indigo-500" style={{ animationDelay: '0.1s' }} /><div className="h-2 w-2 animate-bounce rounded-full bg-indigo-500" style={{ animationDelay: '0.2s' }} /></div></div></div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </div>

              <div className="border-t border-white/5 bg-gradient-to-t from-slate-950 to-slate-900/50 p-4 backdrop-blur-sm sm:p-6">
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={inputMessage}
                    disabled={isLoading}
                    onChange={event => setInputMessage(event.target.value)}
                    onKeyDown={event => {
                      if (event.key === 'Enter' && !event.nativeEvent.isComposing && !isLoading) {
                        event.preventDefault()
                        void sendMessage()
                      }
                    }}
                    placeholder="Ask me anything..."
                    className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 text-white placeholder-slate-500 transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  <button type="button" onClick={() => void sendMessage()} disabled={isLoading} className="rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 px-4 py-3.5 font-semibold text-white shadow-lg shadow-indigo-600/30 transition-all hover:from-indigo-500 hover:to-indigo-400 disabled:cursor-not-allowed disabled:opacity-50 sm:px-6">Send</button>
                </div>
              </div>
            </>
          )}

          {activeTab === 'tasks' && (
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              <div className="mx-auto max-w-4xl">
                <h2 className="mb-2 text-2xl font-bold text-white">Your Tasks</h2>
                <p className="mb-6 text-sm text-slate-400">Tasks and reminders are a local checklist only; no notifications are sent.</p>
                <div className="mb-5 flex flex-wrap items-center gap-2" role="group" aria-label="Task filter">
                  {(['all', 'open', 'done'] as const).map(filter => (
                    <button key={filter} type="button" onClick={() => setTaskFilter(filter)} className={`rounded-lg px-3 py-2 text-[10px] uppercase tracking-[0.16em] ring-1 transition-colors ${taskFilter === filter ? 'bg-cyan-300/10 text-cyan-100 ring-cyan-300/30' : 'text-slate-500 ring-white/10 hover:text-slate-200'}`}>
                      {filter === 'all' ? `all ${tasks.length}` : filter === 'open' ? `open ${openTaskCount}` : `done ${tasks.length - openTaskCount}`}
                    </button>
                  ))}
                </div>

                <form onSubmit={submitTask} className="mb-6 grid gap-3 rounded-2xl bg-white/5 p-4 ring-1 ring-white/10 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label htmlFor="task-text" className="mb-1.5 block text-sm font-medium text-slate-300">Task</label>
                    <input id="task-text" value={taskText} onChange={event => setTaskText(event.target.value)} required placeholder="Add a task" className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white placeholder-slate-600 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label htmlFor="task-category" className="mb-1.5 block text-sm font-medium text-slate-300">Category</label>
                    <select id="task-category" value={taskCategory} onChange={event => setTaskCategory(event.target.value as Task['category'])} className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500">
                      <option value="personal">Personal</option><option value="work">Work</option><option value="homework">Homework</option><option value="devops">DevOps</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="task-priority" className="mb-1.5 block text-sm font-medium text-slate-300">Priority</label>
                    <select id="task-priority" value={taskPriority} onChange={event => setTaskPriority(event.target.value as Task['priority'])} className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500">
                      <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="task-due-date" className="mb-1.5 block text-sm font-medium text-slate-300">Due date <span className="text-slate-500">(optional)</span></label>
                    <input id="task-due-date" type="date" value={taskDueDate} onChange={event => setTaskDueDate(event.target.value)} className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div className="flex items-end sm:col-span-2"><button type="submit" className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 px-4 py-3 font-semibold text-white shadow-lg shadow-indigo-600/30 transition-all hover:from-indigo-500 hover:to-indigo-400 sm:w-auto">Add task</button></div>
                </form>

                {filteredTasks.length === 0 ? (
                  <div className="py-10 text-center"><p className="text-lg text-slate-400">{taskFilter === 'all' ? 'No tasks yet. Add one above or ask in chat after configuring a key.' : taskFilter === 'open' ? 'All tasks are complete.' : 'No completed tasks yet.'}</p></div>
                ) : (
                  <div className="space-y-3">
                    {filteredTasks.map(task => (
                      <div key={task.id} className="flex items-start gap-3 rounded-xl bg-white/5 p-4 ring-1 ring-white/10 transition-all hover:bg-white/10 sm:gap-4">
                        <button type="button" onClick={() => toggleTask(task.id)} aria-label={`${task.completed ? 'Mark incomplete' : 'Mark complete'}: ${task.text}`} className={`mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border-2 transition-all ${task.completed ? 'border-emerald-500 bg-emerald-600' : 'border-slate-400 hover:border-slate-300'}`}>{task.completed && <span className="text-sm text-white">✓</span>}</button>
                        <div className="min-w-0 flex-1">
                          <p className={`break-words font-medium [overflow-wrap:anywhere] ${task.completed ? 'text-slate-500 line-through' : 'text-white'}`}>{task.text}</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <span className={`rounded-lg px-2 py-1 text-xs ring-1 ${getPriorityColor(task.priority)}`}>{task.priority}</span>
                            <span className="rounded-lg bg-slate-700/50 px-2 py-1 text-xs text-slate-300 ring-1 ring-slate-600/50">{task.category}</span>
                            {task.dueDate && <span className="rounded-lg bg-indigo-500/15 px-2 py-1 text-xs text-indigo-200 ring-1 ring-indigo-500/30">Due {task.dueDate}</span>}
                          </div>
                        </div>
                        <button type="button" onClick={() => deleteTask(task.id)} aria-label={`Delete task: ${task.text}`} className="shrink-0 rounded p-1 text-slate-400 transition-colors hover:text-red-400">✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'about' && (
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              <div className="mx-auto max-w-4xl space-y-6">
                <div>
                  <h2 className="mb-4 text-3xl font-bold text-white">About Openclow</h2>
                  <p className="text-lg leading-relaxed text-slate-300">Openclow is a modern AI chat application built with Next.js, React, and Tailwind CSS for working with your chosen provider.</p>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="rounded-xl bg-white/5 p-4 ring-1 ring-white/10"><h3 className="mb-2 font-semibold text-indigo-400">🤗 HuggingFace</h3><p className="text-sm text-slate-400">Use your own HuggingFace provider key.</p></div>
                  <div className="rounded-xl bg-white/5 p-4 ring-1 ring-white/10"><h3 className="mb-2 font-semibold text-indigo-400">✨ Gemini</h3><p className="text-sm text-slate-400">Use your own Google Gemini API key.</p></div>
                  <div className="rounded-xl bg-white/5 p-4 ring-1 ring-white/10"><h3 className="mb-2 font-semibold text-indigo-400">🚀 OpenAI</h3><p className="text-sm text-slate-400">Use your own OpenAI API key.</p></div>
                  <div className="rounded-xl bg-white/5 p-4 ring-1 ring-white/10"><h3 className="mb-2 font-semibold text-indigo-400">✓ Tasks</h3><p className="text-sm text-slate-400">A local checklist with priorities and optional due dates.</p></div>
                </div>

                <div className="rounded-xl bg-gradient-to-r from-indigo-600/20 to-purple-600/20 p-6 ring-1 ring-indigo-500/30">
                  <h3 className="mb-2 font-semibold text-white">Data and privacy</h3>
                  <ul className="space-y-2 text-sm text-slate-300">
                    <li>✓ Provider keys remain only in the current page memory and are never saved to browser storage.</li>
                    <li>✓ Chats, settings choice, and local checklist data are stored locally in your browser when storage is available.</li>
                    <li>✓ Tasks are reminders only; Openclow does not send notifications.</li>
                    <li>✓ Markdown support with syntax highlighting helps keep conversations readable.</li>
                  </ul>
                </div>

                <div className="pt-4 text-center"><p className="text-sm text-slate-400">Built with Next.js, React, and Tailwind CSS</p></div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
