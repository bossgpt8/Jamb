import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import UserChip from '../components/UserChip'

export default function Practice() {
  const navigate = useNavigate()

  useEffect(() => {
    document.title = 'Practice Mode - Select Subject | JambGenius'
  }, [])

  const subjects = [
    { id: 'english', name: 'Use of English', icon: 'fa-book-open', color: 'red', tag: 'MANDATORY', desc: 'Comprehension, Grammar & Vocabulary' },
    { id: 'mathematics', name: 'Mathematics', icon: 'fa-calculator', color: 'blue', tag: 'SCIENCE', desc: 'Algebra, Geometry & Statistics' },
    { id: 'physics', name: 'Physics', icon: 'fa-atom', color: 'purple', tag: 'SCIENCE', desc: 'Mechanics, Waves & Electronics' },
    { id: 'chemistry', name: 'Chemistry', icon: 'fa-flask', color: 'green', tag: 'SCIENCE', desc: 'Organic, Inorganic & Physical' },
    { id: 'biology', name: 'Biology', icon: 'fa-dna', color: 'teal', tag: 'SCIENCE', desc: 'Botany, Zoology & Ecology' },
    { id: 'government', name: 'Government', icon: 'fa-landmark', color: 'yellow', tag: 'ARTS', desc: 'Political Science & Governance' },
    { id: 'economics', name: 'Economics', icon: 'fa-chart-line', color: 'orange', tag: 'COMMERCIAL', desc: 'Micro & Macroeconomics' },
    { id: 'commerce', name: 'Commerce', icon: 'fa-shopping-cart', color: 'indigo', tag: 'COMMERCIAL', desc: 'Trade, Business & Finance' },
    { id: 'literature', name: 'Literature in English', icon: 'fa-book', color: 'pink', tag: 'ARTS', desc: 'Drama, Poetry & Prose' },
    { id: 'geography', name: 'Geography', icon: 'fa-globe-africa', color: 'cyan', tag: 'ARTS', desc: 'Physical & Human Geography' },
    { id: 'crs', name: 'CRS', icon: 'fa-cross', color: 'amber', tag: 'ARTS', desc: 'Christian Religious Studies' },
    { id: 'civic', name: 'Civic Education', icon: 'fa-users', color: 'lime', tag: 'ARTS', desc: 'Citizenship & Rights' },
  ]

  return (
    <div className="bg-gray-50 font-sans page-fade-in">
      <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <button onClick={() => navigate('/')} className="flex-shrink-0 flex items-center">
              <i className="fas fa-graduation-cap text-2xl text-blue-600 mr-2"></i>
              <span className="text-xl font-bold text-gray-900">JambGenius</span>
            </button>
            <div className="hidden md:flex items-center space-x-6 text-sm">
              <button onClick={() => navigate('/')} className="text-gray-600 hover:text-blue-600 font-medium">Home</button>
              <button onClick={() => navigate('/study-tips')} className="text-gray-600 hover:text-blue-600 font-medium">Study Tips</button>
              <button onClick={() => navigate('/syllabus')} className="text-gray-600 hover:text-blue-600 font-medium">Syllabus</button>
              <button onClick={() => navigate('/community')} className="text-gray-600 hover:text-blue-600 font-medium">Community</button>
            </div>
            <UserChip />
          </div>
        </div>
      </nav>

      <section className="bg-gradient-to-br from-green-50 to-blue-50 py-8 sm:py-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <button onClick={() => navigate('/')} className="text-gray-600 hover:text-blue-600 transition-colors mb-3 block text-sm">
            <i className="fas fa-arrow-left mr-2"></i>Back to Home
          </button>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">Practice Mode</h1>
          <p className="text-gray-600">Select a subject to practice at your own pace</p>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-6 text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-1">Choose Your Subject</h2>
          <p className="text-gray-500 text-sm">Practice unlimited questions without time pressure</p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {subjects.map((s) => (
            <div
              key={s.id}
              onClick={() => navigate(`/practice/exam?subject=${s.id}`)}
              className="bg-white rounded-xl p-4 sm:p-5 shadow-sm hover:shadow-lg transition-all border-2 border-transparent hover:border-blue-500 cursor-pointer"
            >
              <div className="flex items-center gap-3 sm:gap-4">
                <div className={`w-12 h-12 sm:w-14 sm:h-14 bg-${s.color}-100 rounded-xl flex items-center justify-center flex-shrink-0`}>
                  <i className={`fas ${s.icon} text-xl sm:text-2xl text-${s.color}-600`}></i>
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-bold text-gray-900 leading-tight">{s.name}</h3>
                  <p className="text-xs text-gray-500 mt-0.5 hidden sm:block">{s.desc}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold mt-1 inline-block ${s.id === 'english' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>{s.tag}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 bg-green-50 border border-green-200 rounded-xl p-5">
          <div className="flex items-start space-x-3">
            <i className="fas fa-info-circle text-2xl text-green-600 mt-0.5"></i>
            <div>
              <h3 className="font-bold text-gray-900 mb-1">Practice Mode Features</h3>
              <ul className="space-y-1 text-sm text-gray-700">
                <li className="flex items-center gap-2"><i className="fas fa-check text-green-600 text-xs"></i>No time limit — practice at your own pace</li>
                <li className="flex items-center gap-2"><i className="fas fa-check text-green-600 text-xs"></i>Instant feedback on answers</li>
                <li className="flex items-center gap-2"><i className="fas fa-check text-green-600 text-xs"></i>Detailed explanations for every question</li>
                <li className="flex items-center gap-2"><i className="fas fa-check text-green-600 text-xs"></i>Track your progress per subject</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-8 bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl p-6 sm:p-8 text-white text-center shadow-xl">
          <h2 className="text-xl sm:text-2xl font-bold mb-2">Ready for the Real Challenge?</h2>
          <p className="text-orange-100 mb-5 text-sm">Take a full JAMB Mock Exam — 180 questions, 2 hours, real CBT experience</p>
          <button onClick={() => navigate('/exam')} className="bg-white text-orange-600 px-8 py-3 rounded-xl font-bold hover:bg-yellow-50 transition-all shadow-lg">
            <i className="fas fa-rocket mr-2"></i>Take Mock Exam — ₦1,000
          </button>
        </div>
      </div>

      <footer className="bg-gray-900 text-gray-400 py-6 mt-8 text-center text-sm">
        <p>© 2025 JambGenius. All rights reserved.</p>
      </footer>
    </div>
  )
}
