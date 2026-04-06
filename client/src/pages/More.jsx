import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function More() {
  const navigate = useNavigate()
  const { isAdmin } = useAuth()

  const moreItems = [
    { route: '/ai-tutor', icon: 'fa-robot', color: 'purple', bg: 'bg-purple-50', iconBg: 'bg-purple-100', iconColor: 'text-purple-600', title: 'AI Tutor', desc: 'Get instant help from our AI-powered tutor' },
    { route: '/analytics', icon: 'fa-chart-bar', color: 'blue', bg: 'bg-blue-50', iconBg: 'bg-blue-100', iconColor: 'text-blue-600', title: 'Analytics', desc: 'Track your performance and progress' },
    { route: '/profile', icon: 'fa-user-circle', color: 'indigo', bg: 'bg-indigo-50', iconBg: 'bg-indigo-100', iconColor: 'text-indigo-600', title: 'My Profile', desc: 'Manage your account and settings' },
    { route: '/daily-challenge', icon: 'fa-fire', color: 'orange', bg: 'bg-orange-50', iconBg: 'bg-orange-100', iconColor: 'text-orange-600', title: 'Daily Challenge', desc: 'Build your study streak daily' },
    { route: '/study-tips', icon: 'fa-lightbulb', color: 'yellow', bg: 'bg-yellow-50', iconBg: 'bg-yellow-100', iconColor: 'text-yellow-600', title: 'Study Tips', desc: 'Expert strategies for JAMB success' },
    { route: '/syllabus', icon: 'fa-list-alt', color: 'green', bg: 'bg-green-50', iconBg: 'bg-green-100', iconColor: 'text-green-600', title: 'JAMB Syllabus', desc: 'Complete official JAMB syllabus' },
    { route: '/notifications', icon: 'fa-bell', color: 'pink', bg: 'bg-pink-50', iconBg: 'bg-pink-100', iconColor: 'text-pink-600', title: 'Notifications', desc: 'Manage your alerts and reminders' },
    { route: '/sample-questions', icon: 'fa-question-circle', color: 'teal', bg: 'bg-teal-50', iconBg: 'bg-teal-100', iconColor: 'text-teal-600', title: 'Sample Questions', desc: 'Browse JAMB past questions' },
    { route: '/help', icon: 'fa-life-ring', color: 'cyan', bg: 'bg-cyan-50', iconBg: 'bg-cyan-100', iconColor: 'text-cyan-600', title: 'Help Center', desc: 'Find answers to common questions' },
    { route: '/contact', icon: 'fa-envelope', color: 'violet', bg: 'bg-violet-50', iconBg: 'bg-violet-100', iconColor: 'text-violet-600', title: 'Contact Us', desc: 'Get in touch with our support team' },
    { route: '/privacy', icon: 'fa-shield-alt', color: 'gray', bg: 'bg-gray-50', iconBg: 'bg-gray-100', iconColor: 'text-gray-600', title: 'Privacy Policy', desc: 'How we protect your data' },
    { route: '/terms', icon: 'fa-file-contract', color: 'slate', bg: 'bg-slate-50', iconBg: 'bg-slate-100', iconColor: 'text-slate-600', title: 'Terms of Service', desc: 'Our terms and conditions' },
    ...(isAdmin ? [{ route: '/admin', icon: 'fa-user-shield', color: 'red', bg: 'bg-red-50', iconBg: 'bg-red-100', iconColor: 'text-red-600', title: 'Admin Panel', desc: 'Manage users, content, payments and more' }] : []),
  ]

  return (
    <div className="bg-gray-50 font-sans min-h-screen page-fade-in">
      {/* Header */}
      <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <i className="fas fa-graduation-cap text-2xl text-blue-600 mr-2"></i>
            <span className="text-xl font-bold text-gray-900">JambGenius</span>
            <span className="ml-3 text-gray-400">/ More</span>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">More Features</h1>
          <p className="text-gray-600">Access all JambGenius tools and resources</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {moreItems.map((item) => (
            <button
              key={item.route}
              onClick={() => navigate(item.route)}
              className={`${item.bg} rounded-xl p-4 sm:p-6 text-left hover:shadow-md transition-all border border-transparent hover:border-gray-200 group`}
            >
              <div className={`w-12 h-12 ${item.iconBg} rounded-xl flex items-center justify-center mb-3 sm:mb-4 group-hover:scale-110 transition-transform`}>
                <i className={`fas ${item.icon} ${item.iconColor} text-xl`}></i>
              </div>
              <h3 className="font-bold text-gray-900 text-sm sm:text-base mb-1">{item.title}</h3>
              <p className="text-xs sm:text-sm text-gray-600 leading-snug">{item.desc}</p>
            </button>
          ))}
        </div>

        {/* App download section */}
        <div className="mt-8 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 sm:p-8 text-white">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-xl sm:text-2xl font-bold mb-2">Get the JambGenius App</h3>
              <p className="text-blue-100">Study on the go with our Android app</p>
            </div>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white text-blue-600 px-6 py-3 rounded-xl font-bold hover:bg-blue-50 transition-all shadow-lg flex-shrink-0"
            >
              <i className="fas fa-download mr-2"></i>Download App
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
