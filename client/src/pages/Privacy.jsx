import { useNavigate } from 'react-router-dom'

export default function Privacy() {
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
        <p className="text-gray-500 mb-8">Last updated: January 2025</p>
        <div className="bg-white rounded-2xl shadow-sm p-8 space-y-6">
          {[
            { title: '1. Information We Collect', content: 'We collect information you provide directly to us, such as your name, email address, and payment information when you create an account or make a purchase. We also automatically collect certain information about your device and how you interact with our platform, including your practice session data, exam results, and usage patterns.' },
            { title: '2. How We Use Your Information', content: 'We use the information we collect to: provide, maintain, and improve our services; process transactions; send you technical notices and support messages; respond to your comments and questions; track your academic progress; and personalize your learning experience.' },
            { title: '3. Data Storage and Security', content: 'Your data is stored securely using Firebase Authentication and MongoDB. We implement industry-standard security measures including encryption in transit and at rest. Payment information is processed by Paystack and we do not store your complete payment details on our servers.' },
            { title: '4. Sharing of Information', content: 'We do not sell or share your personal information with third parties for their marketing purposes. We may share your information with service providers who assist us in operating our platform, such as our cloud hosting providers, analytics tools, and payment processors.' },
            { title: '5. Cookies and Tracking', content: 'We use cookies and similar tracking technologies to track activity on our platform and hold certain information such as your session data and preferences. You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent.' },
            { title: '6. Children\'s Privacy', content: 'Our service is intended for students preparing for JAMB, which typically includes individuals 17 years and older. We do not knowingly collect personal information from children under 13. If we discover that a child has provided personal information, we will promptly delete it.' },
            { title: '7. Changes to This Policy', content: 'We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the "Last updated" date.' },
            { title: '8. Contact Us', content: 'If you have any questions about this Privacy Policy, please contact us at privacy@jambgenius.com or through our Contact Us page.' },
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
