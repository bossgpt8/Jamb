import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import UserChip from '../components/UserChip'

const STORAGE_KEY = 'jg_chat_messages'
const NAME_KEY = 'jg_chat_display_name'

// Admin UIDs - add your Firebase UID here to get admin powers
const ADMIN_UIDS = ['rrn9hbDxmaNmjiu2GhxGi6yyS8v2']

const BOSS_SUGGESTIONS = [
  '@boss explain this topic: ',
  '@boss what is the answer to ',
  '@boss give me tips for ',
  '@boss help me understand ',
  '@boss what year did ',
]

export default function Community() {
  const navigate = useNavigate()
  const { user, showToast } = useAuth()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [chatName, setChatName] = useState('')
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  const isAdmin = user && ADMIN_UIDS.includes(user.uid)

  useEffect(() => {
    document.title = 'Student Chatroom - JambGenius'
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try { setMessages(JSON.parse(saved)) } catch {}
    } else {
      const welcome = [{ id: 1, sender: 'JambGenius Boss', text: 'Welcome to the JambGenius Community Chat! 🎓 Type @boss to ask the AI tutor anything about JAMB prep!', isBot: true, time: now() }]
      setMessages(welcome)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(welcome))
    }
    const savedName = localStorage.getItem(NAME_KEY)
    if (savedName) setChatName(savedName)
  }, [])

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const now = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const getDisplayName = () => chatName || user?.displayName || user?.email?.split('@')[0] || 'Student'

  const saveName = () => {
    const trimmed = nameInput.trim()
    if (!trimmed) { showToast('Please enter a name', 'warning'); return }
    setChatName(trimmed)
    localStorage.setItem(NAME_KEY, trimmed)
    setEditingName(false)
    showToast('Chat name updated!', 'success')
  }

  const handleInputChange = (e) => {
    const val = e.target.value
    setInput(val)
    // Show @boss suggestions when user types @
    if (val.endsWith('@') || val.endsWith('@b') || val.endsWith('@bo') || val.endsWith('@bos') || val === '@boss') {
      setShowSuggestions(true)
    } else {
      setShowSuggestions(false)
    }
  }

  const applySuggestion = (suggestion) => {
    setInput(suggestion)
    setShowSuggestions(false)
    inputRef.current?.focus()
  }

  const sendMessage = async () => {
    if (!input.trim() || sending) return
    const text = input.trim()
    setInput('')
    setShowSuggestions(false)

    const userMsg = { id: Date.now(), sender: getDisplayName(), text, isBot: false, time: now() }
    const updated = [...messages, userMsg]
    setMessages(updated)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))

    // Trigger AI if message contains @boss or ends with ?
    const shouldCallAI = text.toLowerCase().includes('@boss') || (text.includes('?') && text.length > 5)
    if (shouldCallAI) {
      setSending(true)
      try {
        const res = await fetch('/api/gemini-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question: text.replace(/@boss/gi, '').trim() || text })
        })
        const data = await res.json()
        const botMsg = {
          id: Date.now() + 1,
          sender: 'JambGenius Boss',
          text: data.answer || 'I could not answer that right now.',
          isBot: true,
          time: now()
        }
        const withBot = [...updated, botMsg]
        setMessages(withBot)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(withBot))
      } catch {
        showToast('Could not reach AI Boss', 'error')
      } finally {
        setSending(false)
      }
    }
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
    if (e.key === 'Escape') setShowSuggestions(false)
  }

  const clearChat = () => {
    if (!isAdmin) { showToast('Only admins can clear the chat', 'error'); return }
    const welcome = [{ id: 1, sender: 'JambGenius Boss', text: 'Chat cleared by admin. Welcome! 🎓', isBot: true, time: now() }]
    setMessages(welcome)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(welcome))
    showToast('Chat cleared', 'success')
  }

  return (
    <div className="bg-gray-50 font-sans min-h-screen page-fade-in">
      <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <button onClick={() => navigate('/')} className="flex-shrink-0 flex items-center">
              <i className="fas fa-graduation-cap text-2xl text-blue-600 mr-2"></i>
              <span className="text-xl font-bold text-gray-900">JambGenius</span>
            </button>
            <div className="flex items-center gap-3">
              <button onClick={() => setEditingName(true)} className="text-sm text-blue-600 font-medium flex items-center gap-1 bg-blue-50 px-3 py-1.5 rounded-lg">
                <i className="fas fa-pen text-xs"></i>
                <span className="hidden sm:inline">Name:</span> <span className="font-bold">{getDisplayName()}</span>
              </button>
              {isAdmin && (
                <span className="bg-purple-100 text-purple-700 text-xs font-bold px-2 py-1 rounded-full">ADMIN</span>
              )}
              <UserChip />
            </div>
          </div>
        </div>
      </nav>

      {/* Name edit modal */}
      {editingName && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setEditingName(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Set Chat Display Name</h3>
            <p className="text-sm text-gray-500 mb-4">This name only shows in community chat.</p>
            <input
              type="text" value={nameInput} onChange={e => setNameInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && saveName()}
              placeholder={getDisplayName()} maxLength={24} autoFocus
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
            />
            <div className="flex gap-2">
              <button onClick={() => setEditingName(false)} className="flex-1 py-2 rounded-xl border border-gray-300 text-gray-700 text-sm font-medium">Cancel</button>
              <button onClick={saveName} className="flex-1 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold">Save</button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col" style={{ height: 'calc(100vh - 220px)', minHeight: '400px' }}>
          {/* Chat header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 text-white flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <i className="fas fa-users text-lg"></i>
              </div>
              <div>
                <h2 className="font-bold text-lg">JambGenius Community</h2>
                <p className="text-blue-100 text-xs">Type @boss to ask the AI tutor • Like WhatsApp @MetaAI</p>
              </div>
            </div>
            {/* Only admins see the trash button */}
            {isAdmin && (
              <button onClick={clearChat} className="text-white/70 hover:text-white text-xs flex items-center gap-1 bg-white/10 px-2 py-1 rounded-lg" title="Admin: Clear chat">
                <i className="fas fa-trash-alt"></i> <span className="hidden sm:inline">Clear</span>
              </button>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg) => {
              const isMe = !msg.isBot && msg.sender === getDisplayName()
              return (
                <div key={msg.id} className={`flex items-end gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-white ${msg.isBot ? 'bg-gradient-to-br from-blue-500 to-indigo-600' : 'bg-green-500'}`}>
                    {msg.isBot ? <i className="fas fa-robot text-xs"></i> : msg.sender.charAt(0).toUpperCase()}
                  </div>
                  <div className={`max-w-[75%] ${isMe ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
                    {!isMe && <span className="text-xs text-gray-500 ml-1">{msg.sender}</span>}
                    <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${isMe ? 'bg-blue-600 text-white rounded-br-sm' : msg.isBot ? 'bg-indigo-50 text-gray-800 border border-indigo-100 rounded-bl-sm' : 'bg-gray-100 text-gray-800 rounded-bl-sm'}`}>
                      {msg.text}
                    </div>
                    <span className="text-xs text-gray-400 mx-1">{msg.time}</span>
                  </div>
                </div>
              )
            })}
            {sending && (
              <div className="flex items-end gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                  <i className="fas fa-robot text-white text-xs"></i>
                </div>
                <div className="bg-indigo-50 border border-indigo-100 rounded-2xl rounded-bl-sm px-4 py-3">
                  <div className="flex gap-1">
                    {[0,1,2].map(d => <span key={d} className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: `${d*150}ms` }}></span>)}
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* @boss suggestions dropdown - like WhatsApp @MetaAI */}
          {showSuggestions && (
            <div className="border-t border-gray-100 bg-white">
              <div className="px-3 py-1.5 text-xs text-gray-400 font-medium flex items-center gap-1">
                <i className="fas fa-robot text-indigo-500"></i> Ask JambGenius Boss
              </div>
              {BOSS_SUGGESTIONS.map((s, i) => (
                <button key={i} onClick={() => applySuggestion(s)}
                  className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-indigo-50 flex items-center gap-2 transition-colors">
                  <span className="text-indigo-500 font-medium text-xs">@boss</span>
                  <span>{s.replace('@boss ', '')}</span>
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="p-3 border-t border-gray-100 bg-gray-50">
            <div className="flex gap-2 items-end">
              <div className="flex-1 relative">
                <input
                  ref={inputRef}
                  type="text" value={input}
                  onChange={handleInputChange}
                  onKeyDown={handleKey}
                  placeholder={`Message as ${getDisplayName()}... (type @ for AI)`}
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  maxLength={500}
                />
              </div>
              <button onClick={sendMessage} disabled={!input.trim() || sending}
                className="bg-blue-600 text-white w-11 h-11 rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center disabled:opacity-40 flex-shrink-0">
                <i className="fas fa-paper-plane text-sm"></i>
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1 text-center">Type <strong>@boss</strong> to call the AI tutor</p>
          </div>
        </div>
      </div>
    </div>
  )
}
