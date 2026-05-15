'use client'

import { useState, useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'

interface Message {
  id: string
  text: string
  sender: 'user' | 'ai'
  timestamp: Date
}

interface Task {
  id: string
  text: string
  completed: boolean
  priority: 'low' | 'medium' | 'high'
  category: 'homework' | 'work' | 'devops' | 'personal'
  dueDate?: string
}

interface Settings {
  huggingfaceKey: string
  geminiKey: string
  openaiKey: string
  aiMode: 'huggingface' | 'gemini' | 'openai'
}

export default function OpenclowApp() {
  const [messages, setMessages] = useState<Message[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'chat' | 'tasks' | 'about'>('chat')
  const [aiOnline, setAiOnline] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [settings, setSettings] = useState<Settings>({
    huggingfaceKey: '',
    geminiKey: '',
    openaiKey: '',
    aiMode: 'huggingface'
  })
  const [settingsDraft, setSettingsDraft] = useState<Settings>(settings)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Load everything from localStorage on mount
  useEffect(() => {
    const savedMessages = localStorage.getItem('openclow-messages')
    if (savedMessages) {
      // Restore date objects
      const parsed = JSON.parse(savedMessages).map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) }))
      setMessages(parsed)
    } else {
      setMessages([{
        id: '1',
        text: "👋 **Welcome to Openclow ULTRA!**\n\nYour premium AI assistant powered by cutting-edge models. Free, fast, and beautifully designed.\n\n### Quick Start\n1. Click the **⚙️ Settings** button (top right)\n2. Enter your API key (e.g. from [HuggingFace](https://huggingface.co/settings/tokens))\n3. Start chatting!\n\nI can write code, analyze data, or just have a chat.",
        sender: 'ai',
        timestamp: new Date()
      }])
    }

    const savedTasks = localStorage.getItem('openclow-tasks')
    if (savedTasks) setTasks(JSON.parse(savedTasks))

    // Load saved settings
    const savedSettings = localStorage.getItem('openclow-settings')
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings)
      setSettings(parsed)
      setSettingsDraft(parsed)
    }
  }, [])

  // Recheck AI status whenever settings change
  useEffect(() => {
    checkAI(settings)
  }, [settings])

  useEffect(() => {
    if (messages.length > 0) localStorage.setItem('openclow-messages', JSON.stringify(messages))
  }, [messages])

  useEffect(() => {
    localStorage.setItem('openclow-tasks', JSON.stringify(tasks))
  }, [tasks])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const checkAI = async (s: Settings) => {
    let hasLocalKey = false;
    if (s.aiMode === 'huggingface' && s.huggingfaceKey.trim()) hasLocalKey = true;
    if (s.aiMode === 'gemini' && s.geminiKey.trim()) hasLocalKey = true;
    if (s.aiMode === 'openai' && s.openaiKey.trim()) hasLocalKey = true;

    if (hasLocalKey) {
      setAiOnline(true);
      return;
    }

    try {
      const res = await fetch(`/api/${s.aiMode}`);
      if (res.ok) {
        const data = await res.json();
        setAiOnline(data.available);
      } else {
        setAiOnline(false);
      }
    } catch {
      setAiOnline(false);
    }
  }

  const saveSettings = () => {
    setSettings(settingsDraft)
    localStorage.setItem('openclow-settings', JSON.stringify(settingsDraft))
    setShowSettings(false)
  }

  const sendMessage = async () => {
    if (!inputMessage.trim()) return

    if (!aiOnline) {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        text: '⚠️ **Authentication Required**\n\nPlease open **Settings** (top right) and enter your API key to continue.',
        sender: 'ai',
        timestamp: new Date()
      }])
      return
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputMessage,
      sender: 'user',
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    const userInput = inputMessage
    setInputMessage('')
    setIsLoading(true)

    try {
      let aiText = ''

      if (settings.aiMode === 'huggingface') {
        const res = await fetch('/api/huggingface', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: `<|system|>You are Openclow, a state-of-the-art AI assistant. You are helpful, brilliant, and professional. Format your responses with beautiful Markdown.</s><|user|>${userInput}</s><|assistant|>`,
            apiKey: settings.huggingfaceKey
          })
        })
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || 'HuggingFace unavailable')
        }
        const data = await res.json()
        aiText = data.response

      } else if (settings.aiMode === 'gemini') {
        const res = await fetch('/api/gemini', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: `You are Openclow, a state-of-the-art AI assistant. Format your responses with beautiful Markdown.\n\nUser: ${userInput}`,
            apiKey: settings.geminiKey
          })
        })
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || 'Gemini unavailable')
        }
        const data = await res.json()
        aiText = data.response

      } else {
        const res = await fetch('/api/openai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: `You are Openclow, a state-of-the-art AI assistant. Format your responses with beautiful Markdown.\n\nUser: ${userInput}\n\nAssistant:`,
            apiKey: settings.openaiKey
          })
        })
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || 'OpenAI unavailable')
        }
        const data = await res.json()
        aiText = data.response
      }

      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        text: aiText,
        sender: 'ai',
        timestamp: new Date()
      }])

      // Auto-detect task creation
      if (userInput.toLowerCase().includes('remind me') || userInput.toLowerCase().includes('add task')) {
        const task = userInput.replace(/remind me to|add task|remind me/gi, '').trim()
        if (task) addTask(task, 'personal', 'medium')
      }

    } catch (error: any) {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        text: `**Error Details:**\n\`\`\`\n${error.message}\n\`\`\`\n\nPlease check your API key in **Settings**. If the issue persists, the selected model might be temporarily unavailable.`,
        sender: 'ai',
        timestamp: new Date()
      }])
      setAiOnline(false)
    } finally {
      setIsLoading(false)
    }
  }

  const addTask = (text: string, category: Task['category'], priority: Task['priority'], dueDate?: string) => {
    if (!text.trim()) return
    setTasks(prev => [...prev, {
      id: Date.now().toString(),
      text: text.trim(),
      completed: false,
      category,
      priority,
      dueDate
    }])
  }

  const toggleTask = (id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t))
  }

  const deleteTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id))
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-rose-500/20 text-rose-400 border-rose-500/30'
      case 'medium': return 'bg-amber-500/20 text-amber-400 border-amber-500/30'
      case 'low': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
      default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30'
    }
  }

  const aiLabel = settings.aiMode === 'huggingface' ? 'HuggingFace' : settings.aiMode === 'gemini' ? 'Gemini' : 'OpenAI'

  return (
    <div className="relative flex h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-200 overflow-hidden font-sans selection:bg-indigo-500/30">
      {/* Ambient Background Gradients */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-indigo-600/15 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[150px] pointer-events-none"></div>
      <div className="absolute top-1/2 right-0 w-[400px] h-[400px] bg-blue-600/10 rounded-full blur-[100px] pointer-events-none"></div>

      {/* ─── Settings Modal ─── */}
      {showSettings && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-lg" onClick={() => setShowSettings(false)}></div>
          <div className="relative w-full max-w-lg bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 rounded-3xl p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold text-white tracking-tight">Configuration</h2>
              <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-white transition-colors">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="space-y-6">
              {/* AI Mode selector */}
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-3">Select Provider</label>
                <div className="grid grid-cols-3 gap-3">
                  {(['huggingface', 'gemini', 'openai'] as const).map(mode => (
                    <button
                      key={mode}
                      onClick={() => setSettingsDraft(d => ({ ...d, aiMode: mode }))}
                      className={`py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-200 ${
                        settingsDraft.aiMode === mode
                          ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-600/30 ring-1 ring-indigo-400'
                          : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200 ring-1 ring-white/10'
                      }`}
                    >
                      {mode === 'huggingface' ? '🤗 HuggingFace' : mode === 'gemini' ? '✨ Gemini' : '🚀 OpenAI'}
                    </button>
                  ))}
                </div>
              </div>

              {/* API Key Inputs */}
              <div className="bg-white/5 rounded-2xl p-5 ring-1 ring-white/10">
                {settingsDraft.aiMode === 'huggingface' && (
                  <div className="animate-in fade-in slide-in-from-bottom-2">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-semibold text-slate-300">HuggingFace Token</label>
                      <a href="https://huggingface.co/settings/tokens" target="_blank" rel="noreferrer" className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">Get token ↗</a>
                    </div>
                    <input
                      type="password"
                      value={settingsDraft.huggingfaceKey}
                      onChange={e => setSettingsDraft(d => ({ ...d, huggingfaceKey: e.target.value }))}
                      placeholder="hf_..."
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    />
                  </div>
                )}

                {settingsDraft.aiMode === 'gemini' && (
                  <div className="animate-in fade-in slide-in-from-bottom-2">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-semibold text-slate-300">Gemini API Key</label>
                      <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">Get key ↗</a>
                    </div>
                    <input
                      type="password"
                      value={settingsDraft.geminiKey}
                      onChange={e => setSettingsDraft(d => ({ ...d, geminiKey: e.target.value }))}
                      placeholder="AIza..."
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    />
                  </div>
                )}

                {settingsDraft.aiMode === 'openai' && (
                  <div className="animate-in fade-in slide-in-from-bottom-2">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-semibold text-slate-300">OpenAI API Key</label>
                      <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer" className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">Get key ↗</a>
                    </div>
                    <input
                      type="password"
                      value={settingsDraft.openaiKey}
                      onChange={e => setSettingsDraft(d => ({ ...d, openaiKey: e.target.value }))}
                      placeholder="sk-..."
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setShowSettings(false)}
                className="flex-1 py-3.5 px-4 bg-transparent hover:bg-white/5 rounded-xl text-slate-300 font-semibold transition-colors ring-1 ring-white/10"
              >
                Cancel
              </button>
              <button
                onClick={saveSettings}
                className="flex-1 py-3.5 px-4 bg-gradient-to-r from-indigo-600 to-indigo-500 text-white hover:from-indigo-500 hover:to-indigo-400 rounded-xl font-semibold transition-all shadow-lg shadow-indigo-600/30"
              >
                Save & Start
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Main Container ─── */}
      <div className="flex w-full h-full">
        {/* ─── Sidebar ─── */}
        <div className="w-64 bg-gradient-to-b from-slate-900/50 to-slate-950/50 border-r border-white/5 flex flex-col backdrop-blur-sm">
          {/* Logo */}
          <div className="p-6 border-b border-white/5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center">
                <span className="text-white font-bold text-lg">C</span>
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">Openclow</h1>
                <p className="text-xs text-slate-400">AI Assistant</p>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex-1 p-4 space-y-2">
            {(['chat', 'tasks', 'about'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
                  activeTab === tab
                    ? 'bg-indigo-600/30 text-indigo-200 ring-1 ring-indigo-500/50'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                {tab === 'chat' && '💬 Chat'}
                {tab === 'tasks' && '✓ Tasks'}
                {tab === 'about' && 'ℹ️ About'}
              </button>
            ))}
          </div>

          {/* Status Indicator */}
          <div className="p-4 border-t border-white/5 space-y-3">
            <div className="flex items-center gap-2 px-4 py-3 bg-white/5 rounded-lg ring-1 ring-white/10">
              <div className={`w-2 h-2 rounded-full ${aiOnline ? 'bg-emerald-500' : 'bg-slate-500'}`}></div>
              <span className="text-xs font-medium text-slate-300">{aiLabel} {aiOnline ? 'Online' : 'Offline'}</span>
            </div>
            <button
              onClick={() => setShowSettings(true)}
              className="w-full px-4 py-3 bg-gradient-to-r from-indigo-600/20 to-purple-600/20 hover:from-indigo-600/30 hover:to-purple-600/30 text-slate-200 font-medium rounded-lg transition-all ring-1 ring-indigo-500/30"
            >
              ⚙️ Settings
            </button>
          </div>
        </div>

        {/* ─── Main Content ─── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* ─── Chat Tab ─── */}
          {activeTab === 'chat' && (
            <>
              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.map(msg => (
                  <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-2xl ${msg.sender === 'user' ? 'bg-indigo-600/30 text-white' : 'bg-white/5'} rounded-2xl px-6 py-4 ring-1 ${msg.sender === 'user' ? 'ring-indigo-500/50' : 'ring-white/10'}`}>
                      <ReactMarkdown
                        components={{
                          code: ({ node, inline, className, children, ...props }: any) => {
                            const match = /language-(\w+)/.exec(className || '')
                            return !inline && match ? (
                              <SyntaxHighlighter style={vscDarkPlus} language={match[1]} PreTag="div" {...props}>
                                {String(children).replace(/\n$/, '')}
                              </SyntaxHighlighter>
                            ) : (
                              <code className="bg-slate-800 px-2 py-1 rounded text-sm" {...props}>
                                {children}
                              </code>
                            )
                          }
                        }}
                      >
                        {msg.text}
                      </ReactMarkdown>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-white/5 rounded-2xl px-6 py-4 ring-1 ring-white/10">
                      <div className="flex gap-2">
                        <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="border-t border-white/5 bg-gradient-to-t from-slate-950 to-slate-900/50 p-6 backdrop-blur-sm">
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={e => setInputMessage(e.target.value)}
                    onKeyPress={e => e.key === 'Enter' && sendMessage()}
                    placeholder="Ask me anything..."
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={isLoading}
                    className="px-6 py-3.5 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 disabled:opacity-50 text-white font-semibold rounded-xl transition-all shadow-lg shadow-indigo-600/30"
                  >
                    Send
                  </button>
                </div>
              </div>
            </>
          )}

          {/* ─── Tasks Tab ─── */}
          {activeTab === 'tasks' && (
            <div className="flex-1 overflow-y-auto p-6">
              <div className="max-w-4xl">
                <h2 className="text-2xl font-bold text-white mb-6">Your Tasks</h2>
                {tasks.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-slate-400 text-lg">No tasks yet. Ask me to add one!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {tasks.map(task => (
                      <div key={task.id} className="flex items-start gap-4 p-4 bg-white/5 rounded-xl ring-1 ring-white/10 hover:bg-white/10 transition-all">
                        <button
                          onClick={() => toggleTask(task.id)}
                          className={`mt-1 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                            task.completed
                              ? 'bg-emerald-600 border-emerald-500'
                              : 'border-slate-400 hover:border-slate-300'
                          }`}
                        >
                          {task.completed && <span className="text-white text-sm">✓</span>}
                        </button>
                        <div className="flex-1">
                          <p className={`font-medium ${task.completed ? 'line-through text-slate-500' : 'text-white'}`}>
                            {task.text}
                          </p>
                          <div className="flex gap-2 mt-2">
                            <span className={`text-xs px-2 py-1 rounded-lg ring-1 ${getPriorityColor(task.priority)}`}>
                              {task.priority}
                            </span>
                            <span className="text-xs px-2 py-1 rounded-lg bg-slate-700/50 text-slate-300 ring-1 ring-slate-600/50">
                              {task.category}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => deleteTask(task.id)}
                          className="text-slate-400 hover:text-red-400 transition-colors"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ─── About Tab ─── */}
          {activeTab === 'about' && (
            <div className="flex-1 overflow-y-auto p-6">
              <div className="max-w-4xl space-y-6">
                <div>
                  <h2 className="text-3xl font-bold text-white mb-4">About Openclow ULTRA</h2>
                  <p className="text-slate-300 text-lg leading-relaxed">
                    Openclow ULTRA is a beautiful, modern AI chat application powered by cutting-edge language models. Built with Next.js, React, and Tailwind CSS, it provides a seamless experience for interacting with AI assistants.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/5 rounded-xl p-4 ring-1 ring-white/10">
                    <h3 className="font-semibold text-indigo-400 mb-2">🤗 HuggingFace</h3>
                    <p className="text-sm text-slate-400">Free-tier AI with no credit card required</p>
                  </div>
                  <div className="bg-white/5 rounded-xl p-4 ring-1 ring-white/10">
                    <h3 className="font-semibold text-indigo-400 mb-2">✨ Gemini</h3>
                    <p className="text-sm text-slate-400">Google's advanced AI model</p>
                  </div>
                  <div className="bg-white/5 rounded-xl p-4 ring-1 ring-white/10">
                    <h3 className="font-semibold text-indigo-400 mb-2">🚀 OpenAI</h3>
                    <p className="text-sm text-slate-400">Premium AI capabilities</p>
                  </div>
                  <div className="bg-white/5 rounded-xl p-4 ring-1 ring-white/10">
                    <h3 className="font-semibold text-indigo-400 mb-2">✓ Tasks</h3>
                    <p className="text-sm text-slate-400">Built-in task management</p>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-indigo-600/20 to-purple-600/20 rounded-xl p-6 ring-1 ring-indigo-500/30">
                  <h3 className="font-semibold text-white mb-2">Features</h3>
                  <ul className="space-y-2 text-sm text-slate-300">
                    <li>✓ Multiple AI provider support</li>
                    <li>✓ Beautiful glassmorphism design</li>
                    <li>✓ Real-time status indicator</li>
                    <li>✓ Local storage persistence</li>
                    <li>✓ Markdown support with syntax highlighting</li>
                    <li>✓ Task management with priorities</li>
                  </ul>
                </div>

                <div className="text-center pt-4">
                  <p className="text-slate-400 text-sm">
                    Built with ❤️ using Next.js, React, and Tailwind CSS
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
