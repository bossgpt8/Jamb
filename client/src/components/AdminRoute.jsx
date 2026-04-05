import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth } from '../firebase'
import { onAuthStateChanged } from 'firebase/auth'

export default function AdminRoute({ children }) {
  const navigate = useNavigate()
  const [status, setStatus] = useState('loading') // 'loading' | 'allowed' | 'denied'

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (!u) { navigate('/', { replace: true }); return }
      try {
        const idToken = await u.getIdToken()
        const res = await fetch('/api/get-user-profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken })
        })
        const data = await res.json()
        if (data.success && data.profile?.role === 'admin') {
          setStatus('allowed')
        } else {
          setStatus('denied')
          navigate('/', { replace: true })
        }
      } catch {
        setStatus('denied')
        navigate('/', { replace: true })
      }
    })
    return () => unsubscribe()
  }, [navigate])

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    )
  }

  if (status !== 'allowed') return null

  return children
}
