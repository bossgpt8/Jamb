import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth } from '../firebase'
import { onAuthStateChanged } from 'firebase/auth'

export default function Analytics() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState(null)
  const [bookmarks, setBookmarks] = useState([])

  useEffect(() => {
    document.title = 'Performance Analytics | JambGenius'
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      const localPracticeSessions = JSON.parse(localStorage.getItem('jambgenius_sessions') || '[]')
      const localBookmarks = JSON.parse(localStorage.getItem('jambgenius_bookmarks') || '[]')

      let remoteExamSessions = []
      if (user) {
        try {
          const idToken = await user.getIdToken()
          const res = await fetch('/api/exam-results', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken, action: 'get' })
          })
          const data = await res.json()
          if (data.success && Array.isArray(data.results)) {
            remoteExamSessions = data.results.map((result) => ({
              subject: 'Full Exam',
              mode: 'exam',
              correct: result.correctAnswers || 0,
              answered: (result.correctAnswers || 0) + (result.wrongAnswers || 0),
              date: result.completedAt || new Date().toISOString(),
              score: result.totalScore || 0,
              percentage: result.percentage || 0,
              totalQuestions: (result.correctAnswers || 0) + (result.wrongAnswers || 0)
            }))
          }
        } catch (error) {
          console.log('Analytics fetch error', error)
        }
      }

      setBookmarks(localBookmarks)
      setSummary(buildSummary(localPracticeSessions, remoteExamSessions, localBookmarks))
      setLoading(false)
    })

    return () => unsubscribe()
  }, [navigate])

  const buildSummary = (practiceSessions, examSessions, bookmarksList) => {
    const allSessions = [
      ...practiceSessions.map((session) => ({ ...session, mode: session.mode || 'practice' })),
      ...examSessions
    ]

    const practiceQuestionCount = practiceSessions.reduce((sum, session) => sum + (session.answered || 0), 0)
    const examQuestionCount = examSessions.reduce((sum, session) => sum + (session.answered || 0), 0)
    const totalQuestions = practiceQuestionCount + examQuestionCount
    const totalCorrect = allSessions.reduce((sum, session) => sum + (session.correct || 0), 0)
    const totalSessions = allSessions.length
    const practiceSessionsCount = practiceSessions.length
    const examSessionsCount = examSessions.length
    const avgAccuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0

    const subjectData = {}
    allSessions.forEach((session) => {
      const subject = session.subject || 'unknown'
      if (!subjectData[subject]) subjectData[subject] = { total: 0, correct: 0, sessions: 0 }
      subjectData[subject].total += session.answered || 0
      subjectData[subject].correct += session.correct || 0
      subjectData[subject].sessions += 1
    })

    const dates = allSessions.map((session) => new Date(session.date).toDateString())
    const uniqueDates = [...new Set(dates)].sort((a, b) => new Date(b) - new Date(a))
    let streak = 0
    const today = new Date().toDateString()
    const yesterday = new Date(Date.now() - 86400000).toDateString()
    if (uniqueDates[0] === today || uniqueDates[0] === yesterday) {
      streak = 1
      for (let i = 1; i < uniqueDates.length; i++) {
        const diffDays = Math.floor((new Date(uniqueDates[i - 1]) - new Date(uniqueDates[i])) / 86400000)
        if (diffDays === 1) streak++
        else break
      }
    }

    return {
      totalSessions,
      practiceSessionsCount,
      examSessionsCount,
      totalQuestions,
      practiceQuestionCount,
      examQuestionCount,
      totalCorrect,
      avgAccuracy,
      streak,
      subjectData,
      recentSessions: allSessions.slice().sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10),
      bookmarkCount: bookmarksList.length
    }
  }

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
            { id: 'practiceCount', icon: 'fa-book', bg: 'bg-blue-100', color: 'text-blue-600', label: 'Practice Questions', val: summary ? String(summary.practiceQuestionCount) : '0' },
            { id: 'examCount', icon: 'fa-trophy', bg: 'bg-orange-100', color: 'text-orange-600', label: 'Exam Questions', val: summary ? String(summary.examQuestionCount) : '0' },
            { id: 'avgAccuracy', icon: 'fa-check', bg: 'bg-green-100', color: 'text-green-600', label: 'Average Accuracy', val: summary ? `${summary.avgAccuracy}%` : '0%' },
            { id: 'streak', icon: 'fa-fire', bg: 'bg-purple-100', color: 'text-purple-600', label: 'Day Streak', val: summary ? String(summary.streak) : '0' },
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6 mb-6 sm:mb-8">
          {summary && [
            { label: 'Total Sessions', value: summary.totalSessions },
            { label: 'Practice Sessions', value: summary.practiceSessionsCount },
            { label: 'Exam Sessions', value: summary.examSessionsCount },
          ].map((item) => (
            <div key={item.label} className="bg-white rounded-xl p-4 sm:p-5 shadow-sm border border-gray-100">
              <div className="text-sm text-gray-500 mb-1">{item.label}</div>
              <div className="text-2xl font-bold text-gray-900">{item.value}</div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Subject Performance</h2>
          {summary ? (
            <div className="space-y-4">
              {Object.keys(summary.subjectData).length === 0 ? (
                <p className="text-gray-500 text-center py-8">No practice or exam sessions yet. Start practicing to see your performance!</p>
              ) : Object.entries(summary.subjectData).map(([subject, data]) => {
                const accuracy = data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0
                const color = accuracy >= 70 ? 'green' : accuracy >= 50 ? 'yellow' : 'red'
                return (
                  <div key={subject} className="border-l-4 border-blue-500 pl-4">
                    <div className="flex justify-between items-center mb-2">
                      <div>
                        <div className="font-semibold text-gray-900 capitalize">{subject}</div>
                        <div className="text-sm text-gray-600">{data.sessions} session{data.sessions > 1 ? 's' : ''} • {data.total} questions</div>
                      </div>
                      <div className="text-right">
                        <div className={`text-2xl font-bold text-${color}-600`}>{accuracy}%</div>
                        <div className="text-sm text-gray-600">{data.correct}/{data.total}</div>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className={`h-2 rounded-full bg-${color}-600`} style={{ width: `${accuracy}%` }}></div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : null}
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Recent Sessions</h2>
          {summary ? (
            <div className="space-y-3">
              {summary.recentSessions.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No sessions yet</p>
              ) : summary.recentSessions.map((session, index) => {
                const pct = session.percentage || (session.answered > 0 ? Math.round((session.correct / session.answered) * 100) : 0)
                const color = pct >= 70 ? 'green' : pct >= 50 ? 'yellow' : 'red'
                return (
                  <div key={`${session.date}-${index}`} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div>
                      <div className="font-semibold text-gray-900 capitalize">
                        {session.mode === 'exam' ? 'Full Exam' : session.subject}
                      </div>
                      <div className="text-sm text-gray-600">{new Date(session.date).toLocaleDateString()}</div>
                    </div>
                    <div className="text-right">
                      <div className={`text-lg font-bold text-${color}-600`}>{pct}%</div>
                      <div className="text-sm text-gray-600">{session.correct}/{session.answered}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : null}
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Bookmarked Questions</h2>
            <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-semibold">{bookmarks.length}</span>
          </div>
          <div className="space-y-3">
            {bookmarks.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No bookmarked questions yet. Click the bookmark icon during practice to save questions.</p>
            ) : (
              <>
                <p className="text-gray-600 mb-4">You have {bookmarks.length} bookmarked question{bookmarks.length > 1 ? 's' : ''} saved for review.</p>
                <button onClick={() => navigate('/practice')} className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold">
                  <i className="fas fa-book-open mr-2"></i>Practice Bookmarked Questions
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
