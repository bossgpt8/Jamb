import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { auth } from '../firebase'
import { useAuth } from '../context/AuthContext'

export default function Home() {
  const navigate = useNavigate()
  const { user, setShowSignIn, requireAuth } = useAuth()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    document.title = 'JambGenius - JAMB Exam Preparation'
  }, [])

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const goToPractice = () => {
    if (requireAuth()) navigate('/practice')
  }

  const goToExam = () => {
    if (requireAuth()) navigate('/exam')
  }

  const displayName = user?.displayName || user?.email?.split('@')[0] || ''
  const avatarUrl = user?.photoURL || (user ? `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=2563eb&color=fff` : '')

  return (
    <div className="bg-gray-50 font-sans page-fade-in">
      {/* Navigation Header */}
      <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <div className="flex-shrink-0 flex items-center">
                <i className="fas fa-graduation-cap text-2xl text-blue-600 mr-2"></i>
                <span className="text-xl font-bold text-gray-900">JambGenius</span>
              </div>
              <div className="hidden md:flex items-center space-x-8">
                <a href="#home" className="text-gray-700 hover:text-blue-600 font-medium transition-colors">Home</a>
                <a href="#practice" className="text-gray-700 hover:text-blue-600 font-medium transition-colors">Practice</a>
                <button onClick={() => { if (requireAuth()) navigate('/analytics') }} className="text-gray-700 hover:text-blue-600 font-medium transition-colors">Analytics</button>
                <button onClick={() => { if (requireAuth()) navigate('/daily-challenge') }} className="text-gray-700 hover:text-blue-600 font-medium transition-colors">
                  <i className="fas fa-trophy mr-1"></i>Daily Challenge
                </button>
                <button onClick={() => { if (requireAuth()) navigate('/ai-tutor') }} className="text-purple-600 hover:text-purple-700 font-medium transition-colors">
                  <i className="fas fa-robot mr-1"></i>AI Tutor
                </button>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button onClick={goToExam} className="hidden md:block bg-gradient-to-r from-orange-500 to-red-500 text-white px-6 py-2 rounded-lg hover:from-orange-600 hover:to-red-600 transition-all font-bold shadow-lg hover:shadow-xl transform hover:scale-105">
                <i className="fas fa-trophy mr-2"></i>Take Mock Exam
              </button>

              {user ? (
                <div className="relative" ref={dropdownRef}>
                  <button onClick={() => setDropdownOpen(!dropdownOpen)} className="flex items-center space-x-2 hover:bg-gray-100 rounded-lg px-2 py-1 transition-colors">
                    <img src={avatarUrl} alt="User" className="w-8 h-8 rounded-full" />
                    <span className="text-gray-700 font-medium hidden sm:inline">{displayName}</span>
                  </button>
                  {dropdownOpen && (
                    <div className="absolute right-0 top-12 bg-white rounded-xl shadow-xl border border-gray-200 w-64 z-50">
                      <div className="p-4 border-b border-gray-200">
                        <div className="flex items-center gap-3">
                          <img src={avatarUrl} alt="User" className="w-12 h-12 rounded-full" />
                          <div>
                            <p className="font-semibold text-gray-900">{displayName}</p>
                            <p className="text-sm text-gray-500 truncate">{user.email}</p>
                          </div>
                        </div>
                      </div>
                      <div className="py-2">
                        <button onClick={() => { setDropdownOpen(false); navigate('/profile') }} className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 text-gray-700 w-full">
                          <i className="fas fa-user w-5 text-center"></i><span>My Profile</span>
                        </button>
                        <button onClick={() => { setDropdownOpen(false); navigate('/notifications') }} className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 text-gray-700 w-full">
                          <i className="fas fa-bell w-5 text-center"></i><span>Notifications</span>
                        </button>
                        <button onClick={() => { setDropdownOpen(false); navigate('/analytics') }} className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 text-gray-700 w-full">
                          <i className="fas fa-chart-line w-5 text-center"></i><span>My Analytics</span>
                        </button>
                        <hr className="my-2" />
                        <button onClick={() => signOut(auth)} className="flex items-center gap-3 px-4 py-2 hover:bg-red-50 text-red-600 w-full">
                          <i className="fas fa-sign-out-alt w-5 text-center"></i><span>Sign Out</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <button onClick={() => setShowSignIn(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium">
                  Sign In
                </button>
              )}

              <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden text-gray-700 hover:text-blue-600">
                <i className="fas fa-bars text-2xl"></i>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-200 max-h-[80vh] overflow-y-auto">
            <div className="px-4 py-3 space-y-3">
              <a href="#home" className="block text-gray-700 hover:text-blue-600 font-medium py-2"><i className="fas fa-home mr-2"></i>Home</a>
              <button onClick={() => { setMobileMenuOpen(false); goToPractice() }} className="block w-full text-left text-gray-700 hover:text-blue-600 font-medium py-2"><i className="fas fa-book mr-2"></i>Practice</button>
              <button onClick={() => { setMobileMenuOpen(false); if (requireAuth()) navigate('/analytics') }} className="block w-full text-left text-gray-700 hover:text-blue-600 font-medium py-2"><i className="fas fa-chart-line mr-2"></i>Analytics</button>
              <button onClick={() => { setMobileMenuOpen(false); if (requireAuth()) navigate('/daily-challenge') }} className="block w-full text-left text-orange-600 hover:text-orange-700 font-bold py-2 bg-orange-50 rounded-lg px-3"><i className="fas fa-trophy mr-2"></i>Daily Challenge</button>
              <button onClick={() => { setMobileMenuOpen(false); if (requireAuth()) navigate('/ai-tutor') }} className="block w-full text-left text-purple-600 hover:text-purple-700 font-bold py-2 bg-purple-50 rounded-lg px-3"><i className="fas fa-robot mr-2"></i>AI Tutor</button>
              <button onClick={() => { setMobileMenuOpen(false); if (requireAuth()) navigate('/community') }} className="block w-full text-left text-gray-700 hover:text-blue-600 font-medium py-2"><i className="fas fa-comments mr-2"></i>Community Chat</button>
              <button onClick={() => { setMobileMenuOpen(false); if (requireAuth()) navigate('/more') }} className="block w-full text-left text-gray-700 hover:text-blue-600 font-medium py-2"><i className="fas fa-ellipsis-h mr-2"></i>More</button>
              <button onClick={() => { setMobileMenuOpen(false); goToExam() }} className="block w-full bg-gradient-to-r from-orange-500 to-red-500 text-white px-6 py-3 rounded-lg font-bold text-center"><i className="fas fa-trophy mr-2"></i>Take Mock Exam</button>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section id="home" className="bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 py-8 sm:py-12 lg:py-16 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-12 items-center">
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center bg-blue-100 text-blue-700 px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium mb-3 sm:mb-4">
                <i className="fas fa-star mr-1.5 sm:mr-2 text-yellow-500"></i>Trusted by 10,000+ Students
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-3 sm:mb-4 leading-tight">
                Ace Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">JAMB UTME</span> with Smart Prep
              </h1>
              <p className="text-sm sm:text-base lg:text-lg text-gray-600 mb-5 sm:mb-6 leading-relaxed max-w-lg mx-auto lg:mx-0">
                Practice with real JAMB questions, take timed mock exams, and track your progress with detailed analytics.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 mb-5 sm:mb-8 justify-center lg:justify-start">
                <button onClick={goToPractice} className="w-full sm:w-auto bg-white border-2 border-blue-600 text-blue-600 px-5 sm:px-6 py-2.5 sm:py-3 rounded-xl hover:bg-blue-50 transition-all font-semibold text-sm sm:text-base">
                  <i className="fas fa-book-open mr-2"></i>Start Free Practice
                </button>
                <button onClick={goToExam} className="w-full sm:w-auto bg-gradient-to-r from-orange-500 to-red-500 text-white px-5 sm:px-6 py-2.5 sm:py-3 rounded-xl hover:from-orange-600 hover:to-red-600 transition-all font-bold shadow-lg relative overflow-hidden text-sm sm:text-base">
                  <span className="absolute top-0 right-0 bg-yellow-400 text-black text-xs font-bold px-2 py-1 rounded-bl-lg">₦1,000</span>
                  <i className="fas fa-trophy mr-2"></i>Take Mock Exam
                </button>
              </div>
              <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-4 text-xs sm:text-sm text-gray-500 justify-center lg:justify-start">
                <div className="flex items-center"><i className="fas fa-check-circle text-green-500 mr-1.5 sm:mr-2"></i>Free to get started</div>
                <div className="flex items-center"><i className="fas fa-check-circle text-green-500 mr-1.5 sm:mr-2"></i>All subjects covered</div>
                <div className="flex items-center"><i className="fas fa-check-circle text-green-500 mr-1.5 sm:mr-2"></i>Updated 2025 syllabus</div>
              </div>
            </div>
            <div className="relative hidden lg:block">
              <div className="absolute -top-4 -right-4 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
              <div className="absolute -bottom-8 -left-4 w-72 h-72 bg-indigo-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
              <img src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600" alt="Students studying" className="rounded-2xl shadow-2xl relative z-10" />
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-6 sm:py-8 bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 text-center">
            <div className="p-3 sm:p-0"><div className="text-xl sm:text-2xl lg:text-3xl font-bold text-blue-600">10K+</div><div className="text-xs sm:text-sm text-gray-500">Active Students</div></div>
            <div className="p-3 sm:p-0"><div className="text-xl sm:text-2xl lg:text-3xl font-bold text-green-600">50K+</div><div className="text-xs sm:text-sm text-gray-500">Questions</div></div>
            <div className="p-3 sm:p-0"><div className="text-xl sm:text-2xl lg:text-3xl font-bold text-orange-600">15+</div><div className="text-xs sm:text-sm text-gray-500">Subjects</div></div>
            <div className="p-3 sm:p-0"><div className="text-xl sm:text-2xl lg:text-3xl font-bold text-purple-600">95%</div><div className="text-xs sm:text-sm text-gray-500">Success Rate</div></div>
          </div>
        </div>
      </section>

      {/* Mode Selection */}
      <section id="dashboard" className="py-8 sm:py-12 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-6 sm:mb-8">
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">Choose Your Study Mode</h2>
            <p className="text-sm sm:text-base text-gray-600">Practice freely or take a full mock exam</p>
          </div>
          <div className="grid md:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl sm:rounded-2xl p-5 sm:p-6 lg:p-8 border border-green-100 hover:shadow-lg transition-shadow">
              <div className="flex items-center mb-4 sm:mb-6">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-500 rounded-lg sm:rounded-xl flex items-center justify-center mr-3 sm:mr-4">
                  <i className="fas fa-book-open text-white text-lg sm:text-xl"></i>
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">Practice Mode</h3>
                  <span className="bg-green-100 text-green-800 text-xs sm:text-sm font-medium px-2 sm:px-3 py-0.5 sm:py-1 rounded-full">FREE</span>
                </div>
              </div>
              <ul className="space-y-2 sm:space-y-3 mb-5 sm:mb-8 text-sm sm:text-base">
                <li className="flex items-center text-gray-700"><i className="fas fa-check text-green-500 mr-2 sm:mr-3 text-sm"></i>100 questions per subject</li>
                <li className="flex items-center text-gray-700"><i className="fas fa-check text-green-500 mr-2 sm:mr-3 text-sm"></i>Detailed explanations</li>
                <li className="flex items-center text-gray-700"><i className="fas fa-check text-green-500 mr-2 sm:mr-3 text-sm"></i>Immediate feedback</li>
                <li className="flex items-center text-gray-700"><i className="fas fa-check text-green-500 mr-2 sm:mr-3 text-sm"></i>No time pressure</li>
              </ul>
              <button onClick={goToPractice} className="w-full bg-green-500 text-white py-2.5 sm:py-3 rounded-lg sm:rounded-xl hover:bg-green-600 transition-colors font-semibold text-sm sm:text-base">
                Start Practice
              </button>
            </div>
            <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl sm:rounded-2xl p-5 sm:p-6 lg:p-8 border-2 border-orange-200 hover:shadow-2xl transition-all sm:transform sm:hover:scale-105 relative">
              <div className="absolute -top-2 -right-2 sm:-top-3 sm:-right-3 bg-yellow-400 text-black text-xs sm:text-sm font-bold px-2 sm:px-4 py-1 sm:py-2 rounded-lg shadow-lg transform rotate-12">₦1,000</div>
              <div className="flex items-center mb-4 sm:mb-6">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg sm:rounded-xl flex items-center justify-center mr-3 sm:mr-4">
                  <i className="fas fa-trophy text-white text-lg sm:text-xl"></i>
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">Mock Exam Mode</h3>
                  <span className="bg-orange-100 text-orange-800 text-xs sm:text-sm font-medium px-2 sm:px-3 py-0.5 sm:py-1 rounded-full">PREMIUM</span>
                </div>
              </div>
              <ul className="space-y-2 sm:space-y-3 mb-5 sm:mb-8 text-sm sm:text-base">
                <li className="flex items-center text-gray-700"><i className="fas fa-check text-orange-500 mr-2 sm:mr-3 text-sm"></i>Full JAMB simulation (180 questions)</li>
                <li className="flex items-center text-gray-700"><i className="fas fa-check text-orange-500 mr-2 sm:mr-3 text-sm"></i>2-hour timed exam</li>
                <li className="flex items-center text-gray-700"><i className="fas fa-check text-orange-500 mr-2 sm:mr-3 text-sm"></i>Real CBT interface</li>
                <li className="flex items-center text-gray-700"><i className="fas fa-check text-orange-500 mr-2 sm:mr-3 text-sm"></i>Performance analytics</li>
                <li className="flex items-center text-gray-700"><i className="fas fa-check text-orange-500 mr-2 sm:mr-3 text-sm"></i>Detailed score report</li>
              </ul>
              <button onClick={goToExam} className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white py-2.5 sm:py-3 lg:py-4 rounded-lg sm:rounded-xl hover:from-orange-600 hover:to-red-600 transition-all font-bold shadow-lg text-sm sm:text-base lg:text-lg">
                <i className="fas fa-rocket mr-2"></i>Unlock Mock Exam - ₦1,000
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="practice" className="py-8 sm:py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-2 sm:mb-4">Why Students Love JambGenius</h2>
            <p className="text-sm sm:text-base text-gray-600">Everything you need to ace your JAMB exam</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            {[
              { icon: 'fa-brain', color: 'blue', title: 'Smart Practice', desc: 'Practice with 50,000+ past JAMB questions organized by subject and year' },
              { icon: 'fa-clock', color: 'orange', title: 'Timed Mock Exams', desc: 'Experience the real JAMB format with 180 questions in 2 hours' },
              { icon: 'fa-chart-bar', color: 'green', title: 'Detailed Analytics', desc: 'Track your performance and identify weak areas to improve' },
              { icon: 'fa-robot', color: 'purple', title: 'AI Tutor', desc: 'Get instant help and explanations from our AI-powered tutor' },
              { icon: 'fa-users', color: 'pink', title: 'Community', desc: 'Join thousands of students, share tips, and study together' },
              { icon: 'fa-trophy', color: 'yellow', title: 'Daily Challenges', desc: 'Build your streak with daily practice challenges and earn rewards' },
            ].map((f, i) => (
              <div key={i} className={`bg-${f.color}-50 rounded-xl p-6 text-center hover:shadow-lg transition-shadow`}>
                <div className={`w-12 h-12 bg-${f.color}-100 rounded-xl flex items-center justify-center mx-auto mb-4`}>
                  <i className={`fas ${f.icon} text-${f.color}-600 text-xl`}></i>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-sm text-gray-600">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Exam CTA */}
      <section id="exam" className="py-8 sm:py-12 bg-gradient-to-br from-orange-500 to-red-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-4">Ready to Take the Real Challenge?</h2>
          <p className="text-orange-100 text-sm sm:text-base lg:text-lg mb-6 sm:mb-8">Take a full JAMB Mock Exam — 180 questions, 2 hours, real CBT experience</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button onClick={goToExam} className="bg-white text-orange-600 px-8 py-4 rounded-xl font-bold text-lg hover:bg-yellow-50 transition-all shadow-xl transform hover:scale-105">
              <i className="fas fa-rocket mr-2"></i>Start Mock Exam — ₦1,000
            </button>
            <button onClick={goToPractice} className="border-2 border-white text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-white hover:text-orange-600 transition-all">
              <i className="fas fa-book-open mr-2"></i>Try Free Practice
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center">
              <i className="fas fa-graduation-cap text-xl text-blue-400 mr-2"></i>
              <span className="font-bold text-lg">JambGenius</span>
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-gray-400 justify-center">
              <button onClick={() => navigate('/help')} className="hover:text-white transition-colors">Help Center</button>
              <button onClick={() => navigate('/contact')} className="hover:text-white transition-colors">Contact Us</button>
              <button onClick={() => navigate('/privacy')} className="hover:text-white transition-colors">Privacy Policy</button>
              <button onClick={() => navigate('/terms')} className="hover:text-white transition-colors">Terms of Service</button>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-6 pt-6 text-center text-gray-500 text-xs">
            <p>© 2025 JambGenius. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
