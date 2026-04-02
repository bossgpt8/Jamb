import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function HelpCenter() {
  const navigate = useNavigate()
  const [openFaq, setOpenFaq] = useState(null)

  const faqs = [
    { q: 'How do I start practicing?', a: 'Click on "Practice Mode" from the home screen or bottom navigation. Select your subject and start answering questions at your own pace with no time limit.' },
    { q: 'What is Mock Exam Mode?', a: 'Mock Exam Mode simulates the real JAMB CBT exam with 180 questions across 4 subjects, with a 2-hour timer. It costs ₦1,000 per attempt and gives you detailed performance analytics.' },
    { q: 'How do I pay for Mock Exam?', a: 'Go to Exam Mode, select your 4 subjects, and click "Start Exam". You\'ll be redirected to our secure payment page where you can pay with Paystack (card, bank transfer, USSD).' },
    { q: 'Is my payment secure?', a: 'Yes! We use Paystack, Nigeria\'s most trusted payment gateway, for all transactions. Your card details are never stored on our servers.' },
    { q: 'What subjects are available?', a: 'We cover all major JAMB subjects: Use of English (mandatory), Mathematics, Physics, Chemistry, Biology, Government, Economics, Commerce, Literature, Geography, CRS, and Civic Education.' },
    { q: 'How does the AI Tutor work?', a: 'Our AI Tutor uses advanced language models to answer your questions about any JAMB topic. It provides explanations, examples, and study tips tailored to the JAMB syllabus.' },
    { q: 'Can I track my progress?', a: 'Yes! The Analytics section shows your session history, subject performance, accuracy rates, and study streak. Sign in to sync your progress across devices.' },
    { q: 'How do I report a wrong question?', a: 'If you find an error in a question, contact us through the Contact Us page with the question details and correct answer. Our team reviews all reports within 24 hours.' },
  ]

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

      <section className="bg-gradient-to-br from-cyan-50 to-blue-50 py-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-life-ring text-3xl text-blue-600"></i>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Help Center</h1>
          <p className="text-xl text-gray-600">Find answers to common questions about JambGenius</p>
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-8">
          {faqs.map((faq, i) => (
            <div key={i} className="border-b border-gray-100 last:border-0">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between p-6 text-left hover:bg-gray-50 transition-colors"
              >
                <span className="font-semibold text-gray-900">{faq.q}</span>
                <i className={`fas fa-chevron-${openFaq === i ? 'up' : 'down'} text-gray-400 transition-transform`}></i>
              </button>
              {openFaq === i && (
                <div className="px-6 pb-6 text-gray-600 leading-relaxed">{faq.a}</div>
              )}
            </div>
          ))}
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <button onClick={() => navigate('/contact')} className="flex items-center gap-4 bg-blue-50 p-6 rounded-xl hover:bg-blue-100 transition-colors text-left">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <i className="fas fa-envelope text-blue-600 text-xl"></i>
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Contact Support</h3>
              <p className="text-sm text-gray-600">Get help from our team</p>
            </div>
          </button>
          <button onClick={() => navigate('/community')} className="flex items-center gap-4 bg-green-50 p-6 rounded-xl hover:bg-green-100 transition-colors text-left">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <i className="fas fa-comments text-green-600 text-xl"></i>
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Community Chat</h3>
              <p className="text-sm text-gray-600">Ask fellow students</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}
