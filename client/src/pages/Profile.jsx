import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth } from '../firebase'
import { onAuthStateChanged, signOut, updateProfile } from 'firebase/auth'
import { useAuth } from '../context/AuthContext'

export default function Profile() {
  const navigate = useNavigate()
  const { profile: ctxProfile, isAdmin } = useAuth()
  const [user, setUser] = useState(null)
  const [editing, setEditing] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [saving, setSaving] = useState(false)
  const [credits, setCredits] = useState(0)

  useEffect(() => {
    // Use credits from centralised profile when available
    if (ctxProfile?.examCredits != null) setCredits(ctxProfile.examCredits)
  }, [ctxProfile])

  useEffect(() => {
    document.title = 'My Profile - JambGenius'
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u)
        setDisplayName(u.displayName || '')
        try {
          const idToken = await u.getIdToken()
          const res = await fetch('/api/get-credits', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken }) })
          const data = await res.json()
          if (data.success) setCredits(data.credits || 0)
        } catch (e) {}
      } else {
        navigate('/')
      }
    })
    return () => unsubscribe()
  }, [navigate])

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateProfile(auth.currentUser, { displayName })
      setUser({ ...user, displayName })
      setEditing(false)
    } catch (e) { console.error(e) }
    setSaving(false)
  }

  const handleSignOut = async () => {
    if (window.confirm('Are you sure you want to sign out?')) {
      await signOut(auth)
      navigate('/')
    }
  }

  const sessions = JSON.parse(localStorage.getItem('jambgenius_sessions') || '[]')
  const bookmarks = JSON.parse(localStorage.getItem('jambgenius_bookmarks') || '[]')
  const totalAnswered = sessions.reduce((s, r) => s + (r.answered || 0), 0)
  const avgAcc = totalAnswered > 0 ? Math.round((sessions.reduce((s, r) => s + (r.correct || 0), 0) / totalAnswered) * 100) : 0

  if (!user) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
        <p className="text-gray-600">Loading profile...</p>
      </div>
    </div>
  )

  const initials = (user.displayName || user.email || 'U').charAt(0).toUpperCase()
  const avatarUrl = user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || user.email)}&background=2563eb&color=fff&size=200`

  return (
    <div className="bg-gray-50 font-sans min-h-screen page-fade-in">
      <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <button onClick={() => navigate('/')} className="flex items-center">
              <i className="fas fa-graduation-cap text-2xl text-blue-600 mr-2"></i>
              <span className="text-xl font-bold text-gray-900">JambGenius </span>
            </button>
            <button onClick={() => navigate('/')} className="text-gray-600 hover:text-blue-600">
              <i className="fas fa-arrow-left mr-2"></i>Home
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Profile Card */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-8">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
              <img src={avatarUrl} alt="Avatar" className="w-24 h-24 rounded-full border-4 border-white shadow-lg" />
              <div className="text-white text-center sm:text-left">
                <h1 className="text-2xl font-bold">{user.displayName || 'JAMB Student'}</h1>
                <p className="text-blue-100">{user.email}</p>
                <div className="mt-3 flex flex-wrap gap-2 justify-center sm:justify-start">
                  <span className="bg-white/20 text-white text-xs px-3 py-1 rounded-full">
                    <i className="fas fa-calendar mr-1"></i>Member since {new Date(user.metadata?.creationTime || Date.now()).getFullYear()}
                  </span>
                  {credits > 0 && (
                    <span className="bg-green-500 text-white text-xs px-3 py-1 rounded-full">
                      <i className="fas fa-ticket-alt mr-1"></i>{credits} Exam Credit{credits > 1 ? 's' : ''}
                    </span>
                  )}
                  {isAdmin && (
                    <span className="bg-purple-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                      <i className="fas fa-user-shield mr-1"></i>ADMIN
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="p-6">
            {editing ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
                  <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="flex gap-3">
                  <button onClick={handleSave} disabled={saving}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium">
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button onClick={() => setEditing(false)} className="border border-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-50">Cancel</button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-3">
                <button onClick={() => setEditing(true)} className="flex items-center gap-2 bg-blue-50 text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-100 transition-colors font-medium">
                  <i className="fas fa-edit"></i>Edit Profile
                </button>
                <button onClick={handleSignOut} className="flex items-center gap-2 bg-red-50 text-red-600 px-4 py-2 rounded-lg hover:bg-red-100 transition-colors font-medium">
                  <i className="fas fa-sign-out-alt"></i>Sign Out
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total Sessions', value: sessions.length, icon: 'fa-book', color: 'blue' },
            { label: 'Avg Accuracy', value: `${avgAcc}%`, icon: 'fa-bullseye', color: 'green' },
            { label: 'Bookmarks', value: bookmarks.length, icon: 'fa-bookmark', color: 'yellow' },
            { label: 'Exam Credits', value: credits, icon: 'fa-ticket-alt', color: 'purple' },
          ].map((s, i) => (
            <div key={i} className="bg-white rounded-xl p-4 shadow-sm text-center">
              <div className={`w-10 h-10 bg-${s.color}-100 rounded-lg flex items-center justify-center mx-auto mb-2`}>
                <i className={`fas ${s.icon} text-${s.color}-600`}></i>
              </div>
              <div className="text-2xl font-bold text-gray-900">{s.value}</div>
              <div className="text-xs text-gray-500">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Quick Links */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { label: 'View Analytics', icon: 'fa-chart-bar', route: '/analytics', color: 'blue' },
              { label: 'My Bookmarks', icon: 'fa-bookmark', route: '/analytics', color: 'yellow' },
              { label: 'Take Practice', icon: 'fa-book-open', route: '/practice', color: 'green' },
              { label: 'Mock Exam', icon: 'fa-trophy', route: '/exam', color: 'orange' },
              { label: 'Daily Challenge', icon: 'fa-fire', route: '/daily-challenge', color: 'red' },
              { label: 'Buy Credits', icon: 'fa-shopping-cart', route: '/exam/payment', color: 'purple' },
            ].map((item, i) => (
              <button key={i} onClick={() => navigate(item.route)}
                className={`flex items-center gap-2 p-3 bg-${item.color}-50 rounded-xl hover:bg-${item.color}-100 transition-colors text-${item.color}-700 font-medium text-sm`}>
                <i className={`fas ${item.icon}`}></i>{item.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
