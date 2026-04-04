import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function ExamRulesModal({ onAccept }) {
  const navigate = useNavigate()
  const [agreed, setAgreed] = useState(false)

  const handleDecline = () => {
    if (window.confirm('Are you sure you want to exit? You will be returned to the subject selection page.')) {
      navigate('/exam')
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-br from-blue-600 to-purple-700 rounded-t-2xl px-8 py-7 text-center">
          <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-shield-alt text-4xl text-white"></i>
          </div>
          <h2 className="text-3xl font-bold text-white mb-1">Exam Rules &amp; Regulations</h2>
          <p className="text-blue-100">Read all instructions carefully before starting</p>
        </div>

        <div className="px-8 py-6 space-y-5">
          {/* Anti-cheat notice */}
          <div className="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-5 flex items-start gap-4">
            <i className="fas fa-exclamation-circle text-2xl text-yellow-600 mt-0.5 flex-shrink-0"></i>
            <div>
              <h3 className="font-bold text-gray-900 text-base mb-1">⚠️ Anti-Malpractice System Active</h3>
              <p className="text-gray-700 text-sm">
                This exam is monitored by an advanced anti-cheating system. All suspicious activity is
                automatically detected, recorded, and time-stamped. Any violation will result in a warning,
                and <strong>3 warnings</strong> will cause your exam to be auto-submitted immediately.
              </p>
            </div>
          </div>

          {/* Instructions */}
          <div className="border-l-4 border-blue-500 pl-5 py-1">
            <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
              <i className="fas fa-info-circle text-blue-600"></i>
              Exam Instructions
            </h4>
            <ul className="list-disc list-inside space-y-1.5 text-gray-700 text-sm">
              <li>This exam contains <strong>180 questions</strong> across 4 subjects (60 English + 40 each for others).</li>
              <li>You have exactly <strong>2 hours (120 minutes)</strong> to complete the exam.</li>
              <li>Each correct answer scores <strong>1 mark</strong>. Total marks: 400.</li>
              <li>Your exam will be <strong>auto-submitted</strong> when the timer reaches zero.</li>
              <li>Results and performance analytics are displayed immediately after submission.</li>
              <li>Ensure you have a <strong>stable internet connection</strong> before starting.</li>
              <li>Work in a <strong>quiet, distraction-free environment</strong>.</li>
            </ul>
          </div>

          {/* Prohibited actions */}
          <div className="border-l-4 border-red-500 pl-5 py-1">
            <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
              <i className="fas fa-ban text-red-600"></i>
              Strictly Prohibited Actions
            </h4>
            <ul className="list-disc list-inside space-y-1.5 text-gray-700 text-sm">
              <li>Switching to other browser tabs or applications</li>
              <li>Minimising or leaving the exam window</li>
              <li>Taking screenshots or screen recordings</li>
              <li>Opening browser developer tools (F12 / Ctrl+Shift+I)</li>
              <li>Right-clicking anywhere on the exam page</li>
              <li>Using the print function (Ctrl+P)</li>
              <li>Copying or sharing exam questions</li>
              <li>Using AI tools, search engines, or external materials</li>
            </ul>
          </div>

          {/* Warning system */}
          <div className="border-l-4 border-orange-500 pl-5 py-1">
            <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
              <i className="fas fa-exclamation-triangle text-orange-600"></i>
              Warning System
            </h4>
            <ul className="list-disc list-inside space-y-1.5 text-gray-700 text-sm">
              <li>Each detected violation triggers an on-screen warning.</li>
              <li>You are allowed a <strong>maximum of 3 warnings</strong>.</li>
              <li>On the 3rd warning, your exam is <strong>automatically submitted</strong> with your current answers.</li>
              <li>All violations are logged with timestamps and may be reviewed.</li>
            </ul>
          </div>

          {/* Allowed */}
          <div className="border-l-4 border-green-500 pl-5 py-1">
            <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
              <i className="fas fa-check-circle text-green-600"></i>
              Allowed During the Exam
            </h4>
            <ul className="list-disc list-inside space-y-1.5 text-gray-700 text-sm">
              <li>Navigating between questions using Previous / Next buttons</li>
              <li>Using the question navigator panel</li>
              <li>Submitting your exam manually at any time</li>
              <li>Using the built-in calculator (for Maths, Physics, Chemistry)</li>
            </ul>
          </div>

          {/* Agreement checkbox */}
          <div className="bg-gray-50 border-2 border-gray-200 rounded-xl p-5">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={agreed}
                onChange={e => setAgreed(e.target.checked)}
                className="mt-1 w-5 h-5 text-blue-600 rounded flex-shrink-0"
              />
              <span className="text-gray-700 text-sm font-medium">
                I have read and understood all the exam rules and regulations. I agree to abide by them
                strictly and accept that any violation will be recorded and may result in automatic submission
                of my exam.
              </span>
            </label>
          </div>

          {/* Action buttons */}
          <div className="flex gap-4 pt-2 pb-2">
            <button
              onClick={handleDecline}
              className="flex-1 bg-gray-200 text-gray-700 py-4 rounded-xl hover:bg-gray-300 transition-colors font-bold text-base"
            >
              <i className="fas fa-times mr-2"></i>Decline &amp; Exit
            </button>
            <button
              onClick={() => agreed && onAccept()}
              disabled={!agreed}
              className={`flex-1 py-4 rounded-xl font-bold text-base transition-all ${
                agreed
                  ? 'bg-gradient-to-r from-green-600 to-blue-600 text-white hover:from-green-700 hover:to-blue-700 shadow-md'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              <i className="fas fa-check mr-2"></i>Accept &amp; Start Exam
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
