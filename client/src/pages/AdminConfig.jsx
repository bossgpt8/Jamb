import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth } from '../firebase'

const FEATURE_LABELS = {
  communityChat:  'Community Chat',
  aiTutor:        'AI Tutor',
  dailyChallenge: 'Daily Challenge',
  examPayment:    'Exam Payment',
}

export default function AdminConfig() {
  const navigate = useNavigate()
  const [config, setConfig] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [actionMsg, setActionMsg] = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const idToken = await auth.currentUser.getIdToken()
      const res = await fetch('/api/admin/config', { headers: { 'x-id-token': idToken } })
      const data = await res.json()
      if (data.success) setConfig(data.config)
    } catch (err) { console.error(err) }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const toast = (msg, ok = true) => {
    setActionMsg({ msg, ok })
    setTimeout(() => setActionMsg(null), 3000)
  }

  const save = async () => {
    setSaving(true)
    try {
      const idToken = await auth.currentUser.getIdToken()
      const res = await fetch('/api/admin/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken, ...config })
      })
      const data = await res.json()
      if (data.success) { setConfig(data.config); toast('Config saved') }
      else toast(data.error || 'Error', false)
    } catch (err) { toast(err.message, false) }
    setSaving(false)
  }

  const setFlag = (key, value) => setConfig(c => ({ ...c, featureFlags: { ...c.featureFlags, [key]: value } }))
  const setTier = (tier, key, value) => setConfig(c => ({
    ...c,
    perTierFeatures: {
      ...c.perTierFeatures,
      [tier]: { ...(c.perTierFeatures?.[tier] || {}), [key]: value }
    }
  }))

  return (
    <div className="bg-gray-50 min-h-screen font-sans">
      <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('/admin')} className="text-gray-500 hover:text-blue-600 text-sm flex items-center gap-1">
              <i className="fas fa-arrow-left"></i> Dashboard
            </button>
            <span className="text-gray-300">/</span>
            <span className="text-gray-900 font-semibold text-sm">App Config</span>
          </div>
          <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-semibold">ADMIN</span>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">App Configuration</h1>
            <p className="text-sm text-gray-500">Control app behaviour and feature availability.</p>
          </div>
          <button onClick={save} disabled={saving || loading} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
            {saving && <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent"></div>}
            Save Changes
          </button>
        </div>

        {actionMsg && (
          <div className={`mb-4 px-4 py-2 rounded-lg text-sm font-medium ${actionMsg.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {actionMsg.msg}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-600 border-t-transparent"></div>
          </div>
        ) : !config ? (
          <div className="text-center text-gray-400 py-16">Failed to load config.</div>
        ) : (
          <div className="space-y-5">
            {/* Maintenance Mode */}
            <div className="bg-white rounded-2xl shadow-sm p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-gray-900 flex items-center gap-2">
                    <i className="fas fa-tools text-orange-500"></i> Maintenance Mode
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">When enabled, the app displays a maintenance notice to all users.</p>
                </div>
                <button
                  onClick={() => setConfig(c => ({ ...c, maintenanceMode: !c.maintenanceMode }))}
                  className={`relative w-12 h-6 rounded-full transition-colors ${config.maintenanceMode ? 'bg-orange-500' : 'bg-gray-200'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${config.maintenanceMode ? 'translate-x-6' : ''}`}></span>
                </button>
              </div>
            </div>

            {/* Feature Flags */}
            <div className="bg-white rounded-2xl shadow-sm p-5">
              <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <i className="fas fa-toggle-on text-blue-500"></i> Feature Flags
              </h2>
              <div className="space-y-3">
                {Object.entries(FEATURE_LABELS).map(([key, label]) => {
                  const enabled = config.featureFlags?.[key] !== false
                  return (
                    <div key={key} className="flex items-center justify-between py-1">
                      <span className="text-sm text-gray-700">{label}</span>
                      <button
                        onClick={() => setFlag(key, !enabled)}
                        className={`relative w-10 h-5 rounded-full transition-colors ${enabled ? 'bg-blue-500' : 'bg-gray-200'}`}
                      >
                        <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${enabled ? 'translate-x-5' : ''}`}></span>
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Per-Tier Features */}
            <div className="bg-white rounded-2xl shadow-sm p-5">
              <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <i className="fas fa-layer-group text-purple-500"></i> Per-Tier Limits
              </h2>
              {['free', 'premium'].map(tier => (
                <div key={tier} className="mb-4 last:mb-0">
                  <h3 className="text-sm font-semibold text-gray-600 capitalize mb-2">{tier} tier</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Default Exam Credits</label>
                      <input
                        type="number"
                        min="0"
                        value={config.perTierFeatures?.[tier]?.examCredits ?? ''}
                        onChange={e => setTier(tier, 'examCredits', Number(e.target.value))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">AI Messages (-1 = unlimited)</label>
                      <input
                        type="number"
                        min="-1"
                        value={config.perTierFeatures?.[tier]?.aiMessages ?? ''}
                        onChange={e => setTier(tier, 'aiMessages', Number(e.target.value))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
