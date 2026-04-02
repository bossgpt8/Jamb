import { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '../firebase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined)
  const [showSignIn, setShowSignIn] = useState(false)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u))
    return () => unsubscribe()
  }, [])

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
    <AuthContext.Provider value={{ user, showSignIn, setShowSignIn, toast, showToast, requireAuth }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
