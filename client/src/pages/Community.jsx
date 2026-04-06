import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import UserChip from '../components/UserChip'

const NAME_KEY = 'jg_chat_display_name'

const BOSS_SUGGESTIONS = [
  '@boss explain this topic: ',
  '@boss what is the answer to ',
  '@boss give me tips for ',
  '@boss help me understand ',
  '@boss what year did ',
]

// Compress an image File to a base64 JPEG string
const compressImage = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.src = e.target.result
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let { width, height } = img
        if (width > 800 || height > 600) {
          const ratio = Math.min(800 / width, 600 / height)
          width = Math.round(width * ratio)
          height = Math.round(height * ratio)
        }
        canvas.width = width
        canvas.height = height
        canvas.getContext('2d').drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL('image/jpeg', 0.7))
      }
      img.onerror = reject
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })

// Convert a Blob to a base64 data URL
const blobToBase64 = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })

// Map a raw DB document to the shape used in state
const mapDbMessage = (m) => ({
  id: m._id || m.id || String(Date.now() + Math.random()),
  sender: m.isAdmin ? 'JambGenius Boss' : (m.displayName || 'Student'),
  text: m.text || '',
  imageData: m.imageData,
  voiceData: m.voiceData,
  type: m.type || 'text',
  isBot: !!m.isAdmin,
  time: m.createdAt
    ? new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '--:--',
})

export default function Community() {
  const navigate = useNavigate()
  const { user, showToast, isAdmin } = useAuth()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [chatName, setChatName] = useState('')
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingSeconds, setRecordingSeconds] = useState(0)

  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const fileInputRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const recordingTimerRef = useRef(null)

  const fmtTime = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const getDisplayName = () => chatName || user?.displayName || user?.email?.split('@')[0] || 'Student'
  const fmtRecording = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  // ── Fetch messages from backend ───────────────────────────────────────────
  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch('/api/community-messages')
      const data = await res.json()
      if (data.success && Array.isArray(data.messages)) {
        setMessages(data.messages.map(mapDbMessage))
      }
    } catch {
      // keep current state on network error
    }
  }, [])

  useEffect(() => {
    document.title = 'Student Chatroom - JambGenius'
    const savedName = localStorage.getItem(NAME_KEY)
    if (savedName) setChatName(savedName)
    fetchMessages()
    const interval = setInterval(fetchMessages, 4000)
    return () => clearInterval(interval)
  }, [fetchMessages])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ── Display name ──────────────────────────────────────────────────────────
  const saveName = () => {
    const trimmed = nameInput.trim()
    if (!trimmed) { showToast('Please enter a name', 'warning'); return }
    setChatName(trimmed)
    localStorage.setItem(NAME_KEY, trimmed)
    setEditingName(false)
    showToast('Chat name updated!', 'success')
  }

  // ── @boss suggestions ─────────────────────────────────────────────────────
  const handleInputChange = (e) => {
    const val = e.target.value
    setInput(val)
    setShowSuggestions(
      val.endsWith('@') || val.endsWith('@b') || val.endsWith('@bo') ||
      val.endsWith('@bos') || val === '@boss'
    )
  }

  const applySuggestion = (suggestion) => {
    setInput(suggestion)
    setShowSuggestions(false)
    inputRef.current?.focus()
  }

  // ── POST helper ───────────────────────────────────────────────────────────
  const postToBackend = async (payload) => {
    try {
      if (user) payload.idToken = await user.getIdToken()
      const res = await fetch('/api/community-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: getDisplayName(), userEmail: user?.email || '', ...payload }),
      })
      return await res.json()
    } catch {
      return { success: false }
    }
  }

  // ── Send text ─────────────────────────────────────────────────────────────
  const sendMessage = async (overrideText) => {
    const text = (overrideText !== undefined ? overrideText : input).trim()
    if (!text || sending) return
    setInput('')
    setShowSuggestions(false)

    // Optimistic UI
    setMessages(prev => [...prev, {
      id: Date.now(), sender: getDisplayName(), text, type: 'text', isBot: false, time: fmtTime()
    }])

    await postToBackend({ type: 'text', text })

    const shouldCallAI = text.toLowerCase().includes('@boss') || (text.includes('?') && text.length > 5)
    if (shouldCallAI) {
      setSending(true)
      try {
        const aiRes = await fetch('/api/gemini', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'chat', question: text.replace(/@boss/gi, '').trim() || text }),
        })
        const aiData = await aiRes.json()
        const answer = aiData.answer || 'I could not answer that right now.'
        await fetch('/api/community-messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'text', text: answer,
            displayName: 'JambGenius Boss', userEmail: 'boss@jambgenius.com', isBot: true,
          }),
        })
        await fetchMessages()
      } catch {
        showToast('Could not reach AI Boss', 'error')
      } finally {
        setSending(false)
      }
    }
  }

  // ── Image upload ──────────────────────────────────────────────────────────
  const handleImageSelect = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!user) { showToast('Sign in to send images', 'error'); return }
    if (!file.type.startsWith('image/')) { showToast('Please select an image file', 'error'); return }
    if (file.size > 5 * 1024 * 1024) { showToast('Image must be under 5 MB', 'error'); return }
    setSending(true)
    try {
      const base64 = await compressImage(file)
      setMessages(prev => [...prev, {
        id: Date.now(), sender: getDisplayName(), type: 'image',
        imageData: base64, imageName: file.name, isBot: false, time: fmtTime()
      }])
      const result = await postToBackend({ type: 'image', imageData: base64, imageName: file.name })
      if (!result.success) showToast('Failed to send image', 'error')
      await fetchMessages()
    } catch {
      showToast('Failed to process image', 'error')
    } finally {
      setSending(false)
    }
  }

  // ── Voice recording ───────────────────────────────────────────────────────
  const startRecording = async () => {
    if (isRecording) return
    if (!user) { showToast('Sign in to send voice notes', 'error'); return }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      mediaRecorderRef.current = recorder
      audioChunksRef.current = []
      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data) }
      recorder.onstop = handleRecordingStop
      recorder.start()
      setIsRecording(true)
      setRecordingSeconds(0)
      recordingTimerRef.current = setInterval(() => setRecordingSeconds(s => s + 1), 1000)
    } catch {
      showToast('Cannot access microphone. Check permissions.', 'error')
    }
  }

  const stopRecording = () => {
    if (!isRecording || !mediaRecorderRef.current) return
    mediaRecorderRef.current.stop()
    mediaRecorderRef.current.stream?.getTracks().forEach(t => t.stop())
    clearInterval(recordingTimerRef.current)
    setIsRecording(false)
    setRecordingSeconds(0)
  }

  const cancelRecording = () => {
    if (!mediaRecorderRef.current) return
    mediaRecorderRef.current.onstop = null
    if (mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
      mediaRecorderRef.current.stream?.getTracks().forEach(t => t.stop())
    }
    clearInterval(recordingTimerRef.current)
    audioChunksRef.current = []
    setIsRecording(false)
    setRecordingSeconds(0)
  }

  const handleRecordingStop = async () => {
    if (audioChunksRef.current.length === 0) return
    const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
    audioChunksRef.current = []
    setSending(true)
    try {
      const base64 = await blobToBase64(blob)
      setMessages(prev => [...prev, {
        id: Date.now(), sender: getDisplayName(), type: 'voice',
        voiceData: base64, isBot: false, time: fmtTime()
      }])
      const result = await postToBackend({ type: 'voice', voiceData: base64 })
      if (!result.success) showToast('Failed to send voice note', 'error')
      await fetchMessages()
    } catch {
      showToast('Failed to send voice note', 'error')
    } finally {
      setSending(false)
    }
  }

  // ── Admin clear ───────────────────────────────────────────────────────────
  const clearChat = async () => {
    if (!isAdmin) { showToast('Only admins can clear the chat', 'error'); return }
    try {
      const idToken = await user.getIdToken()
      const res = await fetch('/api/community-clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      })
      const data = await res.json()
      if (data.success) { showToast('Chat cleared', 'success'); await fetchMessages() }
      else showToast('Failed to clear chat', 'error')
    } catch {
      showToast('Failed to clear chat', 'error')
    }
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
    if (e.key === 'Escape') setShowSuggestions(false)
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
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 text-white flex items-center justify-between flex-shrink-0">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <i className="fas fa-users text-lg"></i>
              </div>
              <div>
                <h2 className="font-bold text-lg">JambGenius Community</h2>
                <p className="text-blue-100 text-xs">Type @boss for AI tutor · Images &amp; Voice notes supported</p>
              </div>
            </div>
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
                  <div className={`max-w-[75%] flex flex-col gap-0.5 ${isMe ? 'items-end' : 'items-start'}`}>
                    {!isMe && <span className="text-xs text-gray-500 ml-1">{msg.sender}</span>}
                    <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${isMe ? 'bg-blue-600 text-white rounded-br-sm' : msg.isBot ? 'bg-indigo-50 text-gray-800 border border-indigo-100 rounded-bl-sm' : 'bg-gray-100 text-gray-800 rounded-bl-sm'}`}>
                      {msg.type === 'image' && msg.imageData ? (
                        <img
                          src={msg.imageData}
                          alt={msg.imageName || 'image'}
                          className="max-w-full rounded-xl cursor-pointer"
                          style={{ maxHeight: '200px', maxWidth: '240px' }}
                          onClick={() => window.open(msg.imageData, '_blank')}
                        />
                      ) : msg.type === 'voice' && msg.voiceData ? (
                        <audio controls src={msg.voiceData} style={{ minWidth: '180px', maxWidth: '260px' }} />
                      ) : (
                        msg.text
                      )}
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
                    {[0, 1, 2].map(d => <span key={d} className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: `${d * 150}ms` }}></span>)}
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* @boss suggestions */}
          {showSuggestions && (
            <div className="border-t border-gray-100 bg-white flex-shrink-0">
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

          {/* Recording indicator */}
          {isRecording && (
            <div className="border-t border-red-100 bg-red-50 px-4 py-2 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                <span className="text-sm text-red-600 font-medium">Recording {fmtRecording(recordingSeconds)}</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={cancelRecording} className="text-xs text-gray-500 hover:text-red-600 px-2 py-1 rounded-lg hover:bg-red-100 transition-colors">
                  <i className="fas fa-times mr-1"></i>Cancel
                </button>
                <button onClick={stopRecording} className="text-xs text-white bg-red-500 hover:bg-red-600 px-3 py-1 rounded-lg font-medium transition-colors">
                  <i className="fas fa-stop mr-1"></i>Send
                </button>
              </div>
            </div>
          )}

          {/* Input area */}
          <div className="p-3 border-t border-gray-100 bg-gray-50 flex-shrink-0">
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
            <div className="flex gap-2 items-end">
              {/* Image attach */}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={sending || isRecording}
                title="Send image"
                className="flex-shrink-0 w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:text-blue-600 hover:border-blue-300 transition-colors disabled:opacity-40"
              >
                <i className="fas fa-image text-sm"></i>
              </button>

              {/* Text input */}
              <div className="flex-1">
                <input
                  ref={inputRef}
                  type="text" value={input}
                  onChange={handleInputChange}
                  onKeyDown={handleKey}
                  disabled={isRecording}
                  placeholder={isRecording ? 'Recording…' : `Message as ${getDisplayName()}… (type @ for AI)`}
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  maxLength={500}
                />
              </div>

              {/* Mic button */}
              <button
                onClick={isRecording ? stopRecording : startRecording}
                disabled={sending && !isRecording}
                title={isRecording ? 'Stop & send voice note' : 'Record voice note'}
                className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-colors border ${
                  isRecording
                    ? 'bg-red-500 border-red-500 text-white hover:bg-red-600 animate-pulse'
                    : 'bg-white border-gray-200 text-gray-500 hover:text-red-500 hover:border-red-300'
                } disabled:opacity-40`}
              >
                <i className={`fas fa-microphone${isRecording ? '-slash' : ''} text-sm`}></i>
              </button>

              {/* Send button */}
              <button
                onClick={() => sendMessage()}
                disabled={!input.trim() || sending || isRecording}
                className="flex-shrink-0 bg-blue-600 text-white w-11 h-11 rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center disabled:opacity-40"
              >
                <i className="fas fa-paper-plane text-sm"></i>
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1.5 text-center">
              Type <strong>@boss</strong> for AI tutor &nbsp;·&nbsp;
              <i className="fas fa-image text-xs"></i> for images &nbsp;·&nbsp;
              <i className="fas fa-microphone text-xs"></i> tap to record voice notes
            </p>
          </div>

        </div>
      </div>
    </div>
  )
}
