import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import AdminRoute from './components/AdminRoute'
import Home from './pages/Home'
import Practice from './pages/Practice'
import PracticeExam from './pages/PracticeExam'
import Exam from './pages/Exam'
import ExamPayment from './pages/ExamPayment'
import ExamRoom from './pages/ExamRoom'
import Community from './pages/Community'
import More from './pages/More'
import AITutor from './pages/AITutor'
import Analytics from './pages/Analytics'
import Profile from './pages/Profile'
import DailyChallenge from './pages/DailyChallenge'
import StudyTips from './pages/StudyTips'
import Syllabus from './pages/Syllabus'
import Notifications from './pages/Notifications'
import HelpCenter from './pages/HelpCenter'
import ContactUs from './pages/ContactUs'
import Privacy from './pages/Privacy'
import Terms from './pages/Terms'
import SampleQuestions from './pages/SampleQuestions'
import AdminDashboard from './pages/AdminDashboard'
import AdminNotifications from './pages/AdminNotifications'
import AdminUsers from './pages/AdminUsers'
import AdminContent from './pages/AdminContent'
import AdminAnalytics from './pages/AdminAnalytics'
import AdminPayments from './pages/AdminPayments'
import AdminSupport from './pages/AdminSupport'
import AdminConfig from './pages/AdminConfig'

const protect = (component) => <ProtectedRoute>{component}</ProtectedRoute>
const adminOnly = (component) => <AdminRoute>{component}</AdminRoute>

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="practice" element={protect(<Practice />)} />
            <Route path="practice/exam" element={protect(<PracticeExam />)} />
            <Route path="exam" element={protect(<Exam />)} />
            <Route path="exam/payment" element={protect(<ExamPayment />)} />
            <Route path="exam/room" element={protect(<ExamRoom />)} />
            <Route path="community" element={protect(<Community />)} />
            <Route path="more" element={protect(<More />)} />
            <Route path="ai-tutor" element={protect(<AITutor />)} />
            <Route path="analytics" element={protect(<Analytics />)} />
            <Route path="profile" element={protect(<Profile />)} />
            <Route path="daily-challenge" element={protect(<DailyChallenge />)} />
            <Route path="study-tips" element={protect(<StudyTips />)} />
            <Route path="syllabus" element={protect(<Syllabus />)} />
            <Route path="notifications" element={protect(<Notifications />)} />
            <Route path="sample-questions" element={protect(<SampleQuestions />)} />
            <Route path="help" element={<HelpCenter />} />
            <Route path="contact" element={<ContactUs />} />
            <Route path="privacy" element={<Privacy />} />
            <Route path="terms" element={<Terms />} />
            <Route path="admin" element={adminOnly(<AdminDashboard />)} />
            <Route path="admin/notifications" element={adminOnly(<AdminNotifications />)} />
            <Route path="admin/users" element={adminOnly(<AdminUsers />)} />
            <Route path="admin/content" element={adminOnly(<AdminContent />)} />
            <Route path="admin/analytics" element={adminOnly(<AdminAnalytics />)} />
            <Route path="admin/payments" element={adminOnly(<AdminPayments />)} />
            <Route path="admin/support" element={adminOnly(<AdminSupport />)} />
            <Route path="admin/config" element={adminOnly(<AdminConfig />)} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
