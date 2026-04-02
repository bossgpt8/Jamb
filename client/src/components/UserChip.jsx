import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { auth } from '../firebase'
import { useAuth } from '../context/AuthContext'

export default function UserChip() {
  const { user, setShowSignIn } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  if (!user) {
    return (
      <button onClick={() => setShowSignIn(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm">
        Sign In
      </button>
    )
  }

  const displayName = user.displayName || user.email?.split('@')[0] || ''
  const avatarUrl = user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=2563eb&color=fff`

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)} className="flex items-center space-x-2 hover:bg-gray-100 rounded-lg px-2 py-1 transition-colors">
        <img src={avatarUrl} alt={displayName} className="w-8 h-8 rounded-full object-cover" />
        <span className="text-gray-700 font-medium text-sm hidden sm:inline max-w-[100px] truncate">{displayName}</span>
      </button>
      {open && (
        <div className="absolute right-0 top-11 bg-white rounded-xl shadow-xl border border-gray-200 w-56 z-50">
          <div className="p-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <img src={avatarUrl} alt={displayName} className="w-9 h-9 rounded-full object-cover" />
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 text-sm truncate">{displayName}</p>
                <p className="text-xs text-gray-500 truncate">{user.email}</p>
              </div>
            </div>
          </div>
          <div className="py-1">
            <button onClick={() => { setOpen(false); navigate('/profile') }} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-gray-700 w-full text-sm"><i className="fas fa-user w-4 text-center text-gray-400"></i>My Profile</button>
            <button onClick={() => { setOpen(false); navigate('/analytics') }} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-gray-700 w-full text-sm"><i className="fas fa-chart-line w-4 text-center text-gray-400"></i>Analytics</button>
            <button onClick={() => { setOpen(false); navigate('/notifications') }} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-gray-700 w-full text-sm"><i className="fas fa-bell w-4 text-center text-gray-400"></i>Notifications</button>
            <hr className="my-1" />
            <button onClick={() => signOut(auth)} className="flex items-center gap-2 px-3 py-2 hover:bg-red-50 text-red-600 w-full text-sm"><i className="fas fa-sign-out-alt w-4 text-center"></i>Sign Out</button>
          </div>
        </div>
      )}
    </div>
  )
}
