import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function AdminRoute({ children }) {
  const navigate = useNavigate()
  const { user, isAdmin, profileLoading } = useAuth()

  useEffect(() => {
    // Wait until both auth and profile have finished loading
    if (user === undefined || profileLoading) return
    if (!user || !isAdmin) {
      navigate('/', { replace: true })
    }
  }, [user, isAdmin, profileLoading, navigate])

  if (user === undefined || profileLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Checking permissions...</p>
        </div>
      </div>
    )
  }

  if (!user || !isAdmin) return null

  return children
}
