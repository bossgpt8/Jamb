import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth } from '../firebase'

function StatCard({ icon, label, value, sub, color = 'blue' }) {
  const colors = {
    blue:   'bg-blue-50 text-blue-600',
    green:  'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
    red:    'bg-red-50 text-red-600',
  }
  return (
    <div className="bg-white rounded-2xl shadow-sm p-5">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${colors[color]}`}>
        <i className={`fas ${icon} text-lg`}></i>
      </div>
      <div className="text-2xl font-bold text-gray-900">{value ?? '—'}</div>
      <div className="text-sm font-medium text-gray-700 mt-0.5">{label}</div>
      {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
    </div>
  )
}

export default function AdminAnalytics() {
  const navigate = useNavigate()
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const idToken = await auth.currentUser.getIdToken()
        const res = await fetch('/api/admin/analytics', { headers: { 'x-id-token': idToken } })
        const data = await res.json()
        if (data.success) setAnalytics(data.analytics)
      } catch (err) { console.error(err) }
      setLoading(false)
    }
    load()
  }, [])

  const a = analytics

  return (
    <div className="bg-gray-50 min-h-screen font-sans">
      <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('/admin')} className="text-gray-500 hover:text-blue-600 text-sm flex items-center gap-1">
              <i className="fas fa-arrow-left"></i> Dashboard
            </button>
            <span className="text-gray-300">/</span>
            <span className="text-gray-900 font-semibold text-sm">Analytics</span>
          </div>
          <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-semibold">ADMIN</span>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Platform Analytics</h1>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-600 border-t-transparent"></div>
          </div>
        ) : !a ? (
          <div className="text-center text-gray-400 py-16">Failed to load analytics.</div>
        ) : (
          <>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Users</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
              <StatCard icon="fa-users" label="Total Users" value={a.users.total} color="blue" />
              <StatCard icon="fa-user-check" label="Active Users" value={a.users.active} color="green" />
              <StatCard icon="fa-user-plus" label="New (30 days)" value={a.users.newLast30Days} color="purple" />
              <StatCard icon="fa-user-clock" label="New (7 days)" value={a.users.newLast7Days} color="orange" />
            </div>

            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Exams</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
              <StatCard icon="fa-file-alt" label="Total Attempts" value={a.exams.totalAttempts} color="blue" />
              <StatCard icon="fa-percentage" label="Avg Score" value={`${a.exams.avgScorePercent}%`} color="purple" />
              <StatCard icon="fa-check-circle" label="Passed (≥50%)" value={a.exams.passed} color="green" />
              <StatCard icon="fa-times-circle" label="Failed (<50%)" value={a.exams.failed} color="red" />
            </div>

            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Content</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
              <StatCard icon="fa-question-circle" label="Total Questions" value={a.questions.total} color="blue" />
              <StatCard icon="fa-envelope-open-text" label="Feedback (Open)" value={a.feedback.open} color="orange" />
              <StatCard icon="fa-inbox" label="Feedback (Total)" value={a.feedback.total} color="purple" />
              <StatCard icon="fa-chart-pie" label="Pass Rate" value={`${a.exams.passRate}%`} color="green" />
            </div>

            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Questions by Subject</h2>
            <div className="bg-white rounded-2xl shadow-sm p-5">
              <div className="space-y-3">
                {(a.questions.bySubject || []).map(({ _id, count }) => {
                  const pct = a.questions.total > 0 ? Math.round((count / a.questions.total) * 100) : 0
                  return (
                    <div key={_id} className="flex items-center gap-3">
                      <div className="w-28 text-sm text-gray-700 capitalize flex-shrink-0">{_id || 'Unknown'}</div>
                      <div className="flex-1 bg-gray-100 rounded-full h-2">
                        <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${pct}%` }}></div>
                      </div>
                      <div className="text-sm text-gray-500 w-20 text-right">{count} ({pct}%)</div>
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
