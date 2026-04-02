import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { signOut } from 'firebase/auth'
import { auth } from '../firebase'

export default function BottomNav() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, requireAuth, setShowSignIn } = useAuth()
  const path = location.pathname

  const isActive = (route) => {
    if (route === '/') return path === '/'
    return path.startsWith(route)
  }

  const tabs = [
    { route: '/', icon: 'fa-home', label: 'Home', public: true },
    { route: '/practice', icon: 'fa-book-open', label: 'Practice' },
    { route: '/exam', icon: 'fa-trophy', label: 'Exam', examStyle: true },
    { route: '/community', icon: 'fa-comments', label: 'Community' },
    { route: '/more', icon: 'fa-ellipsis-h', label: 'More' },
  ]

  const handleNav = (tab) => {
    if (!tab.public && !user) {
      requireAuth()
      return
    }
    navigate(tab.route)
  }

  return (
    <nav className="bottom-nav">
      {tabs.map((tab) => {
        const active = isActive(tab.route)
        let itemClass = 'bottom-nav-item'
        if (active) {
          itemClass += tab.examStyle ? ' exam-active' : ' active'
        }
        return (
          <button
            key={tab.route}
            className={itemClass}
            onClick={() => handleNav(tab)}
          >
            <i className={`fas ${tab.icon} nav-icon`}></i>
            <span className="nav-label">{tab.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
