import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import UserChip from '../components/UserChip'
import { auth } from '../firebase'

export default function Exam() {
  const navigate = useNavigate()
  const { user, showToast } = useAuth()
  const [selectedSubjects, setSelectedSubjects] = useState(['english'])
  const [credits, setCredits] = useState(0)

  useEffect(() => {
    document.title = 'Exam Mode - Select Subjects | JambGenius'
    const fetchCredits = async () => {
      if (!user) return
      try {
        const idToken = await user.getIdToken()
        const res = await fetch('/api/get-credits', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken }) })
        const data = await res.json()
        if (data.success) setCredits(data.credits || 0)
      } catch {}
    }
    fetchCredits()
  }, [user])

  const allSubjects = [
    { id: 'english', name: 'Use of English', icon: 'fa-book-open', color: 'red', tag: 'MANDATORY', count: '60 Questions', mandatory: true },
    { id: 'mathematics', name: 'Mathematics', icon: 'fa-calculator', color: 'blue', tag: 'SCIENCE', count: '40 Questions' },
    { id: 'physics', name: 'Physics', icon: 'fa-atom', color: 'purple', tag: 'SCIENCE', count: '40 Questions' },
    { id: 'chemistry', name: 'Chemistry', icon: 'fa-flask', color: 'green', tag: 'SCIENCE', count: '40 Questions' },
    { id: 'biology', name: 'Biology', icon: 'fa-dna', color: 'teal', tag: 'SCIENCE', count: '40 Questions' },
    { id: 'government', name: 'Government', icon: 'fa-landmark', color: 'yellow', tag: 'ARTS', count: '40 Questions' },
    { id: 'economics', name: 'Economics', icon: 'fa-chart-line', color: 'orange', tag: 'COMMERCIAL', count: '40 Questions' },
    { id: 'commerce', name: 'Commerce', icon: 'fa-shopping-cart', color: 'indigo', tag: 'COMMERCIAL', count: '40 Questions' },
    { id: 'literature', name: 'Literature in English', icon: 'fa-book', color: 'pink', tag: 'ARTS', count: '40 Questions' },
    { id: 'geography', name: 'Geography', icon: 'fa-globe-africa', color: 'cyan', tag: 'ARTS', count: '40 Questions' },
    { id: 'crs', name: 'CRS', icon: 'fa-cross', color: 'amber', tag: 'ARTS', count: '40 Questions' },
    { id: 'civic', name: 'Civic Education', icon: 'fa-users', color: 'lime', tag: 'ARTS', count: '40 Questions' },
  ]

  const toggleSubject = (id) => {
    if (id === 'english') return
    setSelectedSubjects(prev => {
      if (prev.includes(id)) return prev.filter(s => s !== id)
      if (prev.length >= 4) { showToast('You can only select 4 subjects', 'warning'); return prev }
      return [...prev, id]
    })
  }

  const canStart = selectedSubjects.length === 4

  const startExam = async () => {
    if (!user) return
    if (credits <= 0) { navigate('/exam/payment'); return }
    try {
      const idToken = await user.getIdToken()
      const res = await fetch('/api/get-credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken, action: 'consume' })
      })
      const data = await res.json()
      if (data.success) {
        sessionStorage.setItem('examSubjects', JSON.stringify(selectedSubjects))
        navigate('/exam/room')
      } else {
        showToast(data.error || 'Failed to start exam', 'error')
      }
    } catch {
      showToast('Network error. Please try again.', 'error')
    }
  }

  const progressPct = (selectedSubjects.length / 4) * 100

  return (
    <div className="bg-gray-50 font-sans page-fade-in">
      <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <button onClick={() => navigate('/')} className="flex-shrink-0 flex items-center">
              <i className="fas fa-graduation-cap text-2xl text-blue-600 mr-2"></i>
              <span className="text-xl font-bold text-gray-900">JambGenius</span>
            </button>
            <div className="flex items-center gap-3">
              {credits > 0 && (
                <div className="flex items-center bg-gradient-to-r from-green-500 to-emerald-500 text-white px-3 py-1.5 rounded-lg shadow text-sm">
                  <i className="fas fa-ticket-alt mr-1.5"></i>
                  <span className="font-bold">{credits}</span>
                  <span className="ml-1 opacity-80">credit{credits !== 1 ? 's' : ''}</span>
                </div>
              )}
              <UserChip />
            </div>
          </div>
        </div>
      </nav>

      <section className="bg-gradient-to-br from-purple-50 to-blue-50 py-8 sm:py-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <button onClick={() => navigate('/')} className="text-gray-600 hover:text-blue-600 transition-colors mb-3 block text-sm">
            <i className="fas fa-arrow-left mr-2"></i>Back to Home
          </button>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">Exam Mode</h1>
          <p className="text-gray-600">Select 4 subjects for your full JAMB simulation</p>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-6 bg-white rounded-xl p-5 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-gray-900">Choose Your Subjects</h2>
            <span className="text-sm text-gray-600"><span className="text-xl font-bold text-blue-600">{selectedSubjects.length}</span> / 4 selected</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" style={{ width: `${progressPct}%` }}></div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            <i className="fas fa-info-circle text-blue-500 mr-1"></i>
            Use of English is mandatory. Select 3 more subjects.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {allSubjects.map((s) => {
            const isSelected = selectedSubjects.includes(s.id)
            return (
              <div
                key={s.id}
                onClick={() => toggleSubject(s.id)}
                className={`bg-white rounded-xl p-4 sm:p-5 shadow-sm transition-all border-2 cursor-pointer relative ${isSelected ? 'border-blue-500 shadow-md' : 'border-transparent hover:border-blue-300 hover:shadow-md'} ${s.mandatory ? 'cursor-default' : ''}`}
              >
                {isSelected && (
                  <div className="absolute top-2 right-2">
                    <i className="fas fa-check-circle text-blue-600 text-lg"></i>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 bg-${s.color}-100 rounded-xl flex items-center justify-center flex-shrink-0`}>
                    <i className={`fas ${s.icon} text-xl text-${s.color}-600`}></i>
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-gray-900 leading-tight">{s.name}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">{s.count}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold mt-1 inline-block ${s.mandatory ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>{s.tag}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-8 text-center">
          <button
            onClick={canStart ? startExam : undefined}
            disabled={!canStart}
            className={`px-10 py-4 rounded-xl font-bold text-base transition-all ${canStart ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 shadow-lg hover:shadow-xl' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
          >
            {canStart
              ? <><i className="fas fa-rocket mr-2"></i>Start Exam {credits > 0 ? `(${credits} credit${credits !== 1 ? 's' : ''})` : '— Pay ₦1,000'}</>
              : <><i className="fas fa-lock mr-2"></i>Select 4 Subjects to Start</>
            }
          </button>
          <p className="text-sm text-gray-500 mt-3">
            <i className="fas fa-clock text-blue-500 mr-1"></i>
            180 questions • 2 hours • 400 marks
          </p>
        </div>

        <div className="mt-8 bg-purple-50 border border-purple-200 rounded-xl p-5">
          <div className="flex items-start space-x-3">
            <i className="fas fa-exclamation-triangle text-2xl text-purple-600 mt-0.5"></i>
            <div>
              <h3 className="font-bold text-gray-900 mb-1">Exam Mode Features</h3>
              <ul className="space-y-1 text-sm text-gray-700">
                <li className="flex items-center gap-2"><i className="fas fa-check text-purple-600 text-xs"></i>Full JAMB simulation with 180 questions</li>
                <li className="flex items-center gap-2"><i className="fas fa-check text-purple-600 text-xs"></i>2-hour time limit (just like the real exam)</li>
                <li className="flex items-center gap-2"><i className="fas fa-check text-purple-600 text-xs"></i>Results shown only at the end</li>
                <li className="flex items-center gap-2"><i className="fas fa-check text-purple-600 text-xs"></i>Performance saved to your profile</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <footer className="bg-gray-900 text-gray-400 py-6 mt-8 text-center text-sm">
        <p>© 2025 JambGenius. All rights reserved.</p>
      </footer>
    </div>
  )
}
