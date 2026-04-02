import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth } from '../firebase'
import { onAuthStateChanged } from 'firebase/auth'

export default function ExamPayment() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(false)
  const [credits, setCredits] = useState(0)

  useEffect(() => {
    document.title = 'Exam Payment - JambGenius'
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u)
        try {
          const idToken = await u.getIdToken()
          const res = await fetch('/api/get-credits', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken }) })
          const data = await res.json()
          if (data.success) setCredits(data.credits || 0)
        } catch (e) {}
      } else {
        navigate('/')
      }
    })
    return () => unsubscribe()
  }, [navigate])

  const handlePayment = async () => {
    if (!user) { navigate('/'); return }
    setLoading(true)
    try {
      const idToken = await user.getIdToken(true) // force refresh token
      const res = await fetch('/api/initiate-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken, email: user.email, credits: 1 })
      })
      const data = await res.json()
      if (data.authorization_url) {
        window.location.href = data.authorization_url
      } else {
        alert(data.error || 'Payment initiation failed. Please try again.')
      }
    } catch (e) {
      console.error('Payment error:', e)
      alert('Could not connect to payment server. Check your internet and try again.')
    }
    setLoading(false)
  }

  const useCredit = async () => {
    if (!user || credits <= 0) return
    sessionStorage.setItem('examSubjects', JSON.stringify(['english', 'mathematics', 'physics', 'chemistry']))
    navigate('/exam/room')
  }

  return (
    <div className="bg-gray-50 font-sans min-h-screen page-fade-in">
      <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <button onClick={() => navigate('/')} className="flex items-center">
              <i className="fas fa-graduation-cap text-2xl text-blue-600 mr-2"></i>
              <span className="text-xl font-bold text-gray-900">JambGenius </span>
            </button>
            <button onClick={() => navigate('/exam')} className="text-gray-600 hover:text-blue-600">
              <i className="fas fa-arrow-left mr-2"></i>Back
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-orange-500 to-red-500 p-8 text-white text-center">
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-trophy text-4xl"></i>
            </div>
            <h1 className="text-3xl font-bold mb-2">Unlock Mock Exam</h1>
            <p className="text-orange-100">Experience the real JAMB CBT exam format</p>
          </div>

          <div className="p-8">
            {credits > 0 ? (
              <div className="mb-6 bg-green-50 border border-green-200 rounded-xl p-6 text-center">
                <i className="fas fa-ticket-alt text-3xl text-green-500 mb-3 block"></i>
                <h3 className="text-xl font-bold text-gray-900 mb-1">You have {credits} Exam Credit{credits > 1 ? 's' : ''}!</h3>
                <p className="text-gray-600 mb-4">Use a credit to start your exam now</p>
                <button onClick={useCredit} className="bg-green-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-green-700 transition-colors">
                  <i className="fas fa-play mr-2"></i>Use Credit & Start Exam
                </button>
              </div>
            ) : null}

            <h2 className="text-xl font-bold text-gray-900 mb-4">Pay with Paystack</h2>
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-6 mb-6">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-bold text-gray-900 text-lg">Mock Exam Access</p>
                  <p className="text-gray-600 text-sm">180 questions • 2 hours • Full JAMB simulation</p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-orange-600">₦1,000</p>
                  <p className="text-xs text-gray-500">per attempt</p>
                </div>
              </div>
            </div>

            <ul className="space-y-2 mb-6 text-sm text-gray-700">
              {['Full JAMB CBT simulation with 180 questions', '2-hour timed exam experience', 'Choose your 4 subjects', 'Detailed score report and analytics', 'Instant access after payment'].map((f, i) => (
                <li key={i} className="flex items-center gap-2"><i className="fas fa-check-circle text-green-500"></i>{f}</li>
              ))}
            </ul>

            <button onClick={handlePayment} disabled={loading}
              className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white py-4 rounded-xl font-bold text-lg hover:from-orange-600 hover:to-red-600 transition-all shadow-lg">
              {loading ? <><i className="fas fa-spinner fa-spin mr-2"></i>Processing...</> : <><i className="fas fa-lock mr-2"></i>Pay ₦1,000 Securely</>}
            </button>

            <div className="mt-4 flex items-center justify-center gap-3 text-gray-500 text-sm">
              <i className="fas fa-shield-alt text-green-500"></i>
              <span>Secured by Paystack • SSL Encrypted</span>
            </div>

            <div className="mt-6 text-center">
              <button onClick={() => navigate('/practice')} className="text-gray-500 hover:text-blue-600 text-sm">
                <i className="fas fa-arrow-left mr-1"></i>Go back to free practice
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
