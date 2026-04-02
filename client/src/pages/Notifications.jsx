import { useNavigate } from 'react-router-dom'

export default function Notifications() {
  const navigate = useNavigate()

  const toggleReminder = (id) => {
    const checked = document.getElementById(id)?.checked
    console.log(`Toggled ${id}: ${checked}`)
  }

  return (
    <div className="bg-gray-50 min-h-screen page-fade-in">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-blue-600"><i className="fas fa-bell mr-2"></i>Notifications</h1>
          <button onClick={() => navigate(-1)} className="text-gray-600 hover:text-gray-900">
            <i className="fas fa-times text-2xl"></i>
          </button>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">
            <i className="fas fa-cog mr-2 text-gray-600"></i>Notification Preferences
          </h2>
          <div className="space-y-4">
            {[
              { id: 'reminderToggle', icon: 'fa-book', bg: 'bg-blue-100', iconColor: 'text-blue-600', title: 'Daily Study Reminders', desc: 'Get reminded to practice daily' },
              { id: 'chatToggle', icon: 'fa-comments', bg: 'bg-green-100', iconColor: 'text-green-600', title: 'Chat Messages', desc: 'Notifications for new chat messages' },
              { id: 'examToggle', icon: 'fa-trophy', bg: 'bg-orange-100', iconColor: 'text-orange-600', title: 'Exam Results', desc: 'Get notified when exam results are ready' },
              { id: 'streakToggle', icon: 'fa-fire', bg: 'bg-red-100', iconColor: 'text-red-600', title: 'Streak Alerts', desc: 'Reminders to maintain your study streak' },
            ].map(item => (
              <div key={item.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`w-12 h-12 ${item.bg} rounded-lg flex items-center justify-center`}>
                    <i className={`fas ${item.icon} ${item.iconColor} text-lg`}></i>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{item.title}</p>
                    <p className="text-sm text-gray-600">{item.desc}</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" id={item.id} className="sr-only peer" defaultChecked onChange={() => toggleReminder(item.id)} />
                  <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">
            <i className="fas fa-bell mr-2 text-blue-600"></i>Recent Notifications
          </h2>
          <div className="text-center py-8 text-gray-500">
            <i className="fas fa-bell-slash text-4xl mb-3 block"></i>
            <p>No notifications yet</p>
            <p className="text-sm mt-1">Notifications will appear here when you have activity</p>
          </div>
        </div>
      </div>
    </div>
  )
}
