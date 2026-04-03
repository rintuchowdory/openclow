'use client'

import { useState, useEffect, useRef } from 'react'

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

export default function OpenclowApp() {
  const [messages, setMessages] = useState<Message[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'chat' | 'tasks' | 'about'>('chat')
  const [aiOnline, setAiOnline] = useState(false)
  const [aiMode, setAiMode] = useState<'huggingface' | 'gemini'>('huggingface')
  const [newTask, setNewTask] = useState('')
  const [newTaskPriority, setNewTaskPriority] = useState<Task['priority']>('medium')
  const [newTaskCategory, setNewTaskCategory] = useState<Task['category']>('personal')
  const [newTaskDue, setNewTaskDue] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const saved = localStorage.getItem('openclow-messages')
    if (saved) setMessages(JSON.parse(saved))
    else {
      setMessages([{
        id: '1',
        text: "👋 Welcome to openclow — Your Professional AI Assistant\n\nI'm powered by HuggingFace cloud AI — completely free!\n\n✨ I can help you with:\n• Software Development & Coding\n• DevOps & Cloud Architecture\n• Homework & Research\n• Task & Project Management\n\nHow may I assist you today?",
        sender: 'ai',
        timestamp: new Date()
      }])
    }

    const savedTasks = localStorage.getItem('openclow-tasks')
    if (savedTasks) setTasks(JSON.parse(savedTasks))

    checkAI()
    const interval = setInterval(checkAI, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (messages.length > 0) localStorage.setItem('openclow-messages', JSON.stringify(messages))
  }, [messages])

  useEffect(() => {
    localStorage.setItem('openclow-tasks', JSON.stringify(tasks))
  }, [tasks])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const checkAI = async () => {
    const hfKey = process.env.NEXT_PUBLIC_HUGGINGFACE_API_KEY
    if (hfKey && hfKey !== 'your_key_here') {
      setAiMode('huggingface')
      setAiOnline(true)
      return
    }
    const geminiKey = process.env.NEXT_PUBLIC_GEMINI_KEY
    if (geminiKey && geminiKey !== 'your_key_here') {
      setAiMode('gemini')
      setAiOnline(true)
    } else {
      // Try calling the API anyway — server-side key may be set
      setAiMode('huggingface')
      setAiOnline(true)
    }
  }

  const sendMessage = async () => {
    if (!inputMessage.trim()) return

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

      if (aiMode === 'huggingface') {
        const res = await fetch('/api/huggingface', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: `You are openclow, a professional AI assistant. Provide clear, accurate, and helpful responses for software development, DevOps, coding, and general assistance. Be professional yet friendly.\n\nUser: ${userInput}\n\nAssistant:`
          })
        })
        if (!res.ok) throw new Error('HuggingFace unavailable')
        const data = await res.json()
        aiText = data.response

      } else {
        const geminiKey = process.env.NEXT_PUBLIC_GEMINI_KEY
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [{ text: `You are openclow, a professional AI assistant. Be helpful and concise.\n\nUser: ${userInput}` }]
            }]
          })
        })
        if (!res.ok) throw new Error('Gemini unavailable')
        const data = await res.json()
        aiText = data.candidates[0].content.parts[0].text
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
        text: `⚠️ Connection Error\n\nUnable to reach AI service: ${error.message}\n\nPlease check your API keys in environment variables.`,
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

  const handleAddTask = () => {
    if (!newTask.trim()) return
    addTask(newTask, newTaskCategory, newTaskPriority, newTaskDue || undefined)
    setNewTask('')
    setNewTaskDue('')
    setNewTaskPriority('medium')
    setNewTaskCategory('personal')
  }

  const toggleTask = (id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t))
  }

  const deleteTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id))
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500'
      case 'medium': return 'bg-yellow-500'
      case 'low': return 'bg-green-500'
      default: return 'bg-gray-500'
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'homework': return '📚'
      case 'work': return '💼'
      case 'devops': return '⚙️'
      case 'personal': return '👤'
      default: return '📌'
    }
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">

      {/* Sidebar */}
      <div className="w-72 bg-slate-900/50 backdrop-blur-xl border-r border-slate-700/50 flex flex-col">

        {/* Logo */}
        <div className="p-6 border-b border-slate-700/50">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-2xl shadow-lg shadow-blue-500/30">
              🤖
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                openclow
              </h1>
              <p className="text-xs text-slate-400">AI Assistant v2.0</p>
            </div>
          </div>

          {/* AI Status */}
          <div className="flex items-center gap-2 mt-4 px-3 py-2 bg-slate-800/50 rounded-lg border border-slate-700/30">
            <div className={`w-2 h-2 rounded-full ${aiOnline ? 'bg-green-400 animate-pulse shadow-lg shadow-green-400/50' : 'bg-red-400'}`}></div>
            <span className="text-xs text-slate-300 font-medium">
              {aiOnline
                ? (aiMode === 'huggingface' ? '🤗 HuggingFace Online' : '☁️ Gemini Online')
                : 'AI Offline'}
            </span>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 p-4 space-y-2">
          <button
            onClick={() => setActiveTab('chat')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
              activeTab === 'chat'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/40'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <span className="text-xl">💬</span>
            <span className="font-medium">Chat Assistant</span>
          </button>

          <button
            onClick={() => setActiveTab('tasks')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
              activeTab === 'tasks'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/40'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <span className="text-xl">✅</span>
            <div className="flex-1 text-left">
              <span className="font-medium">Tasks</span>
              <span className="block text-xs opacity-70">{tasks.filter(t => !t.completed).length} active</span>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('about')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
              activeTab === 'about'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/40'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <span className="text-xl">ℹ️</span>
            <span className="font-medium">About</span>
          </button>
        </div>

        {/* System Info */}
        <div className="p-4 border-t border-slate-700/50">
          <div className="text-xs text-slate-400 space-y-1 mb-3">
            <div className="flex justify-between">
              <span>Model:</span>
              <span className="text-slate-300">{aiMode === 'huggingface' ? 'Qwen 2.5-7B' : 'Gemini Flash'}</span>
            </div>
            <div className="flex justify-between">
              <span>Messages:</span>
              <span className="text-slate-300">{messages.length}</span>
            </div>
            <div className="flex justify-between">
              <span>Tasks:</span>
              <span className="text-slate-300">{tasks.length}</span>
            </div>
          </div>
          <button
            onClick={checkAI}
            className="w-full py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm text-slate-300 transition-all"
          >
            🔄 Refresh Status
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">

        {/* Header */}
        <div className="bg-slate-900/30 backdrop-blur-xl border-b border-slate-700/50 px-8 py-4">
          <h2 className="text-2xl font-bold text-white">
            {activeTab === 'chat' && '💬 Chat Assistant'}
            {activeTab === 'tasks' && '✅ Task Management'}
            {activeTab === 'about' && 'ℹ️ About openclow'}
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            {activeTab === 'chat' && `Powered by ${aiMode === 'huggingface' ? 'HuggingFace (Free)' : 'Gemini (Cloud)'} — Running in cloud`}
            {activeTab === 'tasks' && `${tasks.filter(t => !t.completed).length} active tasks`}
            {activeTab === 'about' && 'Professional AI assistant for developers and students'}
          </p>
        </div>

        {/* Chat View */}
        {activeTab === 'chat' && (
          <>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] rounded-2xl px-5 py-3 ${
                    msg.sender === 'user'
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-600/20'
                      : 'bg-slate-800/50 backdrop-blur-xl text-slate-100 border border-slate-700/50'
                  }`}>
                    <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                    <p className="text-xs opacity-60 mt-2">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl px-5 py-3 border border-slate-700/50">
                    <div className="flex items-center gap-2">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        <div className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                      </div>
                      <span className="text-sm text-slate-400">Thinking...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="bg-slate-900/30 backdrop-blur-xl border-t border-slate-700/50 p-6">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  placeholder="Ask about coding, DevOps, or anything else..."
                  className="flex-1 bg-slate-800/50 border border-slate-700/50 rounded-xl px-6 py-4 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
                <button
                  onClick={sendMessage}
                  disabled={isLoading || !aiOnline}
                  className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-600 text-white font-medium rounded-xl transition-all shadow-lg disabled:shadow-none hover:scale-105 active:scale-95"
                >
                  {isLoading ? '...' : '🚀 Send'}
                </button>
              </div>
            </div>
          </>
        )}

        {/* Tasks View */}
        {activeTab === 'tasks' && (
          <div className="flex-1 overflow-y-auto p-8">
            <div className="max-w-4xl mx-auto space-y-6">

              {/* Add Task Form */}
              <div className="bg-slate-800/30 backdrop-blur-xl border border-slate-700/50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">➕ Create New Task</h3>
                <div className="space-y-3">
                  <input
                    type="text"
                    value={newTask}
                    onChange={(e) => setNewTask(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddTask()}
                    placeholder="Enter task description..."
                    className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex gap-3">
                    <select
                      value={newTaskPriority}
                      onChange={(e) => setNewTaskPriority(e.target.value as Task['priority'])}
                      className="flex-1 bg-slate-800/50 border border-slate-700/50 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="low">🟢 Low Priority</option>
                      <option value="medium">🟡 Medium Priority</option>
                      <option value="high">🔴 High Priority</option>
                    </select>
                    <select
                      value={newTaskCategory}
                      onChange={(e) => setNewTaskCategory(e.target.value as Task['category'])}
                      className="flex-1 bg-slate-800/50 border border-slate-700/50 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="personal">👤 Personal</option>
                      <option value="work">💼 Work</option>
                      <option value="homework">📚 Homework</option>
                      <option value="devops">⚙️ DevOps</option>
                    </select>
                    <input
                      type="date"
                      value={newTaskDue}
                      onChange={(e) => setNewTaskDue(e.target.value)}
                      className="flex-1 bg-slate-800/50 border border-slate-700/50 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <button
                    onClick={handleAddTask}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all shadow-lg shadow-blue-600/20"
                  >
                    Add Task
                  </button>
                </div>
              </div>

              {/* Task List */}
              {tasks.length === 0 ? (
                <div className="text-center py-16">
                  <div className="text-6xl mb-4">📋</div>
                  <p className="text-xl text-slate-400">No tasks yet</p>
                  <p className="text-sm text-slate-500 mt-2">Create your first task above</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {tasks.map(task => (
                    <div
                      key={task.id}
                      className="bg-slate-800/30 backdrop-blur-xl border border-slate-700/50 rounded-xl p-5 hover:border-slate-600/50 transition-all group"
                    >
                      <div className="flex items-start gap-4">
                        <input
                          type="checkbox"
                          checked={task.completed}
                          onChange={() => toggleTask(task.id)}
                          className="w-5 h-5 mt-1 rounded border-slate-600 cursor-pointer"
                        />
                        <div className="flex-1">
                          <p className={`text-lg ${task.completed ? 'line-through text-slate-500' : 'text-white'}`}>
                            {task.text}
                          </p>
                          <div className="flex gap-2 mt-2 flex-wrap">
                            <span className={`text-xs px-2 py-1 rounded ${getPriorityColor(task.priority)} text-white`}>
                              {task.priority.toUpperCase()}
                            </span>
                            <span className="text-xs px-2 py-1 rounded bg-slate-700 text-slate-300">
                              {getCategoryIcon(task.category)} {task.category}
                            </span>
                            {task.dueDate && (
                              <span className="text-xs px-2 py-1 rounded bg-blue-900/50 text-blue-300 border border-blue-700/30">
                                📅 {task.dueDate}
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => deleteTask(task.id)}
                          className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-all"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* About View */}
        {activeTab === 'about' && (
          <div className="flex-1 overflow-y-auto p-8">
            <div className="max-w-3xl mx-auto space-y-6">
              <div className="bg-gradient-to-br from-blue-600/20 to-purple-600/20 backdrop-blur-xl border border-blue-500/30 rounded-xl p-8">
                <h3 className="text-2xl font-bold text-white mb-4">🤖 openclow v2.0</h3>
                <p className="text-slate-300 leading-relaxed">
                  A professional AI-powered assistant built with Next.js and HuggingFace cloud AI.
                  Features intelligent task management with due dates, priorities, and categories — completely free!
                </p>
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