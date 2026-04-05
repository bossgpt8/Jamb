import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth } from '../firebase'
import { onAuthStateChanged } from 'firebase/auth'

const ADMIN_UIDS = ['rrn9hbDxmaNmjiu2GhxGi6yyS8v2']

export default function AdminNotifications() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)

  // form state
  const [mode, setMode] = useState('broadcast') // 'broadcast' | 'send'
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [targetUserId, setTargetUserId] = useState('')
  const [deepLink, setDeepLink] = useState('')

  // feedback state
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState(null) // { ok: bool, message: string }

  useEffect(() => {
    document.title = 'Admin – Send Notifications | JambGenius'
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (!u) { navigate('/'); return }
      if (!ADMIN_UIDS.includes(u.uid)) { navigate('/'); return }
      setUser(u)
      setIsAdmin(true)
    })
    return () => unsubscribe()
  }, [navigate])

  const handleSend = async (e) => {
    e.preventDefault()
    if (!title.trim() || !body.trim()) return
    if (mode === 'send' && !targetUserId.trim()) return

    setSending(true)
    setResult(null)
    try {
      const idToken = await auth.currentUser.getIdToken()
      const payload = {
        action: mode,
        idToken,
        title: title.trim(),
        body: body.trim(),
        data: deepLink.trim() ? { url: deepLink.trim() } : {},
        ...(mode === 'send' && { userId: targetUserId.trim() }),
      }
      const res = await fetch('/api/notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        const sent = data.sent ?? 1
        setResult({ ok: true, message: mode === 'broadcast' ? `✅ Sent to ${sent} device${sent !== 1 ? 's' : ''}` : '✅ Notification sent to user' })
        setTitle(''); setBody(''); setTargetUserId(''); setDeepLink('')
      } else {
        setResult({ ok: false, message: `❌ ${data.error || 'Something went wrong'}` })
      }
    } catch (err) {
      setResult({ ok: false, message: `❌ Network error: ${err.message}` })
    }
    setSending(false)
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div className="bg-gray-50 font-sans min-h-screen">
      {/* Nav */}
      <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <button onClick={() => navigate('/')} className="flex items-center">
              <i className="fas fa-graduation-cap text-2xl text-blue-600 mr-2"></i>
              <span className="text-xl font-bold text-gray-900">JambGenius</span>
              <span className="ml-2 text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-semibold">ADMIN</span>
            </button>
            <button onClick={() => navigate('/')} className="text-gray-600 hover:text-blue-600">
              <i className="fas fa-arrow-left mr-2"></i>Back
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <i className="fas fa-bell text-blue-600 text-xl"></i>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Send Notification</h1>
              <p className="text-sm text-gray-500">Push alerts to app users</p>
            </div>
          </div>

          {/* Mode toggle */}
          <div className="flex gap-2 mb-6 p-1 bg-gray-100 rounded-xl">
            {[
              { value: 'broadcast', label: 'Broadcast All', icon: 'fa-bullhorn' },
              { value: 'send', label: 'Single User', icon: 'fa-user' },
            ].map(({ value, label, icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setMode(value)}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                  mode === value ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <i className={`fas ${icon}`}></i>{label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSend} className="space-y-4">
            {/* Target user (send mode only) */}
            {mode === 'send' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  User ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={targetUserId}
                  onChange={(e) => setTargetUserId(e.target.value)}
                  placeholder="Firebase UID of the user"
                  required
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
            )}

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. New practice questions added!"
                maxLength={65}
                required
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
              <p className="text-xs text-gray-400 mt-1">{title.length}/65</p>
            </div>

            {/* Body */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Message <span className="text-red-500">*</span>
              </label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="e.g. 5 new JAMB Chemistry questions are ready. Come test yourself!"
                maxLength={178}
                required
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
              />
              <p className="text-xs text-gray-400 mt-1">{body.length}/178</p>
            </div>

            {/* Deep link (optional) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Deep Link URL <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="url"
                value={deepLink}
                onChange={(e) => setDeepLink(e.target.value)}
                placeholder="https://jambgenius.app/practice"
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
              <p className="text-xs text-gray-400 mt-1">If set, tapping the notification opens this page in the app.</p>
            </div>

            {/* Result feedback */}
            {result && (
              <div className={`rounded-lg px-4 py-3 text-sm font-medium ${result.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {result.message}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={sending || !title.trim() || !body.trim() || (mode === 'send' && !targetUserId.trim())}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {sending ? (
                <><div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>Sending…</>
              ) : (
                <><i className={`fas ${mode === 'broadcast' ? 'fa-bullhorn' : 'fa-paper-plane'}`}></i>
                {mode === 'broadcast' ? 'Broadcast to All Users' : 'Send to User'}</>
              )}
            </button>
          </form>
        </div>

        {/* Info card */}
        <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex gap-3">
            <i className="fas fa-info-circle text-amber-500 mt-0.5"></i>
            <div className="text-sm text-amber-800">
              <p className="font-medium mb-1">How notifications work</p>
              <ul className="space-y-1 text-amber-700">
                <li>• <strong>Broadcast</strong> — sends to every user who has installed the app and allowed notifications</li>
                <li>• <strong>Single User</strong> — sends to one specific user by their Firebase UID</li>
                <li>• Notifications are delivered via <strong>Expo Push</strong> to the JambGenius mobile app</li>
                <li>• Users must have opened the app at least once and granted notification permission</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
