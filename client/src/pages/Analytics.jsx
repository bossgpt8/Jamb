import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth } from '../firebase'
import { onAuthStateChanged } from 'firebase/auth'

export default function Analytics() {
  const navigate = useNavigate()

  useEffect(() => {
    document.title = 'Performance Analytics | JambGenius'

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      let sessions = JSON.parse(localStorage.getItem('jambgenius_sessions') || '[]')
      const bookmarks = JSON.parse(localStorage.getItem('jambgenius_bookmarks') || '[]')

      if (user) {
        try {
          const idToken = await user.getIdToken()
          const res = await fetch('/api/get-analytics', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken }) })
          const data = await res.json()
          if (data.success && data.results) {
            const examSessions = data.results.map(r => ({
              subject: 'Full Exam', correct: r.correctAnswers,
              answered: r.correctAnswers + r.wrongAnswers,
              date: r.completedAt || new Date().toISOString(),
              score: r.totalScore, percentage: r.percentage
            }))
            sessions = [...sessions, ...examSessions]
          }
        } catch (e) { console.log('Analytics fetch error', e) }
      }
      updateAnalytics(sessions, bookmarks)
    })

    function updateAnalytics(sessions, bookmarks) {
      const totalSessions = sessions.length
      const totalQuestions = sessions.reduce((sum, s) => sum + (s.answered || 0), 0)
      const totalCorrect = sessions.reduce((sum, s) => sum + (s.correct || 0), 0)
      const avgAccuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0

      function calculateStreak() {
        if (sessions.length === 0) return 0
        const dates = sessions.map(s => new Date(s.date).toDateString())
        const uniqueDates = [...new Set(dates)].sort((a, b) => new Date(b) - new Date(a))
        let streak = 0
        const today = new Date().toDateString()
        const yesterday = new Date(Date.now() - 86400000).toDateString()
        if (uniqueDates[0] === today || uniqueDates[0] === yesterday) {
          streak = 1
          for (let i = 1; i < uniqueDates.length; i++) {
            const diffDays = Math.floor((new Date(uniqueDates[i-1]) - new Date(uniqueDates[i])) / 86400000)
            if (diffDays === 1) streak++; else break
          }
        }
        return streak
      }

      const el = (id) => document.getElementById(id)
      if (el('totalSessions')) el('totalSessions').textContent = totalSessions
      if (el('avgAccuracy')) el('avgAccuracy').textContent = `${avgAccuracy}%`
      if (el('totalQuestions')) el('totalQuestions').textContent = totalQuestions
      if (el('streak')) el('streak').textContent = calculateStreak()

      const subjectData = {}
      sessions.forEach(s => {
        if (!subjectData[s.subject]) subjectData[s.subject] = { total: 0, correct: 0, sessions: 0 }
        subjectData[s.subject].total += (s.answered || 0)
        subjectData[s.subject].correct += (s.correct || 0)
        subjectData[s.subject].sessions++
      })

      const subjectStatsEl = el('subjectStats')
      if (subjectStatsEl) {
        if (Object.keys(subjectData).length === 0) {
          subjectStatsEl.innerHTML = '<p class="text-gray-500 text-center py-8">No practice sessions yet. Start practicing to see your performance!</p>'
        } else {
          subjectStatsEl.innerHTML = ''
          Object.entries(subjectData).forEach(([subject, data]) => {
            const accuracy = data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0
            const color = accuracy >= 70 ? 'green' : accuracy >= 50 ? 'yellow' : 'red'
            const div = document.createElement('div')
            div.className = 'border-l-4 border-blue-500 pl-4'
            div.innerHTML = `<div class="flex justify-between items-center mb-2"><div><div class="font-semibold text-gray-900 capitalize">${subject}</div><div class="text-sm text-gray-600">${data.sessions} session${data.sessions > 1 ? 's' : ''} • ${data.total} questions</div></div><div class="text-right"><div class="text-2xl font-bold text-${color}-600">${accuracy}%</div><div class="text-sm text-gray-600">${data.correct}/${data.total}</div></div></div><div class="w-full bg-gray-200 rounded-full h-2"><div class="h-2 rounded-full bg-${color}-600" style="width:${accuracy}%"></div></div>`
            subjectStatsEl.appendChild(div)
          })
        }
      }

      const recentEl = el('recentSessions')
      if (recentEl) {
        if (sessions.length === 0) {
          recentEl.innerHTML = '<p class="text-gray-500 text-center py-8">No practice sessions yet</p>'
        } else {
          recentEl.innerHTML = ''
          sessions.slice(-10).reverse().forEach(s => {
            const pct = s.percentage || (s.answered > 0 ? Math.round((s.correct / s.answered) * 100) : 0)
            const color = pct >= 70 ? 'green' : pct >= 50 ? 'yellow' : 'red'
            const div = document.createElement('div')
            div.className = 'flex justify-between items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors'
            div.innerHTML = `<div><div class="font-semibold text-gray-900 capitalize">${s.subject}</div><div class="text-sm text-gray-600">${new Date(s.date).toLocaleDateString()}</div></div><div class="text-right"><div class="text-lg font-bold text-${color}-600">${pct}%</div><div class="text-sm text-gray-600">${s.correct}/${s.answered}</div></div>`
            recentEl.appendChild(div)
          })
        }
      }

      if (el('bookmarkCount')) el('bookmarkCount').textContent = bookmarks.length
      const bookmarksEl = el('bookmarkedList')
      if (bookmarksEl) {
        if (bookmarks.length === 0) {
          bookmarksEl.innerHTML = '<p class="text-gray-500 text-center py-8">No bookmarked questions yet. Click the bookmark icon during practice to save questions.</p>'
        } else {
          bookmarksEl.innerHTML = `<p class="text-gray-600 mb-4">You have ${bookmarks.length} bookmarked question${bookmarks.length > 1 ? 's' : ''} saved for review.</p><button onclick="window.navigate('/practice')" class="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold"><i class="fas fa-book-open mr-2"></i>Practice Bookmarked Questions</button>`
        }
      }
    }

    return () => unsubscribe()
  }, [navigate])

  return (
    <div className="bg-gray-50 font-sans min-h-screen page-fade-in">
      <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <button onClick={() => navigate('/')} className="flex-shrink-0 flex items-center">
                <i className="fas fa-graduation-cap text-2xl text-blue-600 mr-2"></i>
                <span className="text-xl font-bold text-gray-900">JambGenius </span>
              </button>
            </div>
            <div className="flex items-center space-x-4">
              <button onClick={() => navigate('/daily-challenge')} className="text-gray-600 hover:text-blue-600 transition-colors">
                <i className="fas fa-trophy mr-2"></i>Daily Challenge
              </button>
              <button onClick={() => navigate('/')} className="text-gray-600 hover:text-blue-600 transition-colors">
                <i className="fas fa-arrow-left mr-2"></i>Home
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-2 sm:px-4 py-4 sm:py-8">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 mb-2">Performance Analytics</h1>
          <p className="text-sm sm:text-base text-gray-600">Track your progress and identify areas for improvement</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
          {[
            { id: 'totalSessions', icon: 'fa-book', bg: 'bg-blue-100', color: 'text-blue-600', label: 'Total Sessions', val: '0' },
            { id: 'avgAccuracy', icon: 'fa-check', bg: 'bg-green-100', color: 'text-green-600', label: 'Average Accuracy', val: '0%' },
            { id: 'totalQuestions', icon: 'fa-question', bg: 'bg-purple-100', color: 'text-purple-600', label: 'Questions Answered', val: '0' },
            { id: 'streak', icon: 'fa-fire', bg: 'bg-orange-100', color: 'text-orange-600', label: 'Day Streak', val: '0' },
          ].map(s => (
            <div key={s.id} className="bg-white rounded-xl p-3 sm:p-6 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <div className={`w-10 sm:w-12 h-10 sm:h-12 ${s.bg} rounded-lg flex items-center justify-center`}>
                  <i className={`fas ${s.icon} ${s.color} text-lg sm:text-xl`}></i>
                </div>
              </div>
              <div id={s.id} className="text-2xl sm:text-3xl font-bold text-gray-900">{s.val}</div>
              <div className="text-xs sm:text-sm text-gray-600">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Subject Performance</h2>
          <div id="subjectStats" className="space-y-4"></div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Recent Sessions</h2>
          <div id="recentSessions" className="space-y-3"></div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Bookmarked Questions</h2>
            <span id="bookmarkCount" className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-semibold">0</span>
          </div>
          <div id="bookmarkedList" className="space-y-3"></div>
        </div>
      </div>
    </div>
  )
}
