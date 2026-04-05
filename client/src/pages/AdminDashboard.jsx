import { useNavigate } from 'react-router-dom'

const sections = [
  { path: '/admin/users',         icon: 'fa-users',         label: 'User Management',      desc: 'List, search, activate/deactivate, role changes, delete users' },
  { path: '/admin/content',       icon: 'fa-book-open',     label: 'Content Management',   desc: 'CRUD for questions, subjects and topics' },
  { path: '/admin/analytics',     icon: 'fa-chart-bar',     label: 'Analytics',            desc: 'User growth, exam attempts, pass/fail rates' },
  { path: '/admin/payments',      icon: 'fa-credit-card',   label: 'Payments',             desc: 'Transaction history and manual credit management' },
  { path: '/admin/notifications', icon: 'fa-bell',          label: 'Notifications',        desc: 'Broadcast and single-user push notifications' },
  { path: '/admin/support',       icon: 'fa-headset',       label: 'Support & Feedback',   desc: 'View and resolve user-submitted tickets' },
  { path: '/admin/config',        icon: 'fa-sliders-h',     label: 'App Config',           desc: 'Maintenance mode, feature flags, per-tier controls' },
]

export default function AdminDashboard() {
  const navigate = useNavigate()

  return (
    <div className="bg-gray-50 font-sans min-h-screen">
      <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <button onClick={() => navigate('/')} className="flex items-center">
              <i className="fas fa-graduation-cap text-2xl text-blue-600 mr-2"></i>
              <span className="text-xl font-bold text-gray-900">JambGenius</span>
              <span className="ml-2 text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-semibold">ADMIN</span>
            </button>
            <button onClick={() => navigate('/')} className="text-gray-600 hover:text-blue-600 text-sm flex items-center gap-1">
              <i className="fas fa-arrow-left"></i>Back to App
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-500 mt-1">Manage all platform operations from one place.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sections.map(({ path, icon, label, desc }) => (
            <button
              key={path}
              onClick={() => navigate(path)}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 text-left hover:shadow-md hover:border-blue-200 transition-all group"
            >
              <div className="w-11 h-11 bg-blue-50 rounded-xl flex items-center justify-center mb-3 group-hover:bg-blue-100 transition-colors">
                <i className={`fas ${icon} text-blue-600 text-lg`}></i>
              </div>
              <h2 className="font-semibold text-gray-900 mb-1">{label}</h2>
              <p className="text-sm text-gray-500">{desc}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
