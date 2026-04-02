import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children }) {
  const { user, requireAuth } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (user === null) {
      requireAuth()
      navigate('/', { replace: true })
    }
  }, [user, navigate, requireAuth])

  if (user === undefined) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <i className="fas fa-spinner fa-spin text-blue-600 text-3xl mb-3"></i>
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    )
  }

  if (user === null) return null

  return children
}
