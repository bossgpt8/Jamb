import { useState } from 'react'
import {
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth'
import { auth } from '../firebase'
import { useAuth } from '../context/AuthContext'

export default function SignInModal() {
  const { showSignIn, setShowSignIn, showToast } = useAuth()
  const [tab, setTab] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)

  if (!showSignIn) return null

  const close = () => {
    setShowSignIn(false)
    setEmail('')
    setPassword('')
    setName('')
    setTab('signin')
  }

  const handleGoogle = async () => {
    setLoading(true)
    try {
      const provider = new GoogleAuthProvider()
      await signInWithPopup(auth, provider)
      showToast('Welcome back!', 'success')
      close()
    } catch (err) {
      showToast(err.message || 'Google sign-in failed', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleEmailAuth = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (tab === 'signin') {
        await signInWithEmailAndPassword(auth, email, password)
        showToast('Welcome back!', 'success')
      } else {
        if (!name.trim()) { showToast('Please enter your name', 'warning'); setLoading(false); return }
        const cred = await createUserWithEmailAndPassword(auth, email, password)
        await updateProfile(cred.user, { displayName: name.trim() })
        showToast('Account created! Welcome to JambGenius', 'success')
      }
      close()
    } catch (err) {
      const msg = err.code === 'auth/invalid-credential' ? 'Invalid email or password'
        : err.code === 'auth/email-already-in-use' ? 'Email already in use'
        : err.code === 'auth/weak-password' ? 'Password must be at least 6 characters'
        : err.message
      showToast(msg, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={close} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-scale-in">
        <button onClick={close} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
          <i className="fas fa-times text-xl"></i>
        </button>

        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <i className="fas fa-graduation-cap text-blue-600 text-2xl"></i>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">JambGenius</h2>
          <p className="text-gray-500 text-sm mt-1">Sign in to continue your JAMB prep</p>
        </div>

        <div className="flex bg-gray-100 rounded-xl p-1 mb-5">
          <button onClick={() => setTab('signin')} className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${tab === 'signin' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}>Sign In</button>
          <button onClick={() => setTab('signup')} className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${tab === 'signup' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}>Create Account</button>
        </div>

        <button onClick={handleGoogle} disabled={loading} className="w-full flex items-center justify-center gap-3 border border-gray-300 rounded-xl py-3 px-4 hover:bg-gray-50 transition-colors font-medium text-gray-700 mb-4 disabled:opacity-50">
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
          Continue with Google
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs text-gray-400">or</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        <form onSubmit={handleEmailAuth} className="space-y-3">
          {tab === 'signup' && (
            <input
              type="text"
              placeholder="Full Name"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          )}
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50">
            {loading ? <i className="fas fa-spinner fa-spin"></i> : tab === 'signin' ? 'Sign In' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  )
}
