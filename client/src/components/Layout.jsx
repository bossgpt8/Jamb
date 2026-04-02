import { Outlet } from 'react-router-dom'
import BottomNav from './BottomNav'
import SignInModal from './SignInModal'
import Toast from './Toast'

export default function Layout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Toast />
      <SignInModal />
      <div className="has-bottom-nav">
        <Outlet />
      </div>
      <BottomNav />
    </div>
  )
}
