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
}

export default function OpenclowApp() {
  const [messages, setMessages] = useState<Message[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'chat' | 'tasks' | 'about'>('chat')
  const [ollamaOnline, setOllamaOnline] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const saved = localStorage.getItem('openclow-messages')
    if (saved) setMessages(JSON.parse(saved))
    else {
      setMessages([{
        id: '1',
        text: "👋 **Welcome to openclow ULTRA!**\n\nYour gorgeous AI assistant.\n\n✨ Features:\n• Glassmorphism design\n• Real-time AI chat\n• Task management\n• 100% FREE\n\nAsk me anything!",
        sender: 'ai',
        timestamp: new Date()
      }])
    }
    
    const savedTasks = localStorage.getItem('openclow-tasks')
    if (savedTasks) setTasks(JSON.parse(savedTasks))
    
    checkOllama()
    const interval = setInterval(checkOllama, 30000)
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

  const checkOllama = async () => {
    try {
      const res = await fetch('http://localhost:11434/api/tags')
      setOllamaOnline(res.ok)
    } catch {
      setOllamaOnline(false)
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
      const res = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama3.2',
          prompt: `You are openclow, a helpful AI assistant. Be friendly and professional.\n\nUser: ${userInput}\n\nAssistant:`,
          stream: false
        })
      })

      if (!res.ok) throw new Error('Ollama unavailable')

      const data = await res.json()
      
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        text: data.response,
        sender: 'ai',
        timestamp: new Date()
      }])

      if (userInput.toLowerCase().includes('remind me') || userInput.toLowerCase().includes('add task')) {
        const task = userInput.replace(/remind me to|add task|remind me/gi, '').trim()
        if (task) addTask(task, 'personal', 'medium')
      }
    } catch (error) {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        text: "⚠️ Ollama offline. Restart: sudo systemctl restart ollama",
        sender: 'ai',
        timestamp: new Date()
      }])
      setOllamaOnline(false)
    } finally {
      setIsLoading(false)
    }
  }

  const addTask = (text: string, category: Task['category'], priority: Task['priority']) => {
    if (!text.trim()) return
    setTasks(prev => [...prev, {
      id: Date.now().toString(),
      text: text.trim(),
      completed: false,
      category,
      priority
    }])
  }

  const toggleTask = (id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t))
  }

  const deleteTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id))
  }

  const getPriorityColor = (priority: string) => {
    switch(priority) {
      case 'high': return 'from-red-500 to-red-600'
      case 'medium': return 'from-yellow-500 to-yellow-600'
      case 'low': return 'from-green-500 to-green-600'
      default: return 'from-gray-500 to-gray-600'
    }
  }

  return (
    <div className="relative flex h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 overflow-hidden">
      <div className="absolute top-1/4 -left-48 w-96 h-96 bg-blue-500/30 rounded-full filter blur-3xl animate-pulse"></div>
      <div className="absolute bottom-1/4 -right-48 w-96 h-96 bg-purple-500/30 rounded-full filter blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>

      <div className="relative z-10 w-80 bg-slate-900/40 backdrop-blur-2xl border-r border-slate-700/30 flex flex-col shadow-2xl">
        <div className="p-6 border-b border-slate-700/30">
          <div className="flex items-center gap-3 mb-3">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl blur-md opacity-75"></div>
              <div className="relative w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center text-2xl shadow-lg">
                🤖
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                openclow
              </h1>
              <p className="text-xs text-slate-400 font-mono">ULTRA Edition</p>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-4 px-3 py-2 bg-slate-800/50 rounded-lg border border-slate-700/30">
            <div className={`w-2 h-2 rounded-full ${ollamaOnline ? 'bg-green-400 shadow-lg shadow-green-400/50 animate-pulse' : 'bg-red-400'}`}></div>
            <span className="text-xs text-slate-300 font-medium">
              {ollamaOnline ? 'Ollama Online' : 'Ollama Offline'}
            </span>
          </div>
        </div>

        <div className="flex-1 p-4 space-y-2 overflow-y-auto">
          {['chat', 'tasks', 'about'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all ${
                activeTab === tab 
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-600/30' 
                  : 'text-slate-300 hover:bg-slate-800/50'
              }`}
            >
              <span className="text-xl">
                {tab === 'chat' && '💬'}
                {tab === 'tasks' && '✅'}
                {tab === 'about' && 'ℹ️'}
              </span>
              <span className="font-medium capitalize">{tab}</span>
            </button>
          ))}
        </div>

        <div className="p-4 border-t border-slate-700/30 bg-slate-900/20">
          <div className="text-xs text-slate-400 space-y-1 mb-3">
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
            onClick={checkOllama}
            className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-lg text-sm text-white font-medium transition-all shadow-lg hover:shadow-xl"
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      <div className="relative z-10 flex-1 flex flex-col">
        <div className="bg-slate-900/20 backdrop-blur-2xl border-b border-slate-700/30 px-8 py-5 shadow-lg">
          <h2 className="text-3xl font-bold text-white mb-1">
            {activeTab === 'chat' && '💬 Chat Assistant'}
            {activeTab === 'tasks' && '✅ Task Management'}
            {activeTab === 'about' && 'ℹ️ About openclow'}
          </h2>
          <p className="text-sm text-slate-400">
            {activeTab === 'chat' && 'Powered by Ollama Llama 3.2'}
            {activeTab === 'tasks' && `${tasks.filter(t => !t.completed).length} active tasks`}
            {activeTab === 'about' && 'Professional AI Assistant'}
          </p>
        </div>

        {activeTab === 'chat' && (
          <>
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn`}>
                  <div className={`max-w-[75%] rounded-2xl px-6 py-4 shadow-xl ${
                    msg.sender === 'user'
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                      : 'bg-slate-800/60 backdrop-blur-xl text-slate-100 border border-slate-700/50'
                  }`}>
                    <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                    <p className="text-xs opacity-60 mt-3 flex items-center gap-2">
                      <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </p>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start animate-fadeIn">
                  <div className="bg-slate-800/60 backdrop-blur-xl rounded-2xl px-6 py-4 border border-slate-700/50 shadow-xl">
                    <div className="flex items-center gap-3">
                      <div className="flex space-x-1.5">
                        <div className="w-2.5 h-2.5 bg-blue-400 rounded-full animate-bounce shadow-lg shadow-blue-400/50"></div>
                        <div className="w-2.5 h-2.5 bg-purple-400 rounded-full animate-bounce shadow-lg shadow-purple-400/50" style={{ animationDelay: '0.2s' }}></div>
                        <div className="w-2.5 h-2.5 bg-pink-400 rounded-full animate-bounce shadow-lg shadow-pink-400/50" style={{ animationDelay: '0.4s' }}></div>
                      </div>
                      <span className="text-sm text-slate-300 font-medium">Thinking...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="bg-slate-900/20 backdrop-blur-2xl border-t border-slate-700/30 p-6 shadow-2xl">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  placeholder="Ask anything about coding, DevOps, Docker..."
                  className="flex-1 bg-slate-800/60 border border-slate-700/50 rounded-xl px-6 py-4 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-lg"
                />
                <button
                  onClick={sendMessage}
                  disabled={isLoading || !ollamaOnline}
                  className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-600 text-white font-medium rounded-xl transition-all shadow-lg hover:shadow-xl disabled:shadow-none hover:scale-105 active:scale-95"
                >
                  {isLoading ? '...' : '🚀'}
                </button>
              </div>
            </div>
          </>
        )}

        {activeTab === 'tasks' && (
          <div className="flex-1 overflow-y-auto p-8">
            <div className="max-w-5xl mx-auto space-y-6">
              <div className="bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 shadow-xl">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <span>➕</span> Add New Task
                </h3>
                <input
                  type="text"
                  placeholder="What needs to be done?"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                      addTask(e.currentTarget.value, 'personal', 'medium')
                      e.currentTarget.value = ''
                    }
                  }}
                  className="w-full bg-slate-800/60 border border-slate-700/50 rounded-xl px-5 py-3.5 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-lg"
                />
              </div>

              {tasks.length === 0 ? (
                <div className="text-center py-20">
                  <div className="text-7xl mb-4 animate-bounce">📋</div>
                  <p className="text-2xl text-slate-300 font-semibold">No tasks yet</p>
                  <p className="text-sm text-slate-500 mt-2">Create your first task above</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {tasks.map(task => (
                    <div
                      key={task.id}
                      className="group bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 rounded-xl p-5 hover:border-slate-600/50 transition-all shadow-lg hover:shadow-xl hover:scale-[1.01]"
                    >
                      <div className="flex items-start gap-4">
                        <input
                          type="checkbox"
                          checked={task.completed}
                          onChange={() => toggleTask(task.id)}
                          className="w-5 h-5 mt-1 rounded-lg border-2 border-slate-600 checked:bg-blue-600 checked:border-blue-600 transition-all cursor-pointer"
                        />
                        <div className="flex-1">
                          <p className={`text-lg mb-2 ${task.completed ? 'line-through text-slate-500' : 'text-white font-medium'}`}>
                            {task.text}
                          </p>
                          <div className="flex gap-2">
                            <span className={`text-xs px-3 py-1.5 rounded-lg bg-gradient-to-r ${getPriorityColor(task.priority)} text-white font-medium`}>
                              {task.priority.toUpperCase()}
                            </span>
                            <span className="text-xs px-3 py-1.5 rounded-lg bg-slate-700/50 text-slate-300 border border-slate-600/30">
                              {task.category}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => deleteTask(task.id)}
                          className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-all hover:scale-110"
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

        {activeTab === 'about' && (
          <div className="flex-1 overflow-y-auto p-8">
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="relative bg-gradient-to-br from-blue-600/20 via-purple-600/20 to-pink-600/20 backdrop-blur-xl border border-blue-500/30 rounded-2xl p-8 shadow-2xl overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full filter blur-3xl"></div>
                <div className="relative">
                  <h3 className="text-3xl font-bold text-white mb-4 flex items-center gap-3">
                    <span className="text-4xl">🤖</span> openclow ULTRA
                  </h3>
                  <p className="text-slate-300 leading-relaxed text-lg">
                    A gorgeous AI-powered personal assistant with glassmorphism design, 
                    local Ollama AI integration, and intelligent task management.
                  </p>
                </div>
              </div>

              <div className="bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 shadow-xl">
                <h4 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                  <span>🛠️</span> Technology Stack
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-700/30 px-4 py-3 rounded-lg border border-slate-600/30 hover:border-blue-500/50 transition-all">
                    <div className="text-blue-400 font-semibold">Next.js 16</div>
                    <div className="text-slate-400 text-sm">React Framework</div>
                  </div>
                  <div className="bg-slate-700/30 px-4 py-3 rounded-lg border border-slate-600/30 hover:border-blue-500/50 transition-all">
                    <div className="text-blue-400 font-semibold">TypeScript</div>
                    <div className="text-slate-400 text-sm">Type Safety</div>
                  </div>
                  <div className="bg-slate-700/30 px-4 py-3 rounded-lg border border-slate-600/30 hover:border-blue-500/50 transition-all">
                    <div className="text-blue-400 font-semibold">Tailwind CSS</div>
                    <div className="text-slate-400 text-sm">Styling</div>
                  </div>
                  <div className="bg-slate-700/30 px-4 py-3 rounded-lg border border-slate-600/30 hover:border-blue-500/50 transition-all">
                    <div className="text-blue-400 font-semibold">Llama 3.2</div>
                    <div className="text-slate-400 text-sm">AI Model</div>
                  </div>
                </div>
              </div>

              <div className="bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 shadow-xl">
                <h4 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                  <span>✨</span> Features
                </h4>
                <ul className="space-y-3 text-slate-300">
                  <li className="flex items-start gap-3">
                    <span className="text-green-400 text-xl flex-shrink-0">✓</span>
                    <span>Beautiful glassmorphism UI with animated gradients</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-green-400 text-xl flex-shrink-0">✓</span>
                    <span>Local AI inference - 100% private & free</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-green-400 text-xl flex-shrink-0">✓</span>
                    <span>Intelligent task management with priorities</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-green-400 text-xl flex-shrink-0">✓</span>
                    <span>Persistent data storage across sessions</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-green-400 text-xl flex-shrink-0">✓</span>
                    <span>Responsive design for all devices</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-green-400 text-xl flex-shrink-0">✓</span>
                    <span>Real-time Ollama connection monitoring</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}
