import { useNavigate } from 'react-router-dom'

export default function StudyTips() {
  const navigate = useNavigate()

  const tips = [
    { icon: 'fa-calendar-check', color: 'blue', title: 'Create a Study Schedule', content: 'Plan your study time in advance. Dedicate at least 2-3 hours daily to JAMB preparation. Break your sessions into 45-minute blocks with 15-minute breaks to maintain focus and retention.' },
    { icon: 'fa-crosshairs', color: 'red', title: 'Know the Exam Format', content: 'JAMB CBT has 180 questions in 2 hours across 4 subjects. Use of English is compulsory. Practice time management: allocate about 40 seconds per question to complete all questions within the time limit.' },
    { icon: 'fa-star', color: 'yellow', title: 'Master High-Frequency Topics', content: 'Focus on topics that appear repeatedly in past JAMB questions. For Mathematics: Algebra, Geometry, and Statistics. For English: Comprehension, Lexis, and Structure. For Sciences: Core concepts and applications.' },
    { icon: 'fa-sync', color: 'green', title: 'Practice Past Questions', content: 'Practice with JAMB past questions from 2010-2024. This helps you understand question patterns, familiarize yourself with the CBT format, and identify your weak areas for targeted improvement.' },
    { icon: 'fa-brain', color: 'purple', title: 'Use Active Recall', content: 'After reading a topic, close your book and write down everything you remember. This technique is proven to improve memory retention by up to 50% compared to passive re-reading.' },
    { icon: 'fa-users', color: 'orange', title: 'Form Study Groups', content: 'Study with peers who are equally committed. Teaching concepts to others solidifies your understanding. Use JambGenius Community Chat to connect with study partners and discuss difficult topics.' },
    { icon: 'fa-moon', color: 'indigo', title: 'Get Adequate Sleep', content: 'Sleep is crucial for memory consolidation. Aim for 7-8 hours each night. Avoid all-night cramming sessions, especially close to your exam date. A well-rested brain performs significantly better.' },
    { icon: 'fa-apple-alt', color: 'red', title: 'Maintain Good Health', content: 'Eat brain-boosting foods like fish, nuts, and vegetables. Stay hydrated throughout your study sessions. Regular exercise improves blood flow to the brain and reduces stress and anxiety.' },
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

      <section className="bg-gradient-to-br from-blue-50 to-indigo-100 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm font-medium mb-4">
            <i className="fas fa-lightbulb mr-2 text-yellow-500"></i>Expert Study Strategies
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">JAMB Study Tips & Strategies</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">Proven techniques to maximize your JAMB score and study more effectively</p>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="grid md:grid-cols-2 gap-6">
          {tips.map((tip, i) => (
            <div key={i} className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-all border border-gray-100">
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 bg-${tip.color}-100 rounded-xl flex items-center justify-center flex-shrink-0`}>
                  <i className={`fas ${tip.icon} text-${tip.color}-600 text-xl`}></i>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{tip.title}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{tip.content}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-8 text-white text-center">
          <h2 className="text-2xl font-bold mb-3">Ready to Put These Tips Into Practice?</h2>
          <p className="text-blue-100 mb-6">Start practicing with our 50,000+ JAMB questions and track your improvement</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button onClick={() => navigate('/practice')} className="bg-white text-blue-600 px-8 py-3 rounded-xl font-bold hover:bg-blue-50 transition-all">
              <i className="fas fa-book-open mr-2"></i>Start Practice
            </button>
            <button onClick={() => navigate('/daily-challenge')} className="border-2 border-white text-white px-8 py-3 rounded-xl font-bold hover:bg-white hover:text-blue-600 transition-all">
              <i className="fas fa-fire mr-2"></i>Daily Challenge
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
