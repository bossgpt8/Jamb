import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

const QUICK_PROMPTS = [
  { label: '📐 Trigonometry', text: 'Explain trigonometry ratios for JAMB' },
  { label: '🌿 Photosynthesis', text: 'Explain photosynthesis simply' },
  { label: '📖 Comprehension tips', text: 'Give me tips for English comprehension in JAMB' },
  { label: '⚡ Newton\'s laws', text: 'Explain Newton\'s three laws of motion' },
  { label: '🧪 Periodic table', text: 'Help me memorize the periodic table groups' },
  { label: '📊 Exam strategy', text: 'What is the best strategy to pass JAMB?' },
]

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

  return (
    <div style={{
      background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
      minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: "'Inter', sans-serif"
    }}>
      {/* Header */}
      <div style={{
        background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.1)', padding: '14px 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={() => navigate(-1)} style={{ color: '#a1a1aa', background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', padding: '4px' }}>
            ←
          </button>
          <div style={{ position: 'relative' }}>
            <div style={{
              width: '42px', height: '42px',
              background: 'linear-gradient(135deg, #667eea, #764ba2)',
              borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 20px rgba(102,126,234,0.5)'
            }}>
              <span style={{ fontSize: '20px' }}>🤖</span>
            </div>
            <div style={{
              position: 'absolute', bottom: '1px', right: '1px',
              width: '11px', height: '11px', background: '#22c55e',
              borderRadius: '50%', border: '2px solid #0f0c29'
            }} />
          </div>
          <div>
            <div style={{ color: '#fff', fontWeight: '700', fontSize: '16px', letterSpacing: '-0.3px' }}>JambGenius AI Tutor</div>
            <div style={{ color: '#22c55e', fontSize: '11px', fontWeight: '500' }}>● Online • Powered by Grok</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={clearChat} title="Clear chat" style={{
            color: '#a1a1aa', background: 'rgba(255,255,255,0.08)', border: 'none',
            borderRadius: '8px', padding: '8px 10px', cursor: 'pointer', fontSize: '14px'
          }}>🗑️</button>
          <button onClick={() => navigate('/')} style={{
            color: '#a1a1aa', background: 'rgba(255,255,255,0.08)', border: 'none',
            borderRadius: '8px', padding: '8px 10px', cursor: 'pointer', fontSize: '14px'
          }}>🏠</button>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ display: 'flex', gap: '10px', flexDirection: msg.role === 'user' ? 'row-reverse' : 'row', alignItems: 'flex-end' }}>
            {msg.role === 'ai' && (
              <div style={{
                width: '34px', height: '34px', flexShrink: 0,
                background: 'linear-gradient(135deg, #667eea, #764ba2)',
                borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(102,126,234,0.4)', fontSize: '16px'
              }}>🤖</div>
            )}
            <div style={{
              maxWidth: '78%',
              padding: '12px 16px',
              borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '4px 18px 18px 18px',
              background: msg.role === 'user'
                ? 'linear-gradient(135deg, #667eea, #764ba2)'
                : 'rgba(255,255,255,0.09)',
              backdropFilter: 'blur(10px)',
              border: msg.role === 'ai' ? '1px solid rgba(255,255,255,0.1)' : 'none',
              color: '#fff', fontSize: '14px', lineHeight: '1.7',
              whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              boxShadow: msg.role === 'user' ? '0 4px 15px rgba(102,126,234,0.4)' : '0 2px 8px rgba(0,0,0,0.3)'
            }}>
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
            <div style={{
              width: '34px', height: '34px',
              background: 'linear-gradient(135deg, #667eea, #764ba2)',
              borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px'
            }}>🤖</div>
            <div style={{
              background: 'rgba(255,255,255,0.09)', backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.1)',
              padding: '14px 18px', borderRadius: '4px 18px 18px 18px',
              display: 'flex', gap: '5px', alignItems: 'center'
            }}>
              {[0, 1, 2].map(d => (
                <div key={d} style={{
                  width: '7px', height: '7px', borderRadius: '50%',
                  background: '#667eea', animation: 'bounce 1.2s infinite',
                  animationDelay: `${d * 0.2}s`
                }} />
              ))}
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick prompts */}
      <div style={{ padding: '8px 16px', display: 'flex', gap: '8px', overflowX: 'auto', flexShrink: 0 }}>
        {QUICK_PROMPTS.map(p => (
          <button key={p.label} onClick={() => sendMessage(p.text)} style={{
            background: 'rgba(102,126,234,0.15)', border: '1px solid rgba(102,126,234,0.3)',
            color: '#a5b4fc', borderRadius: '20px', padding: '7px 14px',
            fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap',
            fontWeight: '500', transition: 'all 0.2s', flexShrink: 0
          }}>{p.label}</button>
        ))}
      </div>

      {/* Input */}
      <div style={{
        padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.08)',
        background: 'rgba(0,0,0,0.2)', backdropFilter: 'blur(10px)',
        display: 'flex', gap: '10px', alignItems: 'flex-end', flexShrink: 0
      }}>
        <textarea
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Ask anything about JAMB..."
          rows={1}
          style={{
            flex: 1, background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.15)', borderRadius: '16px',
            padding: '12px 16px', color: '#fff', fontSize: '14px',
            outline: 'none', resize: 'none', fontFamily: 'inherit', lineHeight: '1.5',
            maxHeight: '120px', overflowY: 'auto'
          }}
        />
        <button
          onClick={() => sendMessage()}
          disabled={loading || !input.trim()}
          style={{
            background: loading || !input.trim() ? 'rgba(102,126,234,0.3)' : 'linear-gradient(135deg, #667eea, #764ba2)',
            border: 'none', borderRadius: '50%', width: '48px', height: '48px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
            flexShrink: 0, fontSize: '18px', transition: 'all 0.2s',
            boxShadow: loading || !input.trim() ? 'none' : '0 4px 15px rgba(102,126,234,0.5)'
          }}
        >➤</button>
      </div>

      <style>{`
        @keyframes bounce { 0%,80%,100%{transform:scale(0)} 40%{transform:scale(1)} }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 4px; }
      `}</style>
    </div>
  )
}
