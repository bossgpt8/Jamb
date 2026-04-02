import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

const CHALLENGE_KEY = 'jg_daily_challenge'
const QUESTIONS_COUNT = 5

function getTimeUntilMidnight() {
  const now = new Date()
  const midnight = new Date(now)
  midnight.setHours(24, 0, 0, 0)
  return midnight - now
}

function formatCountdown(ms) {
  if (ms <= 0) return '00:00:00'
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  return [h, m, s].map(v => String(v).padStart(2, '0')).join(':')
}

export default function DailyChallenge() {
  const navigate = useNavigate()
  const [phase, setPhase] = useState('loading') // loading | locked | playing | done
  const [questions, setQuestions] = useState([])
  const [currentQ, setCurrentQ] = useState(0)
  const [selected, setSelected] = useState(null)
  const [answered, setAnswered] = useState(false)
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [countdown, setCountdown] = useState(0)
  const [aiExplanation, setAiExplanation] = useState('')
  const [loadingExplanation, setLoadingExplanation] = useState(false)

  useEffect(() => {
    document.title = 'Daily Challenge | JambGenius'
    checkAndLoad()
  }, [])

  // Countdown timer
  useEffect(() => {
    if (phase !== 'locked') return
    setCountdown(getTimeUntilMidnight())
    const timer = setInterval(() => {
      const ms = getTimeUntilMidnight()
      setCountdown(ms)
      if (ms <= 0) { clearInterval(timer); checkAndLoad() }
    }, 1000)
    return () => clearInterval(timer)
  }, [phase])

  const checkAndLoad = async () => {
    const saved = JSON.parse(localStorage.getItem(CHALLENGE_KEY) || '{}')
    const today = new Date().toDateString()
    const s = parseInt(localStorage.getItem('jambgenius_streak') || '0')
    setStreak(s)

    if (saved.completedDate === today) {
      setScore(saved.score || 0)
      setPhase('locked')
      return
    }

    // Load questions from MongoDB
    try {
      const res = await fetch(`/api/questions?type=daily&count=${QUESTIONS_COUNT}`)
      const data = await res.json()
      if (data.success && data.questions?.length >= QUESTIONS_COUNT) {
        setQuestions(data.questions)
      } else {
        setQuestions(getFallbackQuestions())
      }
    } catch {
      setQuestions(getFallbackQuestions())
    }
    setPhase('playing')
  }

  const getFallbackQuestions = () => [
    { id: 1, question: 'Which of the following is the correct formula for water?', options: ['H₂O₂', 'H₂O', 'HO', 'H₃O'], answer: 1, subject: 'Chemistry' },
    { id: 2, question: 'What is the capital of Nigeria?', options: ['Lagos', 'Kano', 'Abuja', 'Ibadan'], answer: 2, subject: 'Government' },
    { id: 3, question: 'If f(x) = 2x + 3, find f(5).', options: ['10', '13', '16', '11'], answer: 1, subject: 'Mathematics' },
    { id: 4, question: 'Which organelle is known as the powerhouse of the cell?', options: ['Nucleus', 'Ribosome', 'Mitochondria', 'Golgi body'], answer: 2, subject: 'Biology' },
    { id: 5, question: "Newton's first law of motion is also known as the law of:", options: ['Acceleration', 'Gravity', 'Inertia', 'Momentum'], answer: 2, subject: 'Physics' },
  ]

  const handleAnswer = async (idx) => {
    if (answered) return
    setSelected(idx)
    setAnswered(true)
    const q = questions[currentQ]
    const isCorrect = idx === q.answer
    if (isCorrect) setScore(s => s + 1)

    // Fetch AI explanation
    setLoadingExplanation(true)
    setAiExplanation('')
    try {
      const opts = {}
      q.options.forEach((o, i) => opts[String.fromCharCode(65 + i)] = o)
      const res = await fetch('/api/gemini-explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: q.question,
          options: opts,
          correctAnswer: q.options[q.answer],
          userAnswer: q.options[idx]
        })
      })
      const data = await res.json()
      if (data.success) setAiExplanation(data.explanation)
      else setAiExplanation(q.explanation || 'No explanation available.')
    } catch {
      setAiExplanation(q.explanation || 'Could not load explanation.')
    } finally {
      setLoadingExplanation(false)
    }
  }

  const next = () => {
    if (currentQ + 1 >= questions.length) {
      const finalScore = score + (selected === questions[currentQ].answer ? 0 : 0) // score already updated
      const today = new Date().toDateString()
      const lastDay = localStorage.getItem('jg_last_challenge_day')
      let s = parseInt(localStorage.getItem('jambgenius_streak') || '0')
      if (lastDay !== today) {
        s += 1
        localStorage.setItem('jambgenius_streak', s.toString())
        localStorage.setItem('jg_last_challenge_day', today)
        setStreak(s)
      }
      localStorage.setItem(CHALLENGE_KEY, JSON.stringify({ completedDate: today, score }))
      setPhase('done')
    } else {
      setCurrentQ(q => q + 1)
      setSelected(null)
      setAnswered(false)
      setAiExplanation('')
    }
  }

  const q = questions[currentQ]
  const pct = Math.round(((currentQ + (answered ? 1 : 0)) / QUESTIONS_COUNT) * 100)

  // Loading screen
  if (phase === 'loading') return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600">Loading today's challenge...</p>
      </div>
    </div>
  )

  // Locked / already completed
  if (phase === 'locked') return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50 flex items-center justify-center p-4 page-fade-in">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
        <div className="w-24 h-24 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <i className="fas fa-fire text-5xl text-orange-500"></i>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-1">You're done for today! 🎉</h2>
        <p className="text-gray-500 mb-4 text-sm">Great work! Come back tomorrow for a new challenge.</p>

        <div className="bg-orange-50 border border-orange-200 rounded-xl p-5 mb-6">
          <p className="text-sm text-orange-600 font-medium mb-2">🔥 {streak} Day Streak!</p>
          <p className="text-sm text-gray-500 mb-3">Next challenge unlocks in:</p>
          <div className="text-4xl font-bold text-orange-600 font-mono tracking-wider">
            {formatCountdown(countdown)}
          </div>
          <p className="text-xs text-gray-400 mt-2">HH : MM : SS</p>
        </div>

        <div className="flex gap-3">
          <button onClick={() => navigate('/practice')} className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors">
            <i className="fas fa-book-open mr-2"></i>Keep Practicing
          </button>
          <button onClick={() => navigate('/')} className="flex-1 border-2 border-gray-200 text-gray-700 py-3 rounded-xl font-semibold hover:border-gray-300 transition-colors">
            <i className="fas fa-home mr-2"></i>Home
          </button>
        </div>
      </div>
    </div>
  )

  // Done screen
  if (phase === 'done') return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 page-fade-in">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
        <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <i className={`fas ${score >= 4 ? 'fa-trophy text-yellow-500' : score >= 2 ? 'fa-star text-blue-500' : 'fa-redo text-gray-400'} text-4xl`}></i>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Challenge Complete!</h2>
        <p className="text-gray-600 mb-1">You scored <span className="font-bold text-blue-600">{score} / {QUESTIONS_COUNT}</span></p>
        <p className="text-sm text-gray-500 mb-4">{score >= 4 ? 'Excellent! 🌟' : score >= 2 ? 'Good effort! 💪' : 'Keep studying! 📚'}</p>
        <div className="bg-orange-50 rounded-xl p-4 mb-6">
          <i className="fas fa-fire text-orange-500 text-2xl mb-2 block"></i>
          <p className="font-bold text-gray-900">{streak} Day Streak!</p>
          <p className="text-sm text-gray-500 mt-1">Come back tomorrow to keep it going!</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => navigate('/practice')} className="flex-1 bg-green-500 text-white py-3 rounded-xl font-semibold hover:bg-green-600 transition-colors">Keep Practicing</button>
          <button onClick={() => navigate('/')} className="flex-1 border-2 border-gray-200 text-gray-700 py-3 rounded-xl font-semibold">Home</button>
        </div>
      </div>
    </div>
  )

  // Playing
  return (
    <div className="min-h-screen bg-gray-50 font-sans page-fade-in">
      <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <button onClick={() => navigate('/')} className="flex items-center">
              <i className="fas fa-graduation-cap text-2xl text-blue-600 mr-2"></i>
              <span className="text-xl font-bold text-gray-900">JambGenius</span>
            </button>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-orange-50 px-3 py-2 rounded-lg">
                <i className="fas fa-fire text-orange-500"></i>
                <span className="font-bold text-orange-700">{streak} Day Streak</span>
              </div>
              <button onClick={() => navigate('/')} className="text-gray-600 hover:text-blue-600 text-sm">
                <i className="fas fa-times"></i>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl font-bold text-gray-900">⚡ Daily Challenge</h1>
            <span className="text-sm text-gray-500 bg-white px-3 py-1 rounded-full border">{currentQ + 1} / {QUESTIONS_COUNT}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div className="bg-gradient-to-r from-orange-400 to-orange-600 h-2.5 rounded-full transition-all duration-500" style={{ width: `${pct}%` }}></div>
          </div>
        </div>

        {q && (
          <div className="bg-white rounded-2xl shadow-sm p-6 mb-4">
            <div className="flex items-center gap-2 mb-4">
              <span className="bg-blue-100 text-blue-600 text-xs px-3 py-1 rounded-full font-semibold">{q.subject || 'General'}</span>
              <span className="bg-orange-100 text-orange-600 text-xs px-3 py-1 rounded-full font-semibold">Daily</span>
            </div>
            <p className="text-lg font-semibold text-gray-900 mb-6 leading-relaxed">{q.question}</p>
            <div className="space-y-3">
              {q.options.map((opt, i) => {
                let cls = 'w-full p-4 text-left rounded-xl border-2 font-medium transition-all flex items-center gap-3 '
                if (!answered) cls += 'border-gray-200 hover:border-blue-400 hover:bg-blue-50 text-gray-700 cursor-pointer'
                else if (i === q.answer) cls += 'border-green-500 bg-green-50 text-green-800'
                else if (i === selected && i !== q.answer) cls += 'border-red-500 bg-red-50 text-red-700'
                else cls += 'border-gray-200 text-gray-400'
                return (
                  <button key={i} onClick={() => handleAnswer(i)} className={cls}>
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                      !answered ? 'bg-gray-100' :
                      i === q.answer ? 'bg-green-500 text-white' :
                      i === selected ? 'bg-red-500 text-white' : 'bg-gray-100'
                    }`}>{String.fromCharCode(65 + i)}</span>
                    {opt}
                    {answered && i === q.answer && <i className="fas fa-check text-green-500 ml-auto"></i>}
                    {answered && i === selected && i !== q.answer && <i className="fas fa-times text-red-500 ml-auto"></i>}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* AI Explanation */}
        {answered && (
          <div className={`mb-4 rounded-xl overflow-hidden border ${selected === q?.answer ? 'border-green-200' : 'border-red-200'}`}>
            <div className={`px-4 py-3 ${selected === q?.answer ? 'bg-green-50' : 'bg-red-50'}`}>
              <p className={`font-semibold text-sm ${selected === q?.answer ? 'text-green-700' : 'text-red-700'}`}>
                {selected === q?.answer ? '✅ Correct! Well done!' : `❌ Incorrect. The answer is ${String.fromCharCode(65 + (q?.answer ?? 0))}.`}
              </p>
            </div>
            <div className="bg-indigo-50 border-t border-indigo-100 px-4 py-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold text-indigo-600 flex items-center gap-1">
                  <i className="fas fa-robot"></i> AI Explanation (Grok)
                </span>
              </div>
              {loadingExplanation ? (
                <div className="flex items-center gap-2 text-indigo-400 text-sm">
                  <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
                  Generating explanation...
                </div>
              ) : (
                <p className="text-gray-700 text-sm leading-relaxed">{aiExplanation}</p>
              )}
            </div>
          </div>
        )}

        {answered && (
          <button onClick={next} className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 rounded-xl font-bold text-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md">
            {currentQ + 1 >= QUESTIONS_COUNT ? '🏆 See Results' : 'Next Question →'}
          </button>
        )}
      </div>
    </div>
  )
}
