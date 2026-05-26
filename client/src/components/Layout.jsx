import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import BottomNav from './BottomNav'
import SignInModal from './SignInModal'
import Toast from './Toast'
import { useAuth } from '../context/AuthContext'

export default function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, requireAuth } = useAuth()

  const path = location.pathname.toLowerCase()
  const showAiLauncher =
    !path.startsWith('/practice') &&
    !path.startsWith('/exam') &&
    !path.startsWith('/practice/exam') &&
    !path.startsWith('/ai-tutor')

  const openAiTutor = () => {
    if (!user && !requireAuth()) return
    navigate('/ai-tutor')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Toast />
      <SignInModal />
      <div className="has-bottom-nav">
        <Outlet />
      </div>
      {showAiLauncher && (
        <button
          type="button"
          onClick={openAiTutor}
          title="Open AI Tutor"
          aria-label="Open AI Tutor"
          className="fixed left-4 z-[1100] group"
          style={{ bottom: 'calc(var(--bottom-nav-height) + 16px)' }}
        >
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-500 via-violet-500 to-blue-500 opacity-20 animate-pulse"></div>
            <div className="relative w-14 h-14 rounded-full bg-gradient-to-br from-purple-600 via-violet-600 to-blue-600 shadow-xl flex items-center justify-center text-white ring-4 ring-white/90 transition-transform duration-300 group-hover:scale-110">
              <i className="fas fa-robot text-xl"></i>
            </div>
            <div className="absolute left-16 bottom-1 whitespace-nowrap rounded-full bg-gray-900/95 px-3 py-1.5 text-xs font-semibold text-white opacity-0 shadow-lg transition-opacity duration-200 group-hover:opacity-100 pointer-events-none">
              AI Tutor
            </div>
          </div>
        </button>
      )}
      <BottomNav />
    </div>
  )
}
