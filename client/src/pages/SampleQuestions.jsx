import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function SampleQuestions() {
  const navigate = useNavigate()
  const [selectedSubject, setSelectedSubject] = useState('all')
  const [selectedYear, setSelectedYear] = useState('all')

  const questions = [
    { subject: 'Mathematics', year: '2023', q: 'If 3x + 2 = 14, find the value of x.', opts: ['4', '3', '2', '5'], ans: 0 },
    { subject: 'English', year: '2023', q: 'Choose the word that is closest in meaning to "BENEVOLENT"', opts: ['Cruel', 'Kind', 'Wise', 'Strong'], ans: 1 },
    { subject: 'Physics', year: '2022', q: 'Which of the following is a vector quantity?', opts: ['Speed', 'Mass', 'Velocity', 'Temperature'], ans: 2 },
    { subject: 'Chemistry', year: '2022', q: 'The atomic number of Carbon is:', opts: ['6', '12', '8', '4'], ans: 0 },
    { subject: 'Biology', year: '2023', q: 'Photosynthesis takes place in which organelle?', opts: ['Mitochondria', 'Chloroplast', 'Nucleus', 'Ribosome'], ans: 1 },
    { subject: 'Government', year: '2021', q: 'The principle of separation of powers was propounded by:', opts: ['John Locke', 'Thomas Hobbes', 'Montesquieu', 'Rousseau'], ans: 2 },
    { subject: 'Economics', year: '2023', q: 'The law of diminishing returns applies to:', opts: ['Fixed factors', 'Variable factors', 'All factors', 'None of the factors'], ans: 1 },
    { subject: 'Mathematics', year: '2022', q: 'Find the simple interest on ₦5000 at 4% per annum for 3 years.', opts: ['₦500', '₦600', '₦400', '₦200'], ans: 1 },
  ]

  const filtered = questions.filter(q =>
    (selectedSubject === 'all' || q.subject === selectedSubject) &&
    (selectedYear === 'all' || q.year === selectedYear)
  )

  const subjects = ['all', ...new Set(questions.map(q => q.subject))]
  const years = ['all', ...new Set(questions.map(q => q.year)).values()].reverse()

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

      <section className="bg-gradient-to-br from-teal-50 to-blue-50 py-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Sample JAMB Questions</h1>
          <p className="text-xl text-gray-600">Browse past JAMB questions by subject and year</p>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl p-4 shadow-sm mb-6 flex flex-wrap gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Subject</label>
            <select value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              {subjects.map(s => <option key={s} value={s}>{s === 'all' ? 'All Subjects' : s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Year</label>
            <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              {years.map(y => <option key={y} value={y}>{y === 'all' ? 'All Years' : y}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <span className="text-sm text-gray-600">{filtered.length} question{filtered.length !== 1 ? 's' : ''} found</span>
          </div>
        </div>

        <div className="space-y-4">
          {filtered.map((q, i) => (
            <div key={i} className="bg-white rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <span className="bg-blue-100 text-blue-600 text-xs px-2 py-1 rounded-full font-medium">{q.subject}</span>
                <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">{q.year}</span>
              </div>
              <p className="text-gray-900 font-medium mb-4">{q.q}</p>
              <div className="grid grid-cols-2 gap-2">
                {q.opts.map((opt, j) => (
                  <div key={j} className={`p-3 rounded-lg border text-sm ${j === q.ans ? 'border-green-500 bg-green-50 text-green-700 font-medium' : 'border-gray-200 text-gray-600'}`}>
                    {j === q.ans && <i className="fas fa-check text-green-500 mr-1"></i>}
                    {String.fromCharCode(65 + j)}. {opt}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 text-center">
          <button onClick={() => navigate('/practice')} className="bg-blue-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-blue-700 transition-colors shadow-lg">
            <i className="fas fa-book-open mr-2"></i>Practice More Questions
          </button>
        </div>
      </div>
    </div>
  )
}
