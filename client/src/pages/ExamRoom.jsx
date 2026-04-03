import { useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth } from '../firebase'
import { onAuthStateChanged } from 'firebase/auth'

const EXAM_DURATION = 2 * 60 * 60 // 2 hours in seconds

export default function ExamRoom() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [questions, setQuestions] = useState([])
  const [answers, setAnswers] = useState({})
  const [currentQ, setCurrentQ] = useState(0)
  const [currentSubject, setCurrentSubject] = useState('')
  const [timeLeft, setTimeLeft] = useState(EXAM_DURATION)
  const [done, setDone] = useState(false)
  const [results, setResults] = useState(null)
  const [subjects, setSubjects] = useState([])
  const [subjectGroups, setSubjectGroups] = useState({})
  const [user, setUser] = useState(null)
  const timerRef = useRef(null)

  useEffect(() => {
    document.title = 'JAMB Mock Exam | JambGenius'
    const subjectsStr = sessionStorage.getItem('examSubjects')
    if (!subjectsStr) { navigate('/exam'); return }
    const subjectList = JSON.parse(subjectsStr)
    setSubjects(subjectList)

    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u)
      await loadQuestions(subjectList)
    })

    return () => { unsubscribe(); clearInterval(timerRef.current) }
  }, [])

  useEffect(() => {
    if (!loading && !done) {
      timerRef.current = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) { clearInterval(timerRef.current); submitExam(); return 0 }
          return t - 1
        })
      }, 1000)
      return () => clearInterval(timerRef.current)
    }
  }, [loading, done])

  const loadQuestions = async (subjectList) => {
    try {
      const allQuestions = []
      const groups = {}
      for (const subj of subjectList) {
        const limit = subj === 'english' ? 60 : 40
        try {
          const res = await fetch(`/api/questions?subject=${subj}&limit=${limit}`)
          const data = await res.json()
          const qs = fillQuestionSet(data.questions || [], limit, subj).map((q, i) => ({ ...q, subject: subj, globalIndex: allQuestions.length + i }))
          groups[subj] = { start: allQuestions.length, count: qs.length }
          allQuestions.push(...qs)
        } catch (e) {
          const qs = getSampleQuestions(subj, limit).map((q, i) => ({ ...q, subject: subj, globalIndex: allQuestions.length + i }))
          groups[subj] = { start: allQuestions.length, count: qs.length }
          allQuestions.push(...qs)
        }
      }
      setQuestions(allQuestions)
      setSubjectGroups(groups)
      setCurrentSubject(subjectList[0])
      setLoading(false)
    } catch (e) {
      setLoading(false)
      navigate('/exam')
    }
  }

  const getSampleQuestions = (subject, limit) => {
    const q = {
      english: [
        { id: 1, question: 'Choose the word closest in meaning to BENEVOLENT', options: ['Cruel', 'Kind', 'Wise', 'Selfish'], answer: 1, explanation: 'Benevolent means kind and well-meaning.' },
        { id: 2, question: 'Identify the figure of speech: "Time is money"', options: ['Simile', 'Metaphor', 'Personification', 'Hyperbole'], answer: 1, explanation: 'This is a metaphor - a direct comparison.' },
        { id: 3, question: 'Which sentence is grammatically correct?', options: ["He don't know", "He doesn't knows", "He doesn't know", "He do not knows"], answer: 2, explanation: '"Doesn\'t" takes the base form of the verb.' },
        { id: 4, question: 'The plural of "phenomenon" is:', options: ['Phenomenons', 'Phenomenon', 'Phenomena', 'Phenomenas'], answer: 2, explanation: 'Phenomena is the correct Greek-origin plural.' },
        { id: 5, question: 'Choose the antonym of "VERBOSE":', options: ['Wordy', 'Concise', 'Eloquent', 'Fluent'], answer: 1, explanation: 'Verbose means using many words; concise means brief.' },
      ],
      mathematics: [
        { id: 1, question: 'If 3x + 2 = 14, find x.', options: ['2', '3', '4', '5'], answer: 2, explanation: '3x = 12, x = 4' },
        { id: 2, question: 'What is 15% of 200?', options: ['20', '25', '30', '35'], answer: 2, explanation: '15/100 × 200 = 30' },
        { id: 3, question: 'Find the HCF of 12 and 18.', options: ['3', '6', '9', '12'], answer: 1, explanation: 'HCF = 6' },
        { id: 4, question: 'Simplify: 2³ × 2²', options: ['2⁵', '2⁶', '4⁵', '8³'], answer: 0, explanation: '2³ × 2² = 2^5 = 32' },
        { id: 5, question: 'The area of a circle with radius 7cm is (π=22/7):', options: ['44 cm²', '154 cm²', '22 cm²', '49 cm²'], answer: 1, explanation: 'πr² = 22/7 × 49 = 154 cm²' },
      ],
      physics: [
        { id: 1, question: 'Which is a vector quantity?', options: ['Speed', 'Mass', 'Velocity', 'Temperature'], answer: 2, explanation: 'Velocity has both magnitude and direction.' },
        { id: 2, question: 'SI unit of force is:', options: ['Watt', 'Joule', 'Newton', 'Pascal'], answer: 2, explanation: 'Force is measured in Newtons (N).' },
        { id: 3, question: 'Sound travels fastest in:', options: ['Air', 'Water', 'Vacuum', 'Steel'], answer: 3, explanation: 'Sound travels fastest in solids.' },
        { id: 4, question: 'Which electromagnetic wave has highest frequency?', options: ['Radio', 'Infrared', 'Visible', 'Gamma rays'], answer: 3, explanation: 'Gamma rays have the highest frequency.' },
        { id: 5, question: 'Newton\'s first law is the law of:', options: ['Acceleration', 'Gravity', 'Inertia', 'Momentum'], answer: 2, explanation: 'The first law states that objects remain in their state unless acted upon by a force.' },
      ],
      chemistry: [
        { id: 1, question: 'Atomic number of Carbon is:', options: ['6', '12', '8', '4'], answer: 0, explanation: 'Carbon has 6 protons, so atomic number = 6.' },
        { id: 2, question: 'pH of pure water:', options: ['0', '7', '14', '1'], answer: 1, explanation: 'Pure water is neutral with pH 7.' },
        { id: 3, question: 'Electron sharing forms a:', options: ['Ionic bond', 'Covalent bond', 'Metallic bond', 'H-bond'], answer: 1, explanation: 'Covalent bonds involve sharing of electrons.' },
        { id: 4, question: 'Molecular formula of glucose:', options: ['C₂H₅OH', 'C₆H₁₂O₆', 'C₁₂H₂₂O₁₁', 'CH₄'], answer: 1, explanation: 'Glucose: C₆H₁₂O₆' },
        { id: 5, question: 'Gas produced when zinc reacts with HCl:', options: ['Oxygen', 'CO₂', 'Hydrogen', 'Nitrogen'], answer: 2, explanation: 'Zn + 2HCl → ZnCl₂ + H₂' },
      ],
      biology: [
        { id: 1, question: 'Photosynthesis occurs in:', options: ['Mitochondria', 'Chloroplast', 'Nucleus', 'Ribosome'], answer: 1, explanation: 'Chloroplasts are the site of photosynthesis.' },
        { id: 2, question: 'Universal blood donor group:', options: ['A', 'B', 'AB', 'O'], answer: 3, explanation: 'O negative is the universal donor.' },
        { id: 3, question: 'Powerhouse of the cell:', options: ['Nucleus', 'Ribosome', 'Mitochondria', 'Golgi'], answer: 2, explanation: 'Mitochondria produce ATP.' },
        { id: 4, question: 'Vitamin essential for blood clotting:', options: ['A', 'B', 'C', 'K'], answer: 3, explanation: 'Vitamin K is needed for clotting factors.' },
        { id: 5, question: 'DNA stands for:', options: ['Deoxyribose Nucleic Acid', 'Deoxyribonucleic Acid', 'Dioxiribonucleic Acid', 'Double Nucleic Acid'], answer: 1, explanation: 'DNA = Deoxyribonucleic Acid' },
      ],
    }
    const base = q[subject] || q.mathematics
    // Repeat to fill the limit
    const result = []
    while (result.length < limit) {
      for (const item of base) {
        if (result.length >= limit) break
        result.push({ ...item, id: result.length + 1 })
      }
    }
    return result
  }

  const fillQuestionSet = (questionsList, limit, subject) => {
    const source = questionsList.length > 0 ? questionsList : getSampleQuestions(subject, limit)
    const result = []
    while (result.length < limit && source.length > 0) {
      for (const item of source) {
        if (result.length >= limit) break
        result.push({ ...item, id: result.length + 1 })
      }
    }
    return result
  }

  const submitExam = useCallback(async () => {
    if (done) return
    clearInterval(timerRef.current)
    setDone(true)
    // Calculate results
    const subjectResults = {}
    subjects.forEach(subj => {
      const group = subjectGroups[subj] || { start: 0, count: 0 }
      let correct = 0, total = 0
      for (let i = group.start; i < group.start + group.count; i++) {
        const q = questions[i]
        if (q && answers[i] !== undefined) {
          total++
          if (answers[i] === q.answer) correct++
        }
      }
      subjectResults[subj] = { correct, total: group.count, answered: total }
    })
    const totalCorrect = Object.values(subjectResults).reduce((s, r) => s + r.correct, 0)
    const totalQ = questions.length
    const score = Math.round((totalCorrect / Math.max(totalQ, 1)) * 400)
    const percentage = Math.round((totalCorrect / Math.max(totalQ, 1)) * 100)
    const examResult = { subjectResults, totalCorrect, totalQ, score, percentage, completedAt: new Date().toISOString() }
    setResults(examResult)
  }, [done, subjects, subjectGroups, questions, answers, user])

  const formatTime = (secs) => {
    const h = Math.floor(secs / 3600)
    const m = Math.floor((secs % 3600) / 60)
    const s = secs % 60
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-center text-white">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-orange-500 border-t-transparent mx-auto mb-4"></div>
        <p className="text-xl font-semibold">Loading exam questions...</p>
        <p className="text-gray-400 mt-2">Please wait</p>
      </div>
    </div>
  )

  if (done && results) {
    return (
      <div className="min-h-screen bg-gray-50 page-fade-in">
        <div className="max-w-3xl mx-auto px-4 py-8">
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-6">
            <div className={`p-8 text-white text-center ${results.percentage >= 70 ? 'bg-gradient-to-r from-green-500 to-emerald-600' : results.percentage >= 50 ? 'bg-gradient-to-r from-yellow-500 to-orange-500' : 'bg-gradient-to-r from-red-500 to-red-600'}`}>
              <div className="text-6xl font-bold mb-2">{results.score}</div>
              <div className="text-xl mb-1">out of 400 marks</div>
              <div className="text-lg opacity-90">{results.percentage}% accuracy</div>
              <div className="mt-3 text-xl">
                {results.percentage >= 70 ? '🎉 Excellent Performance!' : results.percentage >= 50 ? '👍 Good Effort - Keep Practicing!' : '📚 Keep Studying - You Can Do Better!'}
              </div>
            </div>
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Subject Breakdown</h3>
              <div className="space-y-3">
                {subjects.map(subj => {
                  const r = results.subjectResults[subj] || { correct: 0, total: 0 }
                  const pct = r.total > 0 ? Math.round((r.correct / r.total) * 100) : 0
                  return (
                    <div key={subj} className="flex items-center gap-4">
                      <div className="w-32 text-sm font-medium capitalize text-gray-700">{subj}</div>
                      <div className="flex-1 bg-gray-200 rounded-full h-3">
                        <div className={`h-3 rounded-full ${pct >= 70 ? 'bg-green-500' : pct >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${pct}%` }}></div>
                      </div>
                      <div className="text-sm font-bold text-gray-900 w-20 text-right">{r.correct}/{r.total} ({pct}%)</div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            <button onClick={() => navigate('/exam')} className="flex-1 bg-orange-500 text-white py-4 rounded-xl font-bold text-lg hover:bg-orange-600 transition-colors">
              <i className="fas fa-redo mr-2"></i>Take Another Exam
            </button>
            <button onClick={() => navigate('/analytics')} className="flex-1 border-2 border-blue-600 text-blue-600 py-4 rounded-xl font-bold text-lg hover:bg-blue-50 transition-colors">
              <i className="fas fa-chart-bar mr-2"></i>View Analytics
            </button>
            <button onClick={() => navigate('/')} className="flex-1 border-2 border-gray-300 text-gray-700 py-4 rounded-xl font-bold text-lg hover:bg-gray-50 transition-colors">
              <i className="fas fa-home mr-2"></i>Home
            </button>
          </div>
        </div>
      </div>
    )
  }

  const q = questions[currentQ]
  const isAnswered = answers[currentQ] !== undefined
  const answeredCount = Object.keys(answers).length
  const timerColor = timeLeft < 300 ? 'text-red-500' : timeLeft < 600 ? 'text-yellow-500' : 'text-green-500'

  return (
    <div className="min-h-screen bg-gray-900 font-sans page-fade-in">
      {/* Exam Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-orange-500 rounded-lg p-2">
              <i className="fas fa-graduation-cap text-white"></i>
            </div>
            <div>
              <div className="text-white font-bold text-sm">JambGenius Mock Exam</div>
              <div className="text-gray-400 text-xs">{answeredCount}/{questions.length} answered</div>
            </div>
          </div>
          <div className={`font-mono text-2xl font-bold ${timerColor}`}>
            <i className="fas fa-clock mr-2"></i>{formatTime(timeLeft)}
          </div>
          <button onClick={() => { if (window.confirm('Submit exam now? This cannot be undone.')) submitExam() }}
            className="bg-orange-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-orange-600 transition-colors text-sm">
            Submit Exam
          </button>
        </div>
      </div>

      {/* Subject tabs */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-2">
        <div className="max-w-6xl mx-auto flex gap-2 overflow-x-auto">
          {subjects.map(subj => {
            const group = subjectGroups[subj]
            const isActive = currentSubject === subj
            return (
              <button
                key={subj}
                onClick={() => { setCurrentSubject(subj); setCurrentQ(group?.start || 0) }}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${isActive ? 'bg-orange-500 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
              >
                <span className="capitalize">{subj}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 flex gap-6">
        {/* Question */}
        <div className="flex-1">
          {q && (
            <>
              <div className="bg-gray-800 rounded-xl p-6 mb-4">
                <p className="text-gray-400 text-sm mb-3">Question {currentQ + 1} of {questions.length}</p>
                <p className="text-white text-lg font-medium leading-relaxed">{q.question}</p>
              </div>
              <div className="space-y-3">
                {q.options.map((opt, i) => {
                  const isSelected = answers[currentQ] === i
                  return (
                    <button
                      key={i}
                      onClick={() => setAnswers(prev => ({ ...prev, [currentQ]: i }))}
                      className={`w-full p-4 text-left rounded-xl border-2 font-medium transition-all ${isSelected ? 'border-orange-500 bg-orange-500/20 text-orange-300' : 'border-gray-700 bg-gray-800 text-gray-300 hover:border-orange-400 hover:bg-gray-700'}`}
                    >
                      <span className="mr-3 font-bold text-orange-400">{String.fromCharCode(65 + i)}.</span>{opt}
                    </button>
                  )
                })}
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setCurrentQ(q => Math.max(0, q - 1))} disabled={currentQ === 0}
                  className="flex-1 py-3 border border-gray-600 text-gray-300 rounded-xl font-semibold hover:bg-gray-800 disabled:opacity-30 transition-colors">
                  <i className="fas fa-arrow-left mr-2"></i>Previous
                </button>
                <button onClick={() => setCurrentQ(q => Math.min(questions.length - 1, q + 1))} disabled={currentQ === questions.length - 1}
                  className="flex-1 py-3 bg-orange-500 text-white rounded-xl font-semibold hover:bg-orange-600 disabled:opacity-30 transition-colors">
                  Next<i className="fas fa-arrow-right ml-2"></i>
                </button>
              </div>
            </>
          )}
        </div>

        {/* Question navigator */}
        <div className="hidden lg:block w-64">
          <div className="bg-gray-800 rounded-xl p-4 sticky top-20">
            <h3 className="text-white font-bold mb-3 text-sm">Question Navigator</h3>
            <div className="grid grid-cols-5 gap-1.5">
              {questions.map((_, i) => (
                <button
                  key={i}
                  onClick={() => { setCurrentQ(i); setCurrentSubject(_.subject) }}
                  className={`w-8 h-8 rounded text-xs font-bold transition-colors ${i === currentQ ? 'bg-orange-500 text-white' : answers[i] !== undefined ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <div className="mt-3 space-y-1.5 text-xs">
              <div className="flex items-center gap-2"><div className="w-4 h-4 bg-orange-500 rounded"></div><span className="text-gray-400">Current</span></div>
              <div className="flex items-center gap-2"><div className="w-4 h-4 bg-green-600 rounded"></div><span className="text-gray-400">Answered</span></div>
              <div className="flex items-center gap-2"><div className="w-4 h-4 bg-gray-700 rounded"></div><span className="text-gray-400">Unanswered</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
