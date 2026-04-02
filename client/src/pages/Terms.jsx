import { useNavigate } from 'react-router-dom'

export default function Terms() {
  const navigate = useNavigate()
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
      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Terms of Service</h1>
        <p className="text-gray-500 mb-8">Last updated: January 2025</p>
        <div className="bg-white rounded-2xl shadow-sm p-8 space-y-6">
          {[
            { title: '1. Acceptance of Terms', content: 'By accessing or using JambGenius, you agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree to these terms, please do not use our platform.' },
            { title: '2. Use of Service', content: 'JambGenius provides JAMB UTME exam preparation tools and resources. You may use our platform for personal, non-commercial educational purposes only. You must not misuse, copy, distribute, or reverse-engineer our content or platform.' },
            { title: '3. Payment and Refunds', content: 'Mock Exam Mode costs ₦1,000 per session. Payment is processed securely via Paystack. Refunds are available within 24 hours of purchase if the exam has not been started. Once an exam session is initiated, no refunds will be issued.' },
            { title: '4. Account Responsibility', content: 'You are responsible for maintaining the confidentiality of your account credentials. You agree to notify us immediately of any unauthorized access to your account. You are responsible for all activities that occur under your account.' },
            { title: '5. Intellectual Property', content: 'All content on JambGenius, including questions, explanations, graphics, and platform design, is the intellectual property of JambGenius or its licensors. You may not reproduce, distribute, or create derivative works without our explicit permission.' },
            { title: '6. Limitation of Liability', content: 'JambGenius is a supplementary study tool and does not guarantee exam success. Our platform is provided "as is" without warranty of any kind. We are not liable for any damages arising from your use of our platform.' },
            { title: '7. Changes to Terms', content: 'We reserve the right to modify these terms at any time. We will notify users of significant changes via email or platform notification. Continued use of JambGenius after changes constitutes acceptance of the new terms.' },
          ].map((s, i) => (
            <div key={i}>
              <h2 className="text-xl font-bold text-gray-900 mb-3">{s.title}</h2>
              <p className="text-gray-600 leading-relaxed">{s.content}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
