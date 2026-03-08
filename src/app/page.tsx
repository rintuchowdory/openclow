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
  category: 'homework' | 'office' | 'study' | 'other'
}

export default function OpenclowApp() {
  const [messages, setMessages] = useState<Message[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'chat' | 'tasks'>('chat')
  const [ollamaOnline, setOllamaOnline] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const saved = localStorage.getItem('openclow-messages')
    if (saved) setMessages(JSON.parse(saved))
    else {
      setMessages([{
        id: '1',
        text: "👋 Hi! I'm openclow powered by LOCAL Ollama AI!\n\n✅ 100% FREE\n💻 Runs on YOUR computer\n🔒 Complete privacy\n\nI can help with:\n• Homework & coding\n• DevOps (Docker, K8s)\n• Task management\n\nHow can I help?",
        sender: 'ai',
        timestamp: new Date()
      }])
    }
    
    const savedTasks = localStorage.getItem('openclow-tasks')
    if (savedTasks) setTasks(JSON.parse(savedTasks))
    
    checkOllama()
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
          prompt: `You are openclow, a helpful AI assistant. Help with homework, DevOps, coding, and tasks. Be friendly and concise.\n\nUser: ${userInput}\n\nAssistant:`,
          stream: false
        })
      })

      if (!res.ok) throw new Error('Ollama not responding')

      const data = await res.json()
      
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        text: data.response,
        sender: 'ai',
        timestamp: new Date()
      }])

      if (userInput.toLowerCase().includes('remind me')) {
        const task = userInput.replace(/remind me to|remind me/gi, '').trim()
        if (task) addTask(task)
      }
    } catch (error) {
      console.error('AI Error:', error)
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        text: "⚠️ Can't connect to Ollama.\n\nMake sure it's running:\n• Check status: systemctl status ollama\n• Or restart: sudo systemctl restart ollama",
        sender: 'ai',
        timestamp: new Date()
      }])
      setOllamaOnline(false)
    } finally {
      setIsLoading(false)
    }
  }

  const addTask = (text: string) => {
    if (!text.trim()) return
    setTasks(prev => [...prev, {
      id: Date.now().toString(),
      text: text.trim(),
      completed: false,
      category: 'other'
    }])
  }

  const toggleTask = (id: string) => {
    setTasks(prev => prev.map(t => 
      t.id === id ? { ...t, completed: !t.completed } : t
    ))
  }

  const deleteTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id))
  }

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      <div className="w-20 bg-gray-800 flex flex-col items-center py-4 space-y-4">
        <div className="text-3xl mb-4">🤖</div>
        <div className={`w-3 h-3 rounded-full ${ollamaOnline ? 'bg-green-500' : 'bg-red-500'}`} 
             title={ollamaOnline ? 'Ollama Online' : 'Ollama Offline'}></div>
        
        <button
          onClick={() => setActiveTab('chat')}
          className={`p-3 rounded-lg ${activeTab === 'chat' ? 'bg-blue-600' : 'hover:bg-gray-700'}`}
        >
          💬
        </button>
        
        <button
          onClick={() => setActiveTab('tasks')}
          className={`p-3 rounded-lg ${activeTab === 'tasks' ? 'bg-blue-600' : 'hover:bg-gray-700'}`}
        >
          ✅
        </button>

        <div className="flex-1"></div>
        
        <button onClick={checkOllama} className="p-3 hover:bg-gray-700 rounded-lg" title="Check Ollama">
          🔄
        </button>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="bg-gray-800 px-6 py-4 border-b border-gray-700">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            {activeTab === 'chat' && '💬 openclow Chat'}
            {activeTab === 'tasks' && '✅ Tasks'}
            <span className={`text-xs px-2 py-1 rounded ${ollamaOnline ? 'bg-green-600' : 'bg-red-600'}`}>
              {ollamaOnline ? '🟢 FREE Local AI' : '🔴 Ollama Offline'}
            </span>
          </h1>
          <p className="text-sm text-gray-400">
            {activeTab === 'chat' && '100% Free - Powered by Ollama'}
            {activeTab === 'tasks' && `${tasks.filter(t => !t.completed).length} pending`}
          </p>
        </div>

        {activeTab === 'chat' && (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] rounded-2xl px-4 py-2 ${msg.sender === 'user' ? 'bg-blue-600' : 'bg-gray-700'}`}>
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                    <p className="text-xs opacity-70 mt-1">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-700 rounded-2xl px-4 py-2">
                    <div className="flex space-x-2">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="bg-gray-800 p-4 border-t border-gray-700">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Ask about Docker, Python, DevOps..."
                  className="flex-1 bg-gray-700 rounded-full px-6 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={sendMessage}
                  disabled={isLoading}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded-full px-6 py-3 font-medium"
                >
                  Send
                </button>
              </div>
            </div>
          </>
        )}

        {activeTab === 'tasks' && (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-3xl mx-auto">
              <input
                type="text"
                placeholder="Add task (press Enter)"
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                    addTask(e.currentTarget.value)
                    e.currentTarget.value = ''
                  }
                }}
                className="w-full bg-gray-800 rounded-lg px-4 py-3 mb-6 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              {tasks.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No tasks yet!</p>
              ) : (
                <div className="space-y-3">
                  {tasks.map(task => (
                    <div key={task.id} className="bg-gray-800 rounded-lg p-4 flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={task.completed}
                        onChange={() => toggleTask(task.id)}
                        className="w-5 h-5 rounded"
                      />
                      <p className={`flex-1 ${task.completed ? 'line-through text-gray-500' : ''}`}>
                        {task.text}
                      </p>
                      <button onClick={() => deleteTask(task.id)} className="text-red-500">
                        🗑️
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
