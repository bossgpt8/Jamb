import { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '../firebase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined)
  const [profile, setProfile] = useState(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [showSignIn, setShowSignIn] = useState(false)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u)
      if (u) {
        setProfileLoading(true)
        try {
          const idToken = await u.getIdToken()
          // Ensure user profile exists in DB and email is stored for admin detection
          try {
            const upsertRes = await fetch('/api/upsert-user', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                idToken,
                email: u.email || '',
                displayName: u.displayName || u.email?.split('@')[0] || '',
                photoURL: u.photoURL || ''
              })
            })
            if (!upsertRes.ok) console.warn('upsert-user failed:', upsertRes.status)
          } catch (upsertErr) {
            console.warn('upsert-user error:', upsertErr)
          }
          const res = await fetch('/api/get-user-profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken })
          })
          const data = await res.json()
          if (data.success) setProfile(data.profile)
        } catch {}
        setProfileLoading(false)
      } else {
        setProfile(null)
        setProfileLoading(false)
      }
    })
    return () => unsubscribe()
  }, [])

  const isAdmin = profile?.role === 'admin'

  const showToast = (message, type = 'info') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }

  const requireAuth = () => {
    if (!user) {
      showToast('Please sign in to access this feature', 'warning')
      setShowSignIn(true)
      return false
    }
    return true
  }

  return (
    <AuthContext.Provider value={{ user, profile, isAdmin, profileLoading, showSignIn, setShowSignIn, toast, showToast, requireAuth }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
