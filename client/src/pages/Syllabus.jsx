import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Syllabus() {
  const navigate = useNavigate()
  const [activeSubject, setActiveSubject] = useState('english')

  const subjects = {
    english: {
      name: 'Use of English',
      icon: 'fa-book-open',
      color: 'red',
      topics: ['Comprehension & Summary', 'Lexis and Structure', 'Oral English', 'Register', 'Figures of Speech', 'Sentence types & patterns', 'Idioms & Proverbs', 'Phonetics & Sounds']
    },
    mathematics: {
      name: 'Mathematics',
      icon: 'fa-calculator',
      color: 'blue',
      topics: ['Number and Numeration', 'Algebra', 'Geometry and Mensuration', 'Trigonometry', 'Statistics', 'Calculus', 'Vectors and Mechanics', 'Matrices and Determinants']
    },
    physics: {
      name: 'Physics',
      icon: 'fa-atom',
      color: 'purple',
      topics: ['Measurement and Units', 'Mechanics', 'Thermal Physics', 'Waves and Sound', 'Light and Optics', 'Electricity and Magnetism', 'Modern Physics', 'Electronics']
    },
    chemistry: {
      name: 'Chemistry',
      icon: 'fa-flask',
      color: 'green',
      topics: ['Introduction to Chemistry', 'Structure of the Atom', 'Chemical Bonding', 'Organic Chemistry', 'Physical Chemistry', 'Inorganic Chemistry', 'Industrial Chemistry', 'Environmental Chemistry']
    },
    biology: {
      name: 'Biology',
      icon: 'fa-dna',
      color: 'teal',
      topics: ['Cell Biology', 'Genetics & Heredity', 'Ecology', 'Plant Biology', 'Animal Biology', 'Evolution', 'Physiology', 'Microbiology']
    },
    government: {
      name: 'Government',
      icon: 'fa-landmark',
      color: 'yellow',
      topics: ['Basic Concepts', 'Forms of Government', 'Nigerian Government', 'Constitution', 'Electoral System', 'Public Administration', 'International Relations', 'Political Parties']
    },
    economics: {
      name: 'Economics',
      icon: 'fa-chart-line',
      color: 'orange',
      topics: ['Microeconomics', 'Macroeconomics', 'Money & Banking', 'International Trade', 'National Income', 'Public Finance', 'Development Economics', 'Nigerian Economy']
    },
  }

  const active = subjects[activeSubject]

  return (
    <div className="bg-gray-50 font-sans min-h-screen page-fade-in">
      <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <button onClick={() => navigate('/')} className="flex items-center">
              <i className="fas fa-graduation-cap text-2xl text-blue-600 mr-2"></i>
              <span className="text-xl font-bold text-gray-900">JambGenius </span>
            </button>
            <button onClick={() => navigate('/')} className="text-gray-600 hover:text-blue-600">
              <i className="fas fa-arrow-left mr-2"></i>Home
            </button>
          </div>
        </div>
      </nav>

      <section className="bg-gradient-to-br from-green-50 to-blue-50 py-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">JAMB Syllabus 2025</h1>
          <p className="text-xl text-gray-600">Complete official JAMB UTME syllabus for all subjects</p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-wrap gap-3 mb-8 justify-center">
          {Object.entries(subjects).map(([id, s]) => (
            <button
              key={id}
              onClick={() => setActiveSubject(id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${activeSubject === id ? `bg-${s.color}-600 text-white shadow-md` : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'}`}
            >
              <i className={`fas ${s.icon}`}></i>
              {s.name}
            </button>
          ))}
        </div>

        {active && (
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className={`w-14 h-14 bg-${active.color}-100 rounded-xl flex items-center justify-center`}>
                <i className={`fas ${active.icon} text-${active.color}-600 text-2xl`}></i>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{active.name}</h2>
                <p className="text-gray-500">{active.topics.length} topic areas</p>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {active.topics.map((topic, i) => (
                <div key={i} className={`flex items-center gap-3 p-4 bg-${active.color}-50 rounded-xl`}>
                  <div className={`w-8 h-8 bg-${active.color}-100 rounded-lg flex items-center justify-center text-sm font-bold text-${active.color}-700`}>{i + 1}</div>
                  <span className="text-gray-800 font-medium">{topic}</span>
                </div>
              ))}
            </div>
            <div className="mt-6">
              <button onClick={() => navigate(`/practice?subject=${activeSubject}`)}
                className={`bg-${active.color}-600 text-white px-6 py-3 rounded-xl font-semibold hover:opacity-90 transition-opacity`}>
                <i className="fas fa-play mr-2"></i>Practice {active.name}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
