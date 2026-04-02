import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

const QUESTIONS_PER_SESSION = 20

export default function PracticeExam() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const subject = searchParams.get('subject') || 'mathematics'
  const [questions, setQuestions] = useState([])
  const [currentQ, setCurrentQ] = useState(0)
  const [selected, setSelected] = useState({})
  const [answered, setAnswered] = useState({})
  const [bookmarks, setBookmarks] = useState(() => JSON.parse(localStorage.getItem('jambgenius_bookmarks') || '[]'))
  const [loading, setLoading] = useState(true)
  const [done, setDone] = useState(false)
  const [aiExplanation, setAiExplanation] = useState({}) // { [qIndex]: string }
  const [loadingExplanation, setLoadingExplanation] = useState(false)

  useEffect(() => {
    document.title = `Practice ${subject} | JambGenius`
    loadQuestions()
  }, [subject])

  const loadQuestions = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/questions?subject=${subject}&limit=${QUESTIONS_PER_SESSION}`)
      const data = await res.json()
      console.log(`Questions API response:`, data.count, 'questions, success:', data.success)
      if (data.success && data.questions && data.questions.length > 0) {
        setQuestions(data.questions)
        console.log(`✅ Loaded ${data.questions.length} questions from MongoDB`)
      } else {
        console.warn('No questions from MongoDB, using fallback. Error:', data.error)
        setQuestions(getFallback(subject))
      }
    } catch (err) {
      console.error('Failed to load questions:', err)
      setQuestions(getFallback(subject))
    }
    setLoading(false)
  }

  const getFallback = (subj) => {
    const bank = {
      mathematics: [
        { id: 1, question: 'If 3x + 2 = 14, find x.', options: ['2', '3', '4', '5'], answer: 2, explanation: '3x = 12, so x = 4' },
        { id: 2, question: 'What is 15% of 200?', options: ['20', '25', '30', '35'], answer: 2, explanation: '15/100 × 200 = 30' },
        { id: 3, question: 'Simplify: 2³ × 2²', options: ['2⁵', '2⁶', '4⁵', '8³'], answer: 0, explanation: '2³ × 2² = 2^5 = 32' },
        { id: 4, question: 'Find the HCF of 12 and 18.', options: ['3', '6', '9', '12'], answer: 1, explanation: 'HCF of 12 and 18 is 6' },
        { id: 5, question: 'Area of circle with radius 7cm (π=22/7)?', options: ['44 cm²', '154 cm²', '22 cm²', '49 cm²'], answer: 1, explanation: 'Area = πr² = 22/7 × 49 = 154 cm²' },
      ],
      english: [
        { id: 1, question: 'Word closest in meaning to "BENEVOLENT"?', options: ['Cruel', 'Kind', 'Wise', 'Selfish'], answer: 1, explanation: 'Benevolent means kind and well-meaning.' },
        { id: 2, question: '"The moon is a silver coin." — This is?', options: ['Simile', 'Metaphor', 'Personification', 'Hyperbole'], answer: 1, explanation: 'Direct comparison without like/as = metaphor.' },
        { id: 3, question: 'Which sentence is correct?', options: ["He don't know", "He doesn't knows", "He doesn't know", 'He do not knows'], answer: 2, explanation: "Use doesn't with base form of verb." },
        { id: 4, question: 'Correct plural of "phenomenon"?', options: ['Phenomenons', 'Phenomenon', 'Phenomena', 'Phenomenas'], answer: 2, explanation: 'Phenomena is the Greek plural.' },
        { id: 5, question: '"The soup smells delicious" — verb type?', options: ['Action', 'Linking', 'Auxiliary', 'Transitive'], answer: 1, explanation: 'Smells links subject to predicate adjective.' },
      ],
      physics: [
        { id: 1, question: 'Which is a vector quantity?', options: ['Speed', 'Mass', 'Velocity', 'Temperature'], answer: 2, explanation: 'Velocity has magnitude and direction.' },
        { id: 2, question: 'SI unit of force?', options: ['Watt', 'Joule', 'Newton', 'Pascal'], answer: 2, explanation: 'Force is measured in Newtons (N).' },
        { id: 3, question: 'Highest frequency EM wave?', options: ['Radio', 'Infrared', 'Visible light', 'Gamma rays'], answer: 3, explanation: 'Gamma rays have shortest wavelength, highest frequency.' },
        { id: 4, question: 'Law of conservation of energy says:', options: ['Energy can be created', 'Energy can be destroyed', 'Energy cannot be created or destroyed', 'Energy is always kinetic'], answer: 2, explanation: 'Energy converts form, never created or destroyed.' },
        { id: 5, question: 'Sound travels fastest in:', options: ['Air', 'Water', 'Vacuum', 'Steel'], answer: 3, explanation: 'Sound travels fastest in solids like steel (~5960 m/s).' },
      ],
      chemistry: [
        { id: 1, question: 'Atomic number of Carbon?', options: ['6', '12', '8', '4'], answer: 0, explanation: 'Carbon has 6 protons, so atomic number = 6.' },
        { id: 2, question: 'Bond formed by sharing electrons?', options: ['Ionic', 'Covalent', 'Metallic', 'Hydrogen'], answer: 1, explanation: 'Covalent bonds share electrons.' },
        { id: 3, question: 'pH of pure water?', options: ['0', '7', '14', '1'], answer: 1, explanation: 'Pure water is neutral at pH 7.' },
        { id: 4, question: 'Gas produced when Zn reacts with HCl?', options: ['Oxygen', 'CO₂', 'Hydrogen', 'Nitrogen'], answer: 2, explanation: 'Zn + 2HCl → ZnCl₂ + H₂' },
        { id: 5, question: 'Molecular formula of glucose?', options: ['C₂H₅OH', 'C₆H₁₂O₆', 'C₁₂H₂₂O₁₁', 'CH₄'], answer: 1, explanation: 'Glucose is C₆H₁₂O₆.' },
      ],
      biology: [
        { id: 1, question: 'Photosynthesis occurs in?', options: ['Mitochondria', 'Chloroplast', 'Nucleus', 'Ribosome'], answer: 1, explanation: 'Chloroplasts contain chlorophyll for photosynthesis.' },
        { id: 2, question: 'Universal blood donor?', options: ['A', 'B', 'AB', 'O'], answer: 3, explanation: 'O- has no A, B, or Rh antigens.' },
        { id: 3, question: 'Powerhouse of the cell?', options: ['Nucleus', 'Ribosome', 'Mitochondria', 'Golgi body'], answer: 2, explanation: 'Mitochondria produce ATP.' },
        { id: 4, question: 'Vitamin essential for blood clotting?', options: ['Vitamin A', 'Vitamin B', 'Vitamin C', 'Vitamin K'], answer: 3, explanation: 'Vitamin K synthesises clotting factors.' },
        { id: 5, question: 'DNA stands for?', options: ['Deoxyribose Nucleic Acid', 'Deoxyribonucleic Acid', 'Dioxiribonucleic Acid', 'Deoxyribo Nucleic Acid'], answer: 1, explanation: 'DNA = Deoxyribonucleic Acid.' },
      ],
    }
    return (bank[subj] || bank.mathematics).map((q, i) => ({ ...q, id: i + 1 }))
  }

  const fetchAIExplanation = async (qIdx) => {
    const q = questions[qIdx]
    if (!q || aiExplanation[qIdx]) return
    setLoadingExplanation(true)
    try {
      const opts = {}
      q.options.forEach((o, i) => { opts[String.fromCharCode(65 + i)] = o })
      const userAnswerIdx = selected[qIdx]
      const res = await fetch('/api/gemini-explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: q.question,
          options: opts,
          correctAnswer: q.options[q.answer],
          userAnswer: userAnswerIdx !== undefined ? q.options[userAnswerIdx] : undefined
        })
      })
      const data = await res.json()
      const explanation = data.success ? data.explanation : (q.explanation || 'No explanation available.')
      setAiExplanation(prev => ({ ...prev, [qIdx]: explanation }))
    } catch {
      setAiExplanation(prev => ({ ...prev, [qIdx]: q.explanation || 'Could not load explanation.' }))
    } finally {
      setLoadingExplanation(false)
    }
  }

  const handleAnswer = async (optionIndex) => {
    const q = questions[currentQ]
    if (!q || answered[currentQ] !== undefined) return
    setSelected(prev => ({ ...prev, [currentQ]: optionIndex }))
    setAnswered(prev => ({ ...prev, [currentQ]: true }))
    // Fetch AI explanation immediately after answering
    fetchAIExplanation(currentQ)
  }

  const toggleBookmark = () => {
    const q = questions[currentQ]
    if (!q) return
    const isBookmarked = bookmarks.some(b => b.id === q.id && b.subject === subject)
    const newBookmarks = isBookmarked
      ? bookmarks.filter(b => !(b.id === q.id && b.subject === subject))
      : [...bookmarks, { id: q.id, subject, question: q.question }]
    setBookmarks(newBookmarks)
    localStorage.setItem('jambgenius_bookmarks', JSON.stringify(newBookmarks))
  }

  const nextQuestion = () => {
    if (currentQ + 1 >= questions.length) {
      endSession()
    } else {
      setCurrentQ(q => q + 1)
    }
  }

  const endSession = () => {
    const total = Object.keys(answered).length
    const correct = Object.keys(answered).filter(i => selected[i] === questions[parseInt(i)].answer).length
    const percentage = total > 0 ? Math.round((correct / total) * 100) : 0
    const session = { subject, correct, answered: total, date: new Date().toISOString(), percentage, mode: 'practice' }
    const sessions = JSON.parse(localStorage.getItem('jambgenius_sessions') || '[]')
    sessions.push(session)
    localStorage.setItem('jambgenius_sessions', JSON.stringify(sessions))
    setDone(true)
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
        <p className="text-gray-600 font-medium">Loading questions from MongoDB...</p>
        <p className="text-gray-400 text-sm mt-1">Getting {QUESTIONS_PER_SESSION} {subject} questions</p>
      </div>
    </div>
  )

  if (done) {
    const total = Object.keys(answered).length
    const correct = Object.keys(answered).filter(i => selected[i] === questions[parseInt(i)]?.answer).length
    const pct = total > 0 ? Math.round((correct / total) * 100) : 0
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 page-fade-in">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4 ${pct >= 70 ? 'bg-green-100' : pct >= 50 ? 'bg-yellow-100' : 'bg-red-100'}`}>
            <span className={`text-3xl font-bold ${pct >= 70 ? 'text-green-600' : pct >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>{pct}%</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Session Complete!</h2>
          <p className="text-gray-600 mb-2">You got <span className="font-bold text-blue-600">{correct}</span> out of <span className="font-bold">{total}</span> correct</p>
          <p className={`font-semibold mb-6 ${pct >= 70 ? 'text-green-600' : pct >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
            {pct >= 70 ? '🎉 Excellent work!' : pct >= 50 ? '👍 Good effort! Keep practicing.' : '📚 Keep studying, you\'ll improve!'}
          </p>
          <div className="flex gap-3">
            <button onClick={() => navigate('/practice')} className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors">New Subject</button>
            <button onClick={() => { setCurrentQ(0); setSelected({}); setAnswered({}); setAiExplanation({}); setDone(false); loadQuestions() }}
              className="flex-1 border-2 border-blue-600 text-blue-600 py-3 rounded-xl font-semibold hover:bg-blue-50 transition-colors">Retry</button>
          </div>
          <button onClick={() => navigate('/analytics')} className="w-full mt-3 text-gray-500 hover:text-blue-600 text-sm">
            <i className="fas fa-chart-bar mr-1"></i>View Analytics
          </button>
        </div>
      </div>
    )
  }

  const q = questions[currentQ]
  if (!q) return null
  const isAnswered = answered[currentQ] !== undefined
  const isBookmarked = bookmarks.some(b => b.id === q.id && b.subject === subject)
  const progress = Math.round(((currentQ + (isAnswered ? 1 : 0)) / questions.length) * 100)
  const currentExplanation = aiExplanation[currentQ]

  return (
    <div className="min-h-screen bg-gray-50 font-sans page-fade-in">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-50">
        <button onClick={() => navigate('/practice')} className="flex items-center text-gray-600 hover:text-blue-600 font-medium">
          <i className="fas fa-times mr-2"></i>Exit
        </button>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600 font-semibold capitalize">{subject}</span>
          <span className="text-sm text-gray-400">{currentQ + 1}/{questions.length}</span>
        </div>
        <button onClick={toggleBookmark} className={`text-xl transition-colors ${isBookmarked ? 'text-yellow-500' : 'text-gray-300 hover:text-yellow-500'}`}>
          <i className="fas fa-bookmark"></i>
        </button>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-200 h-1.5">
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 h-1.5 transition-all duration-500" style={{ width: `${progress}%` }}></div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Question card */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-4 border border-gray-100">
          <p className="text-xs text-gray-400 mb-1 font-medium uppercase tracking-wide">Question {currentQ + 1} of {questions.length}</p>
          <p className="text-lg font-semibold text-gray-900 leading-relaxed">{q.question}</p>
          {q.year && <p className="text-xs text-gray-400 mt-2">JAMB {q.year}</p>}
        </div>

        {/* Options */}
        <div className="space-y-3 mb-4">
          {q.options.map((opt, i) => {
            const isCorrect = i === q.answer
            const isSelected = selected[currentQ] === i
            let cls = 'w-full p-4 text-left rounded-xl border-2 font-medium transition-all flex items-center gap-3 '
            if (!isAnswered) {
              cls += 'border-gray-200 hover:border-blue-400 hover:bg-blue-50 text-gray-700 cursor-pointer'
            } else if (isCorrect) {
              cls += 'border-green-500 bg-green-50 text-green-800'
            } else if (isSelected && !isCorrect) {
              cls += 'border-red-400 bg-red-50 text-red-700'
            } else {
              cls += 'border-gray-100 text-gray-400 cursor-not-allowed'
            }
            return (
              <button key={i} onClick={() => handleAnswer(i)} className={cls} disabled={isAnswered}>
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 transition-colors ${
                  !isAnswered ? 'bg-gray-100 text-gray-600' :
                  isCorrect ? 'bg-green-500 text-white' :
                  isSelected ? 'bg-red-400 text-white' : 'bg-gray-100 text-gray-400'
                }`}>{String.fromCharCode(65 + i)}</span>
                <span className="flex-1">{opt}</span>
                {isAnswered && isCorrect && <i className="fas fa-check-circle text-green-500 text-lg ml-auto flex-shrink-0"></i>}
                {isAnswered && isSelected && !isCorrect && <i className="fas fa-times-circle text-red-400 text-lg ml-auto flex-shrink-0"></i>}
              </button>
            )
          })}
        </div>

        {/* AI Explanation Panel */}
        {isAnswered && (
          <div className="mb-4 rounded-2xl overflow-hidden border border-indigo-200 shadow-sm">
            {/* Result bar */}
            <div className={`px-4 py-3 flex items-center gap-2 ${selected[currentQ] === q.answer ? 'bg-green-50' : 'bg-red-50'}`}>
              <span className={`font-bold text-sm ${selected[currentQ] === q.answer ? 'text-green-700' : 'text-red-700'}`}>
                {selected[currentQ] === q.answer
                  ? '✅ Correct! Great job!'
                  : `❌ Wrong. The answer is ${String.fromCharCode(65 + q.answer)}: ${q.options[q.answer]}`
                }
              </span>
            </div>

            {/* AI explanation body */}
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 px-4 py-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-xs">🤖</span>
                </div>
                <span className="text-xs font-bold text-indigo-700 uppercase tracking-wide">AI Explanation · Grok</span>
              </div>

              {loadingExplanation && !currentExplanation ? (
                <div className="flex items-center gap-2 text-indigo-500">
                  <div className="flex gap-1">
                    {[0, 1, 2].map(d => (
                      <div key={d} className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: `${d * 150}ms` }} />
                    ))}
                  </div>
                  <span className="text-sm text-indigo-500">Generating explanation...</span>
                </div>
              ) : (
                <p className="text-gray-700 text-sm leading-relaxed">
                  {currentExplanation || q.explanation || 'Loading explanation...'}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Next button */}
        {isAnswered && (
          <button onClick={nextQuestion} className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 rounded-xl font-bold text-base hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md">
            {currentQ + 1 >= questions.length ? '🏁 Finish Session' : 'Next Question →'}
          </button>
        )}
      </div>
    </div>
  )
}
