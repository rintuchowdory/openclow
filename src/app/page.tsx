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
  dueDate?: string
  category: 'homework' | 'office' | 'study' | 'other'
}

interface Note {
  id: string
  title: string
  content: string
  category: 'devops' | 'coding' | 'other'
  lastEdited: Date
}

export default function OpenclowApp() {
  const [messages, setMessages] = useState<Message[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [showApiSetup, setShowApiSetup] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'chat' | 'tasks' | 'notes'>('chat')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Load data from localStorage on mount
  useEffect(() => {
    const savedMessages = localStorage.getItem('openclow-messages')
    const savedTasks = localStorage.getItem('openclow-tasks')
    const savedNotes = localStorage.getItem('openclow-notes')
    const savedApiKey = localStorage.getItem('openclow-api-key')

    if (savedMessages) setMessages(JSON.parse(savedMessages))
    if (savedTasks) setTasks(JSON.parse(savedTasks))
    if (savedNotes) setNotes(JSON.parse(savedNotes))
    if (savedApiKey) {
      setApiKey(savedApiKey)
    } else {
      setShowApiSetup(true)
    }

    // Welcome message
    if (!savedMessages) {
      const welcomeMsg: Message = {
        id: Date.now().toString(),
        text: "👋 Hi! I'm openclow, your personal AI assistant. I can help you with:\n\n✅ Homework & assignments\n📋 Office work & tasks\n💻 DevOps & coding studies\n📝 Notes & reminders\n\nHow can I help you today?",
        sender: 'ai',
        timestamp: new Date()
      }
      setMessages([welcomeMsg])
    }
  }, [])

  // Save to localStorage whenever data changes
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('openclow-messages', JSON.stringify(messages))
    }
  }, [messages])

  useEffect(() => {
    localStorage.setItem('openclow-tasks', JSON.stringify(tasks))
  }, [tasks])

  useEffect(() => {
    localStorage.setItem('openclow-notes', JSON.stringify(notes))
  }, [notes])

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const saveApiKey = () => {
    if (apiKey.trim()) {
      localStorage.setItem('openclow-api-key', apiKey)
      setShowApiSetup(false)
    }
  }

  const sendMessage = async () => {
    if (!inputMessage.trim()) return
    if (!apiKey) {
      setShowApiSetup(true)
      return
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputMessage,
      sender: 'user',
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputMessage('')
    setIsLoading(true)

    try {
      // Call Google Gemini API
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `You are openclow, a helpful personal AI assistant. Help the user with their homework, office work, DevOps/coding studies, and task management. Be friendly and concise. User says: ${inputMessage}`
            }]
          }]
        })
      })

      const data = await response.json()

      if (data.candidates && data.candidates[0]) {
        const aiText = data.candidates[0].content.parts[0].text

        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: aiText,
          sender: 'ai',
          timestamp: new Date()
        }
        setMessages(prev => [...prev, aiMessage])

        // Auto-detect tasks from conversation
        if (inputMessage.toLowerCase().includes('remind me') ||
            inputMessage.toLowerCase().includes('todo') ||
            inputMessage.toLowerCase().includes('task')) {
          const taskText = inputMessage.replace(/remind me to|todo:|task:/gi, '').trim()
          if (taskText) {
            addQuickTask(taskText)
          }
        }
      } else {
        throw new Error('Invalid API response')
      }
    } catch (error) {
      console.error('AI Error:', error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: "Sorry, I couldn't process that. Please check your API key in settings (⚙️ icon) or try again.",
        sender: 'ai',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const addQuickTask = (text: string) => {
    const newTask: Task = {
      id: Date.now().toString(),
      text: text,
      completed: false,
      category: 'other'
    }
    setTasks(prev => [...prev, newTask])
  }

  const addTask = (text: string, category: Task['category'], dueDate?: string) => {
    const newTask: Task = {
      id: Date.now().toString(),
      text,
      completed: false,
      category,
      dueDate
    }
    setTasks(prev => [...prev, newTask])
  }

  const toggleTask = (id: string) => {
    setTasks(prev => prev.map(task =>
      task.id === id ? { ...task, completed: !task.completed } : task
    ))
  }

  const deleteTask = (id: string) => {
    setTasks(prev => prev.filter(task => task.id !== id))
  }

  const clearAllData = () => {
    if (confirm('Are you sure? This will delete all messages, tasks, and notes.')) {
      localStorage.clear()
      setMessages([])
      setTasks([])
      setNotes([])
      setApiKey('')
      setShowApiSetup(true)
    }
  }

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      {/* API Setup Modal */}
      {showApiSetup && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-4">🔑 Setup Google Gemini API</h2>
            <p className="text-gray-300 mb-4">
              To use openclow, you need a FREE Google Gemini API key:
            </p>
            <ol className="text-sm text-gray-400 mb-4 space-y-2">
              <li>1. Go to <a href="https://aistudio.google.com/apikey" target="_blank" className="text-blue-400 underline">Google AI Studio</a></li>
              <li>2. Click "Create API Key"</li>
              <li>3. Copy your key and paste it below</li>
            </ol>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Paste your API key here..."
              className="w-full bg-gray-700 rounded-lg px-4 py-3 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex gap-2">
              <button
                onClick={saveApiKey}
                className="flex-1 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg font-medium transition"
              >
                Save & Start
              </button>
              {apiKey && (
                <button
                  onClick={() => setShowApiSetup(false)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <div className="w-20 bg-gray-800 flex flex-col items-center py-4 space-y-4">
        <div className="text-3xl mb-4">🤖</div>

        <button
          onClick={() => setActiveTab('chat')}
          className={`p-3 rounded-lg transition ${activeTab === 'chat' ? 'bg-blue-600' : 'hover:bg-gray-700'}`}
          title="Chat"
        >
          💬
        </button>

        <button
          onClick={() => setActiveTab('tasks')}
          className={`p-3 rounded-lg transition ${activeTab === 'tasks' ? 'bg-blue-600' : 'hover:bg-gray-700'}`}
          title="Tasks"
        >
          ✅
        </button>

        <button
          onClick={() => setActiveTab('notes')}
          className={`p-3 rounded-lg transition ${activeTab === 'notes' ? 'bg-blue-600' : 'hover:bg-gray-700'}`}
          title="Notes"
        >
          📝
        </button>

        <div className="flex-1"></div>

        <button
          onClick={() => setShowApiSetup(true)}
          className="p-3 hover:bg-gray-700 rounded-lg transition"
          title="Settings"
        >
          ⚙️
        </button>

        <button
          onClick={clearAllData}
          className="p-3 hover:bg-red-600 rounded-lg transition"
          title="Clear All Data"
        >
          🗑️
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-gray-800 px-6 py-4 border-b border-gray-700">
          <h1 className="text-2xl font-bold">
            {activeTab === 'chat' && '💬 openclow Chat'}
            {activeTab === 'tasks' && '✅ Tasks & Reminders'}
            {activeTab === 'notes' && '📝 Study Notes'}
          </h1>
          <p className="text-sm text-gray-400">
            {activeTab === 'chat' && 'Your personal AI assistant'}
            {activeTab === 'tasks' && `${tasks.filter(t => !t.completed).length} pending tasks`}
            {activeTab === 'notes' && `${notes.length} notes saved`}
          </p>
        </div>

        {/* Chat View */}
        {activeTab === 'chat' && (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                      msg.sender === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-100'
                    }`}
                  >
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

            {/* Input */}
            <div className="bg-gray-800 p-4 border-t border-gray-700">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Type your message..."
                  className="flex-1 bg-gray-700 rounded-full px-6 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={sendMessage}
                  disabled={isLoading}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded-full px-6 py-3 font-medium transition"
                >
                  Send
                </button>
              </div>
            </div>
          </>
        )}

        {/* Tasks View */}
        {activeTab === 'tasks' && (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-3xl mx-auto">
              <div className="mb-6">
                <input
                  type="text"
                  placeholder="Add a new task... (press Enter)"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                      addTask(e.currentTarget.value, 'other')
                      e.currentTarget.value = ''
                    }
                  }}
                  className="w-full bg-gray-800 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-3">
                {tasks.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No tasks yet. Add one above!</p>
                ) : (
                  tasks.map(task => (
                    <div
                      key={task.id}
                      className="bg-gray-800 rounded-lg p-4 flex items-center gap-3 hover:bg-gray-750 transition"
                    >
                      <input
                        type="checkbox"
                        checked={task.completed}
                        onChange={() => toggleTask(task.id)}
                        className="w-5 h-5 rounded"
                      />
                      <div className="flex-1">
                        <p className={`${task.completed ? 'line-through text-gray-500' : ''}`}>
                          {task.text}
                        </p>
                        {task.dueDate && (
                          <p className="text-xs text-gray-500 mt-1">Due: {task.dueDate}</p>
                        )}
                      </div>
                      <span className="text-xs bg-gray-700 px-2 py-1 rounded">
                        {task.category}
                      </span>
                      <button
                        onClick={() => deleteTask(task.id)}
                        className="text-red-500 hover:text-red-400"
                      >
                        🗑️
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Notes View */}
        {activeTab === 'notes' && (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-3xl mx-auto">
              <p className="text-center text-gray-500 py-8">
                Notes feature coming soon! For now, use the chat to save study notes.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
