import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import UserChip from '../components/UserChip'

const QUICK_PROMPTS = [
  { label: 'Trigonometry', icon: 'fa-square-root-alt', text: 'Explain trigonometry ratios for JAMB', color: 'blue' },
  { label: 'Photosynthesis', icon: 'fa-leaf', text: 'Explain photosynthesis simply', color: 'green' },
  { label: 'Comprehension', icon: 'fa-book-open', text: 'Give me tips for English comprehension in JAMB', color: 'orange' },
  { label: "Newton's Laws", icon: 'fa-atom', text: "Explain Newton's three laws of motion", color: 'purple' },
  { label: 'Periodic Table', icon: 'fa-flask', text: 'Help me memorize the periodic table groups', color: 'teal' },
  { label: 'Exam Strategy', icon: 'fa-chart-line', text: 'What is the best strategy to pass JAMB?', color: 'red' },
]

const SUBJECT_TAGS = ['Mathematics', 'English', 'Physics', 'Chemistry', 'Biology', 'Government', 'Economics']

const colorMap = {
  blue: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
  green: 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100',
  orange: 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100',
  purple: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100',
  teal: 'bg-teal-50 text-teal-700 border-teal-200 hover:bg-teal-100',
  red: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100',
}

export default function AITutor() {
  const navigate = useNavigate()
  const [messages, setMessages] = useState([
    { role: 'ai', content: "Hello! I'm your JambGenius AI Tutor powered by Grok 🤖\n\nI can help you with any JAMB subject — Mathematics, English, Physics, Chemistry, Biology, Government, and more.\n\nWhat would you like to study today?" }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState([])
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => { document.title = 'AI Tutor - JambGenius' }, [])
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const sendMessage = async (text) => {
    const userMsg = (text || input).trim()
    if (!userMsg || loading) return
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMsg }])
    setLoading(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: userMsg, history })
      })
      const data = await res.json()
      const reply = data.answer || data.reply || 'Sorry, I could not process your request.'
      setMessages(prev => [...prev, { role: 'ai', content: reply }])
      if (data.history) setHistory(data.history)
    } catch {
      setMessages(prev => [...prev, { role: 'ai', content: 'Connection error. Please check your internet and try again.' }])
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  const clearChat = () => {
    setMessages([{ role: 'ai', content: "Chat cleared! What would you like to study? 📚" }])
    setHistory([])
  }

  const canSend = !loading && input.trim().length > 0

  return (
    <div className="flex flex-col h-screen bg-gray-50 font-sans page-fade-in">

      {/* ── Top Navigation ── */}
      <nav className="bg-white shadow-sm border-b border-gray-200 z-50 flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <button onClick={() => navigate('/')} className="flex-shrink-0 flex items-center gap-2">
              <i className="fas fa-graduation-cap text-2xl text-blue-600"></i>
              <span className="text-xl font-bold text-gray-900">JambGenius</span>
            </button>
            <div className="hidden md:flex items-center gap-6 text-sm">
              <button onClick={() => navigate('/practice')} className="text-gray-600 hover:text-blue-600 font-medium transition-colors">Practice</button>
              <button onClick={() => navigate('/exam')} className="text-gray-600 hover:text-blue-600 font-medium transition-colors">Mock Exam</button>
              <button onClick={() => navigate('/analytics')} className="text-gray-600 hover:text-blue-600 font-medium transition-colors">Analytics</button>
              <span className="flex items-center gap-1 text-purple-600 font-semibold">
                <i className="fas fa-robot"></i> AI Tutor
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={clearChat}
                title="Clear conversation"
                className="hidden sm:flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 border border-gray-200 rounded-lg px-3 py-1.5 transition-colors"
              >
                <i className="fas fa-trash-alt text-xs"></i>
                <span>Clear chat</span>
              </button>
              <UserChip />
            </div>
          </div>
        </div>
      </nav>

      {/* ── Hero Banner ── */}
      <div className="bg-gradient-to-r from-purple-600 via-violet-600 to-blue-600 flex-shrink-0">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="text-white/70 hover:text-white transition-colors p-1">
              <i className="fas fa-arrow-left text-sm"></i>
            </button>
            <div className="relative">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center ring-2 ring-white/30">
                <i className="fas fa-robot text-white text-lg"></i>
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 border-2 border-purple-600 rounded-full"></span>
            </div>
            <div>
              <p className="text-white font-bold text-sm leading-tight">JambGenius AI Tutor</p>
              <p className="text-green-300 text-xs font-medium">● Online · Powered by Grok</p>
            </div>
          </div>
          <div className="hidden sm:flex flex-wrap gap-1.5">
            {SUBJECT_TAGS.map(s => (
              <span key={s} className="text-xs bg-white/15 text-white/90 px-2 py-0.5 rounded-full font-medium">{s}</span>
            ))}
          </div>
          <button
            onClick={clearChat}
            title="Clear conversation"
            className="sm:hidden text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-lg p-2 transition-colors"
          >
            <i className="fas fa-trash-alt text-sm"></i>
          </button>
        </div>
      </div>

      {/* ── Chat Body ── */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="max-w-4xl mx-auto px-4 py-5 space-y-5">

          {messages.map((msg, i) => (
            <div key={i} className={`flex items-end gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>

              {/* Avatar */}
              {msg.role === 'ai' ? (
                <div className="w-8 h-8 flex-shrink-0 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center shadow-md">
                  <i className="fas fa-robot text-white text-xs"></i>
                </div>
              ) : (
                <div className="w-8 h-8 flex-shrink-0 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center shadow-md">
                  <i className="fas fa-user text-white text-xs"></i>
                </div>
              )}

              {/* Bubble */}
              <div
                className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm whitespace-pre-wrap break-words ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-br-sm'
                    : 'bg-white text-gray-800 border border-gray-200 rounded-bl-sm'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {loading && (
            <div className="flex items-end gap-3">
              <div className="w-8 h-8 flex-shrink-0 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center shadow-md">
                <i className="fas fa-robot text-white text-xs"></i>
              </div>
              <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm flex items-center gap-1.5">
                <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* ── Quick Prompts ── */}
      <div className="flex-shrink-0 bg-white border-t border-gray-100">
        <div className="max-w-4xl mx-auto px-4 py-2.5 flex gap-2 overflow-x-auto scrollbar-hide">
          {QUICK_PROMPTS.map(p => (
            <button
              key={p.label}
              onClick={() => sendMessage(p.text)}
              disabled={loading}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0 disabled:opacity-50 ${colorMap[p.color]}`}
            >
              <i className={`fas ${p.icon} text-[10px]`}></i>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Input Area ── */}
      <div className="flex-shrink-0 bg-white border-t border-gray-200 shadow-[0_-1px_6px_rgba(0,0,0,0.06)]">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-end gap-3">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask anything about JAMB subjects..."
              rows={1}
              className="w-full bg-gray-50 border border-gray-300 focus:border-purple-400 focus:ring-2 focus:ring-purple-100 rounded-2xl px-4 py-3 pr-4 text-sm text-gray-900 placeholder-gray-400 outline-none resize-none font-sans leading-relaxed transition-colors"
              style={{ maxHeight: '120px', overflowY: 'auto' }}
            />
          </div>
          <button
            onClick={() => sendMessage()}
            disabled={!canSend}
            className={`flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center transition-all shadow-md ${
              canSend
                ? 'bg-gradient-to-br from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 hover:shadow-lg hover:scale-105'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
            }`}
          >
            <i className="fas fa-paper-plane text-sm"></i>
          </button>
        </div>
        <p className="text-center text-xs text-gray-400 pb-2">Press <kbd className="bg-gray-100 border border-gray-300 rounded px-1 text-gray-500">Enter</kbd> to send · <kbd className="bg-gray-100 border border-gray-300 rounded px-1 text-gray-500">Shift+Enter</kbd> for new line</p>
      </div>
    </div>
  )
}
