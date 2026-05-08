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
    <div className="relative flex h-screen bg-[#0a0a0a] text-slate-200 overflow-hidden font-sans selection:bg-indigo-500/30">
      {/* Ambient Background Gradients */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[150px] pointer-events-none"></div>

      {/* ─── Settings Modal ─── */}
      {showSettings && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setShowSettings(false)}></div>
          <div className="relative w-full max-w-lg bg-[#111111] border border-white/10 rounded-3xl p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-semibold text-white tracking-tight">Configuration</h2>
              <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-white transition-colors">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="space-y-6">
              {/* AI Mode selector */}
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-3">Select Provider</label>
                <div className="grid grid-cols-3 gap-3">
                  {(['huggingface', 'gemini', 'openai'] as const).map(mode => (
                    <button
                      key={mode}
                      onClick={() => setSettingsDraft(d => ({ ...d, aiMode: mode }))}
                      className={`py-3 px-4 rounded-xl text-sm font-medium transition-all duration-200 ${
                        settingsDraft.aiMode === mode
                          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25 ring-1 ring-indigo-500'
                          : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200 ring-1 ring-white/10'
                      }`}
                    >
                      {mode === 'huggingface' ? 'HuggingFace' : mode === 'gemini' ? 'Gemini' : 'OpenAI'}
                    </button>
                  ))}
                </div>
              </div>

              {/* API Key Inputs */}
              <div className="bg-white/5 rounded-2xl p-5 ring-1 ring-white/10">
                {settingsDraft.aiMode === 'huggingface' && (
                  <div className="animate-in fade-in slide-in-from-bottom-2">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-slate-300">HuggingFace Token</label>
                      <a href="https://huggingface.co/settings/tokens" target="_blank" rel="noreferrer" className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">Get token ↗</a>
                    </div>
                    <input
                      type="password"
                      value={settingsDraft.huggingfaceKey}
                      onChange={e => setSettingsDraft(d => ({ ...d, huggingfaceKey: e.target.value }))}
                      placeholder="hf_..."
                      className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                  </div>
                )}

                {settingsDraft.aiMode === 'gemini' && (
                  <div className="animate-in fade-in slide-in-from-bottom-2">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-slate-300">Gemini API Key</label>
                      <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">Get key ↗</a>
                    </div>
                    <input
                      type="password"
                      value={settingsDraft.geminiKey}
                      onChange={e => setSettingsDraft(d => ({ ...d, geminiKey: e.target.value }))}
                      placeholder="AIza..."
                      className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                  </div>
                )}

                {settingsDraft.aiMode === 'openai' && (
                  <div className="animate-in fade-in slide-in-from-bottom-2">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-slate-300">OpenAI API Key</label>
                      <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer" className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">Get key ↗</a>
                    </div>
                    <input
                      type="password"
                      value={settingsDraft.openaiKey}
                      onChange={e => setSettingsDraft(d => ({ ...d, openaiKey: e.target.value }))}
                      placeholder="sk-..."
                      className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setShowSettings(false)}
                className="flex-1 py-3.5 px-4 bg-transparent hover:bg-white/5 rounded-xl text-slate-300 font-medium transition-colors ring-1 ring-white/10"
              >
                Cancel
              </button>
              <button
                onClick={saveSettings}
                className="flex-1 py-3.5 px-4 bg-white text-black hover:bg-slate-200 rounded-xl font-medium transition-colors shadow-lg shadow-white/10"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Sidebar ─── */}
      <div className="relative z-10 w-[280px] bg-[#111111]/80 backdrop-blur-2xl border-r border-white/5 flex flex-col">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white font-bold text-xl">
              O
            </div>
            <div>
              <h1 className="text-lg font-semibold text-white tracking-tight">Openclow</h1>
              <p className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">Ultra Edition</p>
            </div>
          </div>

          <div className="space-y-1">
            {(['chat', 'tasks', 'about'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  activeTab === tab
                    ? 'bg-white/10 text-white font-medium'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                <span className="text-[18px]">
                  {tab === 'chat' && '✨'}
                  {tab === 'tasks' && '📋'}
                  {tab === 'about' && 'ℹ️'}
                </span>
                <span className="capitalize text-sm">{tab}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-auto p-6 space-y-4">
          {/* Status Indicator */}
          <div className="flex items-center gap-3 px-4 py-3 bg-white/5 rounded-xl border border-white/5">
            <div className="relative flex h-2.5 w-2.5">
              {aiOnline && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${aiOnline ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-medium text-slate-300">{aiLabel}</span>
              <span className="text-[10px] text-slate-500">{aiOnline ? 'Connected' : 'Action Required'}</span>
            </div>
          </div>

          <button
            onClick={() => setShowSettings(true)}
            className="w-full flex items-center gap-3 px-4 py-3 bg-transparent hover:bg-white/5 border border-white/10 rounded-xl text-sm text-slate-300 font-medium transition-all group"
          >
            <span className="text-lg group-hover:rotate-45 transition-transform duration-300">⚙️</span>
            Settings
          </button>
        </div>
      </div>

      {/* ─── Main Content ─── */}
      <div className="relative z-10 flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-20 flex items-center justify-between px-8 border-b border-white/5 bg-[#0a0a0a]/50 backdrop-blur-md">
          <h2 className="text-xl font-semibold text-white tracking-tight flex items-center gap-2">
            {activeTab === 'chat' && 'AI Assistant'}
            {activeTab === 'tasks' && 'Tasks'}
            {activeTab === 'about' && 'About Openclow'}
          </h2>
          <div className="flex items-center gap-4">
             <button
              onClick={() => setShowSettings(true)}
              className="text-sm font-medium px-4 py-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors border border-white/5"
            >
              Model: <span className="text-indigo-400">{settings.aiMode}</span>
            </button>
          </div>
        </header>

        {/* Chat Interface */}
        {activeTab === 'chat' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth">
              <div className="max-w-4xl mx-auto space-y-8 pb-4">
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex w-full animate-in slide-in-from-bottom-2 fade-in duration-300 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`flex gap-4 max-w-[85%] ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                      {/* Avatar */}
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm shadow-sm ${
                        msg.sender === 'user' 
                          ? 'bg-indigo-600 text-white' 
                          : 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white'
                      }`}>
                        {msg.sender === 'user' ? 'U' : 'O'}
                      </div>
                      
                      {/* Message Bubble */}
                      <div className={`group relative px-6 py-4 rounded-3xl ${
                        msg.sender === 'user'
                          ? 'bg-indigo-600 text-white rounded-tr-sm shadow-md'
                          : 'bg-[#1a1a1a] border border-white/5 text-slate-200 rounded-tl-sm shadow-sm'
                      }`}>
                        {msg.sender === 'user' ? (
                          <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                        ) : (
                          <div className="prose prose-invert prose-p:leading-relaxed prose-pre:bg-black/50 prose-pre:border prose-pre:border-white/10 prose-pre:rounded-xl max-w-none">
                            <ReactMarkdown
                              components={{
                                code({node, inline, className, children, ...props}: any) {
                                  const match = /language-(\w+)/.exec(className || '')
                                  return !inline && match ? (
                                    <SyntaxHighlighter
                                      {...props}
                                      style={vscDarkPlus}
                                      language={match[1]}
                                      PreTag="div"
                                      className="rounded-lg text-sm !mt-4 !mb-4 !bg-[#050505]"
                                    >
                                      {String(children).replace(/\n$/, '')}
                                    </SyntaxHighlighter>
                                  ) : (
                                    <code {...props} className={`${className} bg-white/10 px-1.5 py-0.5 rounded-md font-mono text-sm text-indigo-300`}>
                                      {children}
                                    </code>
                                  )
                                }
                              }}
                            >
                              {msg.text}
                            </ReactMarkdown>
                          </div>
                        )}
                        <span className={`absolute -bottom-5 text-[10px] font-medium text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity ${msg.sender === 'user' ? 'right-2' : 'left-2'}`}>
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
                
                {isLoading && (
                  <div className="flex justify-start w-full animate-in fade-in">
                    <div className="flex gap-4 max-w-[85%]">
                       <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm shadow-sm">
                        O
                      </div>
                      <div className="bg-[#1a1a1a] border border-white/5 rounded-3xl rounded-tl-sm px-6 py-5 flex items-center gap-2">
                        <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                        <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                        <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce"></div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} className="h-4" />
              </div>
            </div>

            {/* Input Area */}
            <div className="p-4 md:p-8 pt-0">
              <div className="max-w-4xl mx-auto relative">
                {!aiOnline && (
                  <div className="absolute -top-14 left-0 right-0 mx-auto w-fit bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs px-4 py-2 rounded-full backdrop-blur-md flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                    </span>
                    API Key Missing. Check Settings.
                  </div>
                )}
                <div className="relative flex items-end gap-2 bg-[#1a1a1a] border border-white/10 rounded-3xl p-2 shadow-xl focus-within:ring-1 focus-within:ring-indigo-500/50 focus-within:border-indigo-500/50 transition-all">
                  <textarea
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    placeholder="Message Openclow..."
                    className="flex-1 max-h-32 min-h-[44px] bg-transparent resize-none px-4 py-3 text-white placeholder-slate-500 focus:outline-none text-sm leading-relaxed"
                    rows={1}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={isLoading || !inputMessage.trim()}
                    className="h-11 w-11 flex-shrink-0 flex items-center justify-center rounded-2xl bg-white text-black hover:bg-slate-200 disabled:bg-white/5 disabled:text-slate-600 transition-colors"
                  >
                    <svg className="w-5 h-5 translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5m0 0l-7 7m7-7l7 7" />
                    </svg>
                  </button>
                </div>
                <div className="text-center mt-3 text-[11px] text-slate-500 font-medium">
                  Openclow can make mistakes. Consider verifying important information.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tasks Interface */}
        {activeTab === 'tasks' && (
          <div className="flex-1 overflow-y-auto p-8">
            <div className="max-w-3xl mx-auto">
              <div className="bg-[#1a1a1a] border border-white/5 rounded-3xl p-2 mb-8 flex items-center shadow-lg focus-within:ring-1 focus-within:ring-indigo-500/50 transition-all">
                <div className="pl-4 pr-2 text-slate-400">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                </div>
                <input
                  type="text"
                  placeholder="Add a new task... (Press Enter)"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                      addTask(e.currentTarget.value, 'personal', 'medium')
                      e.currentTarget.value = ''
                    }
                  }}
                  className="flex-1 bg-transparent px-2 py-3 text-white placeholder-slate-500 focus:outline-none text-sm"
                />
              </div>

              {/* Task List */}
              {tasks.length === 0 ? (
                <div className="text-center py-32 animate-in fade-in slide-in-from-bottom-4">
                  <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl border border-white/5">📋</div>
                  <h3 className="text-lg font-medium text-white mb-2">No active tasks</h3>
                  <p className="text-sm text-slate-400">Your workspace is clear. Add a task above to get started.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {tasks.map(task => (
                    <div key={task.id} className="group flex items-center gap-4 bg-[#1a1a1a] border border-white/5 rounded-2xl p-4 hover:border-white/10 transition-colors animate-in fade-in slide-in-from-bottom-2">
                      <button 
                        onClick={() => toggleTask(task.id)}
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                          task.completed ? 'bg-emerald-500 border-emerald-500' : 'border-slate-600 hover:border-slate-400'
                        }`}
                      >
                        {task.completed && <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                      </button>
                      
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate transition-colors ${task.completed ? 'text-slate-500 line-through' : 'text-slate-200'}`}>
                          {task.text}
                        </p>
                      </div>
                      
                      <span className={`px-2.5 py-1 rounded-md text-[10px] font-semibold tracking-wider uppercase border ${getPriorityColor(task.priority)}`}>
                        {task.priority}
                      </span>
                      
                      <button 
                        onClick={() => deleteTask(task.id)} 
                        className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-rose-400 transition-colors p-1"
                        title="Delete task"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* About Interface */}
        {activeTab === 'about' && (
          <div className="flex-1 overflow-y-auto p-8">
            <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4">
              <div className="bg-[#1a1a1a] border border-white/5 rounded-3xl p-10 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px]"></div>
                
                <h3 className="text-3xl font-bold text-white mb-4 tracking-tight relative z-10">Openclow Ultra</h3>
                <p className="text-slate-400 text-base leading-relaxed mb-8 relative z-10">
                  A high-performance, aesthetically refined AI interface designed for seamless interaction. It securely stores your keys locally and connects directly to premier inference APIs.
                </p>
                
                <div className="grid gap-4 relative z-10">
                  <a href="https://huggingface.co/settings/tokens" target="_blank" rel="noreferrer" className="flex items-center justify-between p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 transition-colors group">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">🤗</span>
                      <span className="font-medium text-slate-200">HuggingFace Inference</span>
                    </div>
                    <span className="text-xs text-indigo-400 group-hover:translate-x-1 transition-transform">Get Token →</span>
                  </a>
                  
                  <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="flex items-center justify-between p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 transition-colors group">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">✨</span>
                      <span className="font-medium text-slate-200">Google Gemini</span>
                    </div>
                    <span className="text-xs text-indigo-400 group-hover:translate-x-1 transition-transform">Get Token →</span>
                  </a>
                  
                  <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer" className="flex items-center justify-between p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 transition-colors group">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">🤖</span>
                      <span className="font-medium text-slate-200">OpenAI Platform</span>
                    </div>
                    <span className="text-xs text-indigo-400 group-hover:translate-x-1 transition-transform">Get Token →</span>
                  </a>
                </div>
              </div>

              <div className="bg-slate-800/30 backdrop-blur-xl border border-slate-700/50 rounded-xl p-6">
                <h4 className="text-lg font-semibold text-white mb-4">🛠️ Technology Stack</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {[
                    { label: 'Frontend', value: 'Next.js 16 + React' },
                    { label: 'Styling', value: 'Tailwind CSS' },
                    { label: 'AI Model', value: 'Qwen 2.5-7B (HuggingFace)' },
                    { label: 'Fallback', value: 'Gemini Flash' },
                    { label: 'Language', value: 'TypeScript' },
                    { label: 'Hosting', value: 'Render / Cloudflare' },
                  ].map(item => (
                    <div key={item.label} className="bg-slate-800/50 px-4 py-3 rounded-lg">
                      <div className="text-blue-400 font-medium">{item.label}</div>
                      <div className="text-slate-300">{item.value}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-slate-800/30 backdrop-blur-xl border border-slate-700/50 rounded-xl p-6">
                <h4 className="text-lg font-semibold text-white mb-4">✨ Key Features</h4>
                <ul className="space-y-2 text-slate-300">
                  {[
                    'HuggingFace cloud AI — free, no credit card',
                    'Gemini fallback for reliability',
                    'Real-time chat with context awareness',
                    'Task management with due dates & priorities',
                    'Category system: Work, DevOps, Homework, Personal',
                    'Persistent storage using localStorage',
                    'Modern glassmorphism UI design',
                  ].map(f => (
                    <li key={f} className="flex items-start gap-2">
                      <span className="text-green-400 mt-0.5">✓</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-slate-800/30 backdrop-blur-xl border border-slate-700/50 rounded-xl p-6">
                <h4 className="text-lg font-semibold text-white mb-4">📊 Session Stats</h4>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-3xl font-bold text-blue-400">{messages.length}</div>
                    <div className="text-xs text-slate-400 mt-1">Messages</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-purple-400">{tasks.length}</div>
                    <div className="text-xs text-slate-400 mt-1">Tasks</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-green-400">{tasks.filter(t => t.completed).length}</div>
                    <div className="text-xs text-slate-400 mt-1">Completed</div>
                  </div>
                </div>
              </div>

              <div className="bg-slate-800/30 backdrop-blur-xl border border-slate-700/50 rounded-xl p-6 text-center">
                <p className="text-slate-400 text-sm">Built with ❤️ by</p>
                <p className="text-white font-bold text-lg mt-1">Rintu Chowdory</p>
                <a href="https://github.com/rintuchowdory" className="text-blue-400 text-sm hover:underline">
                  @rintuchowdory
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}